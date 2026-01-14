// ============================================
// API: Récupérer la submission et parser l'Excel
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';
// @ts-ignore
import * as XLSX from 'xlsx';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    if (!token) {
      return NextResponse.json(
        { error: 'Token manquant' },
        { status: 400 }
      );
    }

    // Valider le token et récupérer l'invitation avec company_name
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('partner_invitations')
      .select('id, company_name, email')
      .eq('token', token)
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json(
        { error: 'Token invalide' },
        { status: 404 }
      );
    }

    // Récupérer la submission (sans filtrer par status pour permettre de voir tous les statuts)
    const { data: submission, error: submissionError } = await supabaseAdmin
      .from('partner_submissions')
      .select('*, brand:brands(*)')
      .eq('invitation_id', invitation.id)
      .single();

    // #region agent log
    const logData = {location:'api/partner/submission/[token]/route.ts:39',message:'Submission fetched',data:{token,invitation_id:invitation.id,submissionId:submission?.id,status:submission?.status,hasError:!!submissionError,errorMessage:submissionError?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'};
    fetch('http://127.0.0.1:7244/ingest/3121fc83-8978-481b-9c6c-a16197917493',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData)}).catch(()=>{});
    // #endregion

    console.log('🔍 Récupération soumission pour token:', {
      token,
      invitation_id: invitation.id,
      submissionError: submissionError?.message,
      submission: submission ? {
        id: submission.id,
        status: submission.status,
        brand_id: submission.brand_id
      } : null
    });

    if (submissionError || !submission) {
      console.error('❌ Soumission non trouvée:', submissionError);
      return NextResponse.json(
        { 
          success: false,
          error: 'Soumission non trouvée',
          details: process.env.NODE_ENV === 'development' ? {
            invitation_id: invitation.id,
            error: submissionError?.message
          } : undefined
        },
        { status: 404 }
      );
    }

    // Parser l'Excel si disponible
    let products: any[] = [];
    if (submission.excel_file_url) {
      try {
        // Télécharger le fichier Excel
        const excelResponse = await fetch(submission.excel_file_url);
        if (excelResponse.ok) {
          const arrayBuffer = await excelResponse.arrayBuffer();
          const workbook = XLSX.read(arrayBuffer, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // Convertir en JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: '',
          }) as any[][];

          if (jsonData.length > 1) {
            // Première ligne = en-têtes
            const headers = (jsonData[0] as string[]).map((h) =>
              String(h || '').trim().toLowerCase()
            );

            // Convertir en objets
            for (let i = 1; i < jsonData.length; i++) {
              const row = jsonData[i] as any[];
              const rowObj: any = {};

              headers.forEach((header, index) => {
                if (header) {
                  rowObj[header] = row[index] ?? null;
                }
              });

              // Ignorer les lignes complètement vides
              if (Object.values(rowObj).some((val) => val !== null && val !== '')) {
                products.push(rowObj);
              }
            }
          }
        }
      } catch (excelError) {
        console.error('Erreur parsing Excel:', excelError);
        // Continuer même si le parsing échoue
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: submission.id,
        status: submission.status, // Statut de la soumission
        submission_id: submission.id,
        brand: submission.brand,
        company_name: invitation.company_name, // Nom d'entreprise de l'invitation
        products: products, // Produits parsés depuis Excel (peut être vide)
        excel_filename: submission.excel_filename,
        invitation_id: invitation.id, // ID de l'invitation pour référence
      },
    });

  } catch (error: any) {
    console.error('Erreur récupération submission:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération' },
      { status: 500 }
    );
  }
}


