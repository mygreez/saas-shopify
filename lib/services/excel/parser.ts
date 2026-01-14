// ============================================
// SERVICE: Excel Parser
// ============================================
// Parse CSV/XLSX files et retourne les lignes brutes

import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { ExcelRow } from '@/lib/types';

export class ExcelParser {
  /**
   * Parse un fichier Excel/CSV et retourne les lignes
   */
  static async parseFile(file: File): Promise<ExcelRow[]> {
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension === 'csv') {
      return this.parseCSV(file);
    } else if (extension === 'xlsx' || extension === 'xls') {
      return this.parseXLSX(file);
    } else {
      throw new Error(`Format de fichier non supporté: ${extension}`);
    }
  }

  /**
   * Parse un fichier CSV
   */
  private static async parseCSV(file: File): Promise<ExcelRow[]> {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => {
          // Normaliser les en-têtes (trim, lowercase)
          return header.trim().toLowerCase();
        },
        complete: (results) => {
          if (results.errors.length > 0) {
            console.warn('Erreurs de parsing CSV:', results.errors);
          }
          resolve(results.data as ExcelRow[]);
        },
        error: (error) => {
          reject(new Error(`Erreur parsing CSV: ${error.message}`));
        },
      });
    });
  }

  /**
   * Parse un fichier XLSX/XLS
   */
  private static async parseXLSX(file: File): Promise<ExcelRow[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });

          // Prendre la première feuille
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];

          // Convertir en JSON avec en-têtes
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: null,
          }) as any[];

          if (jsonData.length === 0) {
            resolve([]);
            return;
          }

          // Première ligne = en-têtes
          const headers = (jsonData[0] as string[]).map((h) =>
            String(h || '').trim().toLowerCase()
          );

          // Convertir en objets
          const rows: ExcelRow[] = [];
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i] as any[];
            const rowObj: ExcelRow = {};

            headers.forEach((header, index) => {
              if (header) {
                rowObj[header] = row[index] ?? null;
              }
            });

            // Ignorer les lignes complètement vides
            if (Object.values(rowObj).some((val) => val !== null && val !== '')) {
              rows.push(rowObj);
            }
          }

          resolve(rows);
        } catch (error: any) {
          reject(new Error(`Erreur parsing XLSX: ${error.message}`));
        }
      };

      reader.onerror = () => {
        reject(new Error('Erreur lecture fichier XLSX'));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Détecte les colonnes disponibles dans les données parsées
   */
  static detectColumns(rows: ExcelRow[]): string[] {
    if (rows.length === 0) return [];

    const allColumns = new Set<string>();
    rows.forEach((row) => {
      Object.keys(row).forEach((key) => allColumns.add(key));
    });

    return Array.from(allColumns).sort();
  }
}




