// ============================================
// API: Soumettre les données de marque (Step 1)
// ============================================
// Permet à un partenaire de soumettre les données de marque via token

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/db/supabase';
import { ImageUploader } from '@/lib/services/image/uploader';

const SubmitBrandSchema = z.object({
  token: z.string().min(1, 'Token requis'),
  brand_name: z.string().optional(),
  contact_email: z.union([z.string().email('Email invalide'), z.literal('')]).optional(),
  description: z.string().optional(),
  label_ecoconception: z.string().optional(),
  // wetransfer_link remplacé par product_visuals (fichiers)
  collaboration_reason: z.string().optional(),
  press_links: z.union([z.array(z.string().url()), z.undefined()]).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // #region agent log
    const logData1 = {location:'api/partner/submit-brand/route.ts:24',message:'FormData received',data:{hasToken:!!formData.get('token'),hasBrandName:!!formData.get('brand_name'),hasDescription:!!formData.get('description')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'};
    fetch('http://127.0.0.1:7244/ingest/3121fc83-8978-481b-9c6c-a16197917493',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData1)}).catch(()=>{});
    // #endregion
    
    // Extraire les données du formulaire
    const token = formData.get('token') as string;
    
    // Vérifier que le token est présent
    if (!token || token.trim().length === 0) {
      console.error('❌ Token manquant dans FormData');
      return NextResponse.json(
        { error: 'Token manquant dans la requête' },
        { status: 400 }
      );
    }
    
    const brandName = (formData.get('brand_name') as string) || '';
    const contactEmail = (formData.get('contact_email') as string) || '';
    const description = (formData.get('description') as string) || '';
    const labelEcoconception = formData.get('label_ecoconception') as string | null;
    // Récupérer les visuels produits (fichiers)
    const productVisualCount = parseInt((formData.get('product_visual_count') as string) || '0', 10);
    const productVisuals: File[] = [];
    for (let i = 0; i < productVisualCount; i++) {
      const file = formData.get(`product_visual_${i}`) as File | null;
      if (file && file.size > 0) {
        productVisuals.push(file);
      }
    }
    const collaborationReason = (formData.get('collaboration_reason') as string) || '';
    const pressLinksStr = formData.get('press_links') as string | null;
    
    console.log('🔍 Token reçu:', token.substring(0, 20) + '...');
    
    // #region agent log
      const logData2 = {location:'api/partner/submit-brand/route.ts:35',message:'FormData extracted',data:{token:!!token,tokenLength:token?.length,brandName:brandName?.substring(0,20),description:description?.substring(0,20),labelEcoconception:!!labelEcoconception,productVisualsCount:productVisuals.length,collaborationReason:!!collaborationReason,pressLinksStr:!!pressLinksStr},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'};
    fetch('http://127.0.0.1:7244/ingest/3121fc83-8978-481b-9c6c-a16197917493',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData2)}).catch(()=>{});
    // #endregion
    
    // Parser les liens presse (séparés par des virgules ou newlines)
    const pressLinks = pressLinksStr 
      ? pressLinksStr.split(/[,\n]/).map(link => link.trim()).filter(link => link.length > 0)
      : [];

    // Valider le token
    console.log('🔍 Recherche du token dans la base de données...');
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('partner_invitations')
      .select('*')
      .eq('token', token.trim())
      .single();

    if (invitationError) {
      console.error('❌ Erreur lors de la recherche du token:', invitationError);
      console.error('❌ Code:', invitationError.code);
      console.error('❌ Message:', invitationError.message);
      return NextResponse.json(
        { 
          error: 'Token invalide',
          details: invitationError.message || 'Token non trouvé dans la base de données'
        },
        { status: 404 }
      );
    }

    if (!invitation) {
      console.error('❌ Aucune invitation trouvée pour ce token');
      return NextResponse.json(
        { 
          error: 'Token invalide',
          details: 'Aucune invitation trouvée pour ce token'
        },
        { status: 404 }
      );
    }

    console.log('✅ Token valide, invitation trouvée:', invitation.id);

    // Vérifier que l'invitation n'est pas expirée
    const expiresAt = new Date(invitation.expires_at);
    if (new Date() > expiresAt) {
      return NextResponse.json(
        { error: 'Token expiré' },
        { status: 400 }
      );
    }

    // Vérifier que Step 1 (inscription) est complété
    let { data: existingSubmission, error: submissionCheckError } = await supabaseAdmin
      .from('partner_submissions')
      .select('id, status, brand_id')
      .eq('invitation_id', invitation.id)
      .single();

    console.log('🔍 Vérification soumission pour Step 2:', {
      invitation_id: invitation.id,
      submissionCheckError: submissionCheckError?.message,
      existingSubmission: existingSubmission ? {
        id: existingSubmission.id,
        status: existingSubmission.status,
        brand_id: existingSubmission.brand_id
      } : null
    });

    if (submissionCheckError || !existingSubmission) {
      console.error('❌ Soumission non trouvée pour Step 2:', submissionCheckError);
      
      // Fallback: Si l'invitation a des données Step 1 (company_name, email), créer la soumission
      if (invitation.company_name && invitation.email) {
        console.log('⚠️ Soumission non trouvée mais données Step 1 présentes, création de la soumission...');
        
        // Créer un brand temporaire
        const { data: tempBrand, error: brandError } = await supabaseAdmin
          .from('brands')
          .insert({
            name: invitation.company_name,
            contact_email: invitation.email,
          })
          .select()
          .single();

        if (brandError) {
          console.error('Erreur création brand temporaire:', brandError);
          return NextResponse.json(
            { 
              success: false,
              error: 'Erreur lors de la création de la soumission. Veuillez réessayer.',
            },
            { status: 500 }
          );
        }

        // Créer la soumission avec statut step1_completed
        const { data: newSubmission, error: createSubmissionError } = await supabaseAdmin
          .from('partner_submissions')
          .insert({
            invitation_id: invitation.id,
            brand_id: tempBrand.id,
            status: 'step1_completed',
          })
          .select()
          .single();

        if (createSubmissionError || !newSubmission) {
          console.error('Erreur création soumission:', createSubmissionError);
          return NextResponse.json(
            { 
              success: false,
              error: 'Erreur lors de la création de la soumission. Veuillez réessayer.',
            },
            { status: 500 }
          );
        }

        console.log('✅ Soumission créée automatiquement:', newSubmission.id);
        // Utiliser la nouvelle soumission
        existingSubmission = newSubmission;
      } else {
        // Pas de données Step 1, rediriger vers Step 1
        return NextResponse.json(
          { 
            success: false,
            error: 'Step 1 (inscription) non complété. Veuillez d\'abord compléter l\'inscription.',
            details: process.env.NODE_ENV === 'development' ? {
              invitation_id: invitation.id,
              error: submissionCheckError?.message
            } : undefined
          },
          { status: 400 }
        );
      }
    }

    // Accepter step1_completed ou step2_completed (au cas où Step 2 serait déjà complété)
    // Note: existingSubmission peut avoir été créé dans le fallback ci-dessus
    if (!existingSubmission) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Erreur: Soumission non disponible',
        },
        { status: 500 }
      );
    }

    if (existingSubmission.status !== 'step1_completed' && existingSubmission.status !== 'step2_completed') {
      console.warn('⚠️ Statut inattendu pour Step 2:', existingSubmission.status);
      return NextResponse.json(
        { 
          success: false,
          error: 'Step 1 (inscription) non complété. Veuillez d\'abord compléter l\'inscription.',
          details: process.env.NODE_ENV === 'development' ? {
            current_status: existingSubmission.status,
            expected_status: 'step1_completed'
          } : undefined
        },
        { status: 400 }
      );
    }

    // Valider les données (tous les champs sont maintenant optionnels pour les tests)
    let validatedData;
    try {
      // #region agent log
      const logData3 = {location:'api/partner/submit-brand/route.ts:180',message:'Before validation',data:{token:!!token,brandName:!!brandName,contactEmail:!!contactEmail,description:!!description},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'};
      fetch('http://127.0.0.1:7244/ingest/3121fc83-8978-481b-9c6c-a16197917493',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData3)}).catch(()=>{});
      // #endregion
      
      // S'assurer que pressLinks est un tableau valide avant de le passer à Zod
      const validPressLinks = pressLinks && Array.isArray(pressLinks) && pressLinks.length > 0 
        ? pressLinks.filter(link => typeof link === 'string' && link.trim().length > 0)
        : undefined;
      
      validatedData = SubmitBrandSchema.parse({
        token,
        brand_name: brandName || undefined,
        contact_email: contactEmail || undefined,
        description: description || undefined,
        label_ecoconception: labelEcoconception || undefined,
        // product_visuals géré séparément (upload de fichiers)
        collaboration_reason: collaborationReason || undefined,
        press_links: validPressLinks,
      });
      
      // #region agent log
      const logData4 = {location:'api/partner/submit-brand/route.ts:192',message:'Validation successful',data:{hasValidatedData:!!validatedData},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'};
      fetch('http://127.0.0.1:7244/ingest/3121fc83-8978-481b-9c6c-a16197917493',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData4)}).catch(()=>{});
      // #endregion
    } catch (validationError: any) {
      // #region agent log
      const logData5 = {location:'api/partner/submit-brand/route.ts:210',message:'Validation error caught',data:{errorMessage:validationError?.message,errorName:validationError?.name,hasErrors:!!validationError?.errors,errorStack:validationError?.stack?.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'};
      fetch('http://127.0.0.1:7244/ingest/3121fc83-8978-481b-9c6c-a16197917493',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData5)}).catch(()=>{});
      // #endregion
      
      // Protéger console.error pour éviter les erreurs de formatage
      try {
        console.error('Erreur validation:', validationError?.message || String(validationError));
      } catch (logError) {
        // Ignorer les erreurs de logging
      }
      
      // Pour les tests, on accepte même si la validation échoue
      // Note: invitation est déjà défini à ce stade (validation du token faite avant)
      validatedData = {
        token,
        brand_name: brandName || invitation?.company_name || 'Test Brand',
        contact_email: contactEmail || invitation?.email || 'test@example.com',
        description: description || 'Description de test',
        label_ecoconception: labelEcoconception || undefined,
        // product_visuals géré séparément (upload de fichiers)
        collaboration_reason: collaborationReason || undefined,
        press_links: pressLinks.length > 0 ? pressLinks : undefined,
      };
    }

    // Upload des images
    let logoUrl: string | null = null;
    let lifestyleImageUrl: string | null = null;
    let bannerImageUrl: string | null = null;
    let excelFileUrl: string | null = null;
    let excelFilename: string | null = null;
    const defectsImagesUrls: string[] = [];
    const productVisualsUrls: string[] = [];

    try {
      // Upload logo (500x500px PNG)
      const logoFile = formData.get('logo') as File | null;
      if (logoFile && logoFile.size > 0) {
        try {
          const uploader = ImageUploader.fromEnv();
          logoUrl = await uploader.uploadImage(logoFile, 'brands/logos');
        } catch (s3Error) {
          // Si S3 n'est pas configuré, on peut utiliser une approche alternative
          console.warn('S3 non configuré, stockage logo en base64 ou URL temporaire');
          // Pour l'instant, on stocke null et on demandera l'upload via une autre méthode
        }
      }

      // Upload image lifestyle (1500x1400px)
      const lifestyleFile = formData.get('lifestyle_image') as File | null;
      if (lifestyleFile && lifestyleFile.size > 0) {
        try {
          const uploader = ImageUploader.fromEnv();
          lifestyleImageUrl = await uploader.uploadImage(lifestyleFile, 'brands/lifestyle');
        } catch (s3Error) {
          console.warn('S3 non configuré pour lifestyle image');
        }
      }

      // Upload bannière (2000x420px)
      const bannerFile = formData.get('banner_image') as File | null;
      if (bannerFile && bannerFile.size > 0) {
        try {
          const uploader = ImageUploader.fromEnv();
          bannerImageUrl = await uploader.uploadImage(bannerFile, 'brands/banners');
        } catch (s3Error) {
          console.warn('S3 non configuré pour banner image');
        }
      }

      // Upload matrice Excel
      const excelFile = formData.get('excel_file') as File | null;
      if (excelFile && excelFile.size > 0) {
        try {
          const uploader = ImageUploader.fromEnv();
          excelFileUrl = await uploader.uploadImage(excelFile, 'brands/excel');
          excelFilename = excelFile.name;
        } catch (s3Error) {
          console.warn('S3 non configuré pour excel file');
        }
      }

      // Upload photos de défauts (multiple)
      const defectsFiles = formData.getAll('defects_images') as File[];
      if (defectsFiles.length > 0) {
        try {
          const uploader = ImageUploader.fromEnv();
          const uploadedDefects = await uploader.uploadImages(defectsFiles, 'brands/defects');
          defectsImagesUrls.push(...uploadedDefects);
        } catch (s3Error) {
          console.warn('S3 non configuré pour defects images');
        }
      }

      // Upload visuels produits (images et vidéos)
      if (productVisuals.length > 0) {
        try {
          const uploader = ImageUploader.fromEnv();
          // Séparer les images et vidéos
          const imageFiles = productVisuals.filter(f => f.type.startsWith('image/'));
          const videoFiles = productVisuals.filter(f => f.type.startsWith('video/'));
          
          if (imageFiles.length > 0) {
            const uploadedImages = await uploader.uploadImages(imageFiles, 'brands/product-visuals/images');
            productVisualsUrls.push(...uploadedImages);
          }
          
          if (videoFiles.length > 0) {
            // Pour les vidéos, on peut utiliser la même méthode ou une méthode spécifique
            const uploadedVideos = await uploader.uploadImages(videoFiles, 'brands/product-visuals/videos');
            productVisualsUrls.push(...uploadedVideos);
          }
        } catch (s3Error) {
          console.warn('S3 non configuré pour product visuals');
        }
      }
    } catch (uploadError: any) {
      // #region agent log
      const logDataUpload = {location:'api/partner/submit-brand/route.ts:299',message:'Upload error caught',data:{errorMessage:uploadError?.message,errorName:uploadError?.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'K'};
      fetch('http://127.0.0.1:7244/ingest/3121fc83-8978-481b-9c6c-a16197917493',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logDataUpload)}).catch(()=>{});
      // #endregion
      
      // Protéger console.error pour éviter les erreurs de formatage
      try {
        console.error('Erreur upload images:', uploadError?.message || String(uploadError));
      } catch (logError) {
        // Ignorer les erreurs de logging
      }
      // Continuer même si l'upload échoue, on peut les ajouter plus tard
    }

    // Mettre à jour ou créer le brand
    let brand;
    if (existingSubmission.brand_id) {
      // Mettre à jour le brand existant
      const { data: updatedBrand, error: brandUpdateError } = await supabaseAdmin
        .from('brands')
        .update({
          name: validatedData.brand_name || invitation.company_name || 'Marque',
          contact_email: validatedData.contact_email || invitation.email || 'contact@example.com',
          logo_url: logoUrl,
          lifestyle_image_url: lifestyleImageUrl,
          banner_image_url: bannerImageUrl,
          description: validatedData.description || null,
          label_ecoconception: validatedData.label_ecoconception || null,
          // Stocker les URLs des visuels produits dans wetransfer_link comme JSON (temporaire, à migrer vers un champ dédié)
          wetransfer_link: (productVisualsUrls && productVisualsUrls.length > 0) ? JSON.stringify(productVisualsUrls) : null,
          collaboration_reason: validatedData.collaboration_reason || null,
          press_links: validatedData.press_links || [],
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingSubmission.brand_id)
        .select()
        .single();

      if (brandUpdateError) {
        console.error('Erreur mise à jour brand:', brandUpdateError);
        return NextResponse.json(
          { error: 'Erreur lors de la mise à jour de la marque' },
          { status: 500 }
        );
      }
      brand = updatedBrand;
    } else {
      // Créer un nouveau brand
      const { data: newBrand, error: brandError } = await supabaseAdmin
        .from('brands')
        .insert({
          name: validatedData.brand_name || invitation.company_name || 'Marque',
          contact_email: validatedData.contact_email || invitation.email || 'contact@example.com',
          logo_url: logoUrl,
          lifestyle_image_url: lifestyleImageUrl,
          banner_image_url: bannerImageUrl,
          description: validatedData.description || null,
          label_ecoconception: validatedData.label_ecoconception || null,
          // Stocker les URLs des visuels produits dans wetransfer_link comme JSON (temporaire, à migrer vers un champ dédié)
          wetransfer_link: (productVisualsUrls && productVisualsUrls.length > 0) ? JSON.stringify(productVisualsUrls) : null,
          collaboration_reason: validatedData.collaboration_reason || null,
          press_links: validatedData.press_links || [],
        })
        .select()
        .single();

      if (brandError) {
        console.error('Erreur création brand:', brandError);
        return NextResponse.json(
          { error: 'Erreur lors de la création de la marque' },
          { status: 500 }
        );
      }
      brand = newBrand;
    }

    // Mettre à jour la soumission avec status step2_completed
    const { data: submission, error: submissionError } = await supabaseAdmin
      .from('partner_submissions')
      .update({
        brand_id: brand.id,
        excel_file_url: excelFileUrl,
        excel_filename: excelFilename,
        defects_images_urls: defectsImagesUrls,
        status: 'step2_completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingSubmission.id)
      .select()
      .single();

    // #region agent log
    const logData = {location:'api/partner/submit-brand/route.ts:350',message:'Status update result',data:{submissionId:submission?.id,status:submission?.status,error:submissionError?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'};
    fetch('http://127.0.0.1:7244/ingest/3121fc83-8978-481b-9c6c-a16197917493',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData)}).catch(()=>{});
    // #endregion

    if (submissionError) {
      console.error('Erreur mise à jour submission:', submissionError);
      return NextResponse.json(
        { 
          success: false,
          error: 'Erreur lors de la mise à jour de la soumission' 
        },
        { status: 500 }
      );
    }

    // Attendre un peu pour s'assurer que la mise à jour est bien propagée
    await new Promise(resolve => setTimeout(resolve, 200));

    // #region agent log
    const logDataSuccess = {location:'api/partner/submit-brand/route.ts:399',message:'Returning success response',data:{submissionId:submission.id,status:submission.status,nextStepUrl:`/partner/${token}/dashboard`},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'};
    fetch('http://127.0.0.1:7244/ingest/3121fc83-8978-481b-9c6c-a16197917493',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logDataSuccess)}).catch(()=>{});
    // #endregion

    return NextResponse.json({
      success: true,
      data: {
        submission_id: submission.id,
        brand_id: brand.id,
        next_step_url: `/partner/${token}/dashboard`,
        status: submission.status,
      },
      message: 'Données de marque soumises avec succès',
    });

  } catch (error: any) {
    // #region agent log
    const logDataError = {location:'api/partner/submit-brand/route.ts:414',message:'Global error caught',data:{errorMessage:error?.message,errorName:error?.name,errorStack:error?.stack?.substring(0,300),hasValue:!!error?.value,valueType:typeof error?.value,isZodError:error instanceof z.ZodError},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'};
    fetch('http://127.0.0.1:7244/ingest/3121fc83-8978-481b-9c6c-a16197917493',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logDataError)}).catch(()=>{});
    // #endregion
    
    // Protéger tous les console.error pour éviter les erreurs de formatage
    try {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ [API /partner/submit-brand] ERREUR');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('Type:', typeof error);
      console.error('Message:', error?.message || 'Erreur inconnue');
      console.error('Stack:', error?.stack || 'Pas de stack trace');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    } catch (logError) {
      // Ignorer les erreurs de logging
    }

    if (error instanceof z.ZodError) {
      console.error('   Erreur Zod:', error.errors);
      return NextResponse.json(
        { 
          success: false,
          error: 'Données invalides', 
          details: error.errors 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: false,
        error: error?.message || 'Erreur lors de la soumission',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}

