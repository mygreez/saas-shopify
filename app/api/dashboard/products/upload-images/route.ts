// ============================================
// API: Upload Images pour produits (Admin)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/db/supabase';
import { ImageUploader } from '@/lib/services/image/uploader';

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Accès refusé : Admin requis' }, { status: 403 });
    }

    const formData = await request.formData();
    const imageFiles: File[] = [];

    // Récupérer toutes les images - essayer plusieurs méthodes
    // Méthode 1: image_0, image_1, etc.
    let index = 0;
    while (formData.has(`image_${index}`)) {
      const file = formData.get(`image_${index}`) as File;
      if (file && file instanceof File && file.size > 0) {
        imageFiles.push(file);
        console.log(`📸 Image ${index} trouvée: ${file.name} (${file.size} bytes)`);
      }
      index++;
    }

    // Méthode 2: Si aucune image trouvée, essayer avec getAll('files')
    if (imageFiles.length === 0) {
      const files = formData.getAll('files') as File[];
      files.forEach((file, idx) => {
        if (file && file instanceof File && file.size > 0) {
          imageFiles.push(file);
          console.log(`📸 Fichier ${idx} trouvé: ${file.name} (${file.size} bytes)`);
        }
      });
    }

    // Méthode 3: Essayer avec 'images' (pluriel)
    if (imageFiles.length === 0) {
      const files = formData.getAll('images') as File[];
      files.forEach((file, idx) => {
        if (file && file instanceof File && file.size > 0) {
          imageFiles.push(file);
          console.log(`📸 Image ${idx} trouvée: ${file.name} (${file.size} bytes)`);
        }
      });
    }

    console.log(`📸 Total fichiers trouvés: ${imageFiles.length}`);

    if (imageFiles.length === 0) {
      // Log tous les clés disponibles pour déboguer
      const allKeys = Array.from(formData.keys());
      console.error('Aucune image trouvée. Clés disponibles:', allKeys);
      return NextResponse.json({ 
        success: false, 
        error: 'Aucune image fournie',
        debug: { keys: allKeys }
      }, { status: 400 });
    }

    // Uploader les images - Essayer S3 d'abord, puis Supabase Storage
    let uploadedUrls: string[] = [];
    let errors: string[] = [];

    // Méthode 1: Essayer S3
    try {
      const uploader = ImageUploader.fromEnv();
      console.log('📤 Utilisation de S3 pour l\'upload...');
      
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        try {
          console.log(`📤 Upload image ${i + 1}/${imageFiles.length} vers S3: ${file.name}`);
          const url = await uploader.uploadImage(file, 'products');
          if (url) {
            console.log(`✅ Image ${i + 1} uploadée vers S3: ${url}`);
            uploadedUrls.push(url);
          } else {
            const errorMsg = `Image ${i + 1} uploadée mais URL vide`;
            console.error(`❌ ${errorMsg}`);
            errors.push(errorMsg);
          }
        } catch (error: any) {
          const errorMsg = `Erreur upload image ${i + 1} vers S3 (${file.name}): ${error.message || error}`;
          console.error(`❌ ${errorMsg}`, error);
          errors.push(errorMsg);
        }
      }
    } catch (s3Error: any) {
      console.warn('⚠️ S3 non configuré, tentative avec Supabase Storage...', s3Error.message);
      
      // Méthode 2: Fallback vers Supabase Storage
      try {
        const bucketName = 'products'; // Nom du bucket Supabase Storage
        
        // Vérifier que le bucket existe, sinon le créer
        const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
        if (!listError) {
          const bucketExists = buckets?.some(b => b.name === bucketName);
          if (!bucketExists) {
            console.log(`📦 Création du bucket ${bucketName}...`);
            const { error: createError } = await supabaseAdmin.storage.createBucket(bucketName, {
              public: true,
              fileSizeLimit: 52428800, // 50MB
            });
            if (createError) {
              console.warn(`⚠️ Impossible de créer le bucket: ${createError.message}`);
            }
          }
        }
        
        console.log('📤 Utilisation de Supabase Storage pour l\'upload...');
        
        for (let i = 0; i < imageFiles.length; i++) {
          const file = imageFiles[i];
          try {
            const fileExt = file.name.split('.').pop() || 'jpg';
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `products/${fileName}`;
            
            console.log(`📤 Upload image ${i + 1}/${imageFiles.length} vers Supabase Storage: ${file.name}`);
            
            const arrayBuffer = await file.arrayBuffer();
            const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
              .from(bucketName)
              .upload(filePath, arrayBuffer, {
                contentType: file.type || 'image/jpeg',
                upsert: false,
              });
            
            if (uploadError) {
              // Si le bucket n'existe pas, essayer de le créer et réessayer
              if (uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('not found')) {
                console.log(`📦 Bucket ${bucketName} non trouvé, création...`);
                const { error: createError } = await supabaseAdmin.storage.createBucket(bucketName, {
                  public: true,
                  fileSizeLimit: 52428800, // 50MB
                });
                if (!createError) {
                  // Réessayer l'upload
                  const { data: retryData, error: retryError } = await supabaseAdmin.storage
                    .from(bucketName)
                    .upload(filePath, arrayBuffer, {
                      contentType: file.type || 'image/jpeg',
                      upsert: false,
                    });
                  if (retryError) throw retryError;
                } else {
                  throw uploadError;
                }
              } else {
                throw uploadError;
              }
            }
            
            // Obtenir l'URL publique
            const { data: urlData } = supabaseAdmin.storage
              .from(bucketName)
              .getPublicUrl(filePath);
            
            if (urlData?.publicUrl) {
              console.log(`✅ Image ${i + 1} uploadée vers Supabase Storage: ${urlData.publicUrl}`);
              uploadedUrls.push(urlData.publicUrl);
            } else {
              const errorMsg = `Image ${i + 1} uploadée mais URL publique non disponible`;
              console.error(`❌ ${errorMsg}`);
              errors.push(errorMsg);
            }
          } catch (error: any) {
            const errorMsg = `Erreur upload image ${i + 1} vers Supabase Storage (${file.name}): ${error.message || error}`;
            console.error(`❌ ${errorMsg}`, error);
            errors.push(errorMsg);
          }
        }
      } catch (supabaseError: any) {
        console.error('❌ Erreur Supabase Storage:', supabaseError);
        return NextResponse.json({ 
          success: false, 
          error: 'Aucun système de stockage configuré. Configurez S3 ou Supabase Storage.',
          details: {
            s3_error: s3Error.message,
            supabase_error: supabaseError.message,
          }
        }, { status: 500 });
      }
    }

    console.log(`📸 Total images uploadées: ${uploadedUrls.length}/${imageFiles.length}`);

    if (uploadedUrls.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Aucune image n\'a pu être uploadée',
        details: errors 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      urls: uploadedUrls,
      count: uploadedUrls.length,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error: any) {
    console.error('Erreur upload images:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Erreur lors de l\'upload des images' },
      { status: 500 }
    );
  }
}

