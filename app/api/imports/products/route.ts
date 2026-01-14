// ============================================
// API: Import Products from Excel
// ============================================
// POST /api/imports/products

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { ExcelParser } from '@/lib/services/excel/parser';
import { ExcelMapper } from '@/lib/services/excel/mapper';
import { ProductValidator } from '@/lib/services/validation/product';
import { VariantValidator } from '@/lib/services/validation/variant';
import { getUserId } from '@/lib/auth';
import { ImportResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const storeId = formData.get('storeId') as string;
    const partnerId = formData.get('partnerId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 });
    }

    if (!storeId) {
      return NextResponse.json({ error: 'storeId manquant' }, { status: 400 });
    }

    // Vérifier que le store existe et appartient à l'utilisateur
    const store = await prisma.store.findFirst({
      where: {
        id: storeId,
        ownerId: userId,
      },
    });

    if (!store) {
      return NextResponse.json({ error: 'Store non trouvé ou accès refusé' }, { status: 404 });
    }

    // Créer le job d'import
    const importJob = await prisma.importJob.create({
      data: {
        status: 'PROCESSING',
        userId,
        storeId,
        fileUrl: null, // TODO: Uploader le fichier et stocker l'URL
      },
    });

    try {
      // Parser le fichier Excel
      const rows = await ExcelParser.parseFile(file);
      console.log(`📊 ${rows.length} lignes parsées`);

      if (rows.length === 0) {
        await prisma.importJob.update({
          where: { id: importJob.id },
          data: {
            status: 'FAILED',
            errors: [{ message: 'Aucune donnée trouvée dans le fichier' }],
          },
        });
        return NextResponse.json({
          jobId: importJob.id,
          status: 'FAILED',
          productsCreated: 0,
          errors: [{ field: 'file', message: 'Aucune donnée trouvée dans le fichier' }],
        });
      }

      // Mapper les lignes vers des produits
      const mappedProducts = ExcelMapper.mapToProducts(rows);
      console.log(`📦 ${mappedProducts.length} produits mappés`);

      // Valider les produits
      const allErrors: any[] = [];
      mappedProducts.forEach((product, index) => {
        const validation = ProductValidator.validateProduct(product, index + 1);
        if (!validation.isValid) {
          allErrors.push(...validation.errors);
        }
      });

      // Vérifier les SKU dupliqués
      const duplicateErrors = ProductValidator.checkDuplicateSKUs(mappedProducts);
      allErrors.push(...duplicateErrors);

      // Créer les produits en base (même s'il y a des erreurs)
      let productsCreated = 0;
      const createdProducts: string[] = [];

      for (const mappedProduct of mappedProducts) {
        try {
          // Vérifier si le produit existe déjà (par titre)
          const existingProduct = await prisma.product.findFirst({
            where: {
              title: mappedProduct.title,
              storeId,
            },
          });

          if (existingProduct) {
            console.log(`⚠️ Produit déjà existant: ${mappedProduct.title}`);
            continue;
          }

          // Créer le produit
          const product = await prisma.product.create({
            data: {
              title: mappedProduct.title,
              description: mappedProduct.description || null,
              vendor: mappedProduct.vendor || null,
              status: ProductValidator.isProductComplete(mappedProduct) ? 'READY' : 'DRAFT',
              storeId,
              partnerId: partnerId || null,
              variants: {
                create: mappedProduct.variants.map((v) => {
                  const normalized = VariantValidator.normalize(v);
                  return {
                    option1Name: normalized.option1Name || null,
                    option1Value: normalized.option1Value || null,
                    option2Name: normalized.option2Name || null,
                    option2Value: normalized.option2Value || null,
                    price: normalized.price,
                    sku: normalized.sku || null,
                    inventoryQty: normalized.inventoryQty || 0,
                  };
                }),
              },
            },
          });

          productsCreated++;
          createdProducts.push(product.id);
        } catch (error: any) {
          console.error(`Erreur création produit ${mappedProduct.title}:`, error);
          allErrors.push({
            field: 'product',
            message: `Erreur création "${mappedProduct.title}": ${error.message}`,
          });
        }
      }

      // Mettre à jour le job
      await prisma.importJob.update({
        where: { id: importJob.id },
        data: {
          status: allErrors.length > 0 && productsCreated === 0 ? 'FAILED' : 'COMPLETED',
          errors: allErrors.length > 0 ? allErrors : null,
        },
      });

      const response: ImportResponse = {
        jobId: importJob.id,
        status: allErrors.length > 0 && productsCreated === 0 ? 'FAILED' : 'COMPLETED',
        productsCreated,
        errors: allErrors,
      };

      return NextResponse.json(response);
    } catch (error: any) {
      console.error('Erreur import:', error);

      await prisma.importJob.update({
        where: { id: importJob.id },
        data: {
          status: 'FAILED',
          errors: [{ message: error.message || 'Erreur inconnue' }],
        },
      });

      return NextResponse.json(
        {
          jobId: importJob.id,
          status: 'FAILED',
          productsCreated: 0,
          errors: [{ field: 'import', message: error.message || 'Erreur lors de l\'import' }],
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Erreur API import:', error);
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 });
  }
}




