// ============================================
// SERVICE: Image Uploader (S3-compatible)
// ============================================

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

interface S3Config {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

export class ImageUploader {
  private s3Client: S3Client;
  private config: S3Config;

  constructor(config: S3Config) {
    this.config = config;
    this.s3Client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: true, // Pour S3-compatible (MinIO, etc.)
    });
  }

  /**
   * Upload une image vers S3
   */
  async uploadImage(file: File, folder: string = 'products'): Promise<string> {
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${folder}/${randomUUID()}.${fileExtension}`;
    const buffer = await file.arrayBuffer();

    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: fileName,
      Body: Buffer.from(buffer),
      ContentType: file.type || 'image/jpeg',
      ACL: 'public-read', // Ou utiliser une politique bucket
    });

    await this.s3Client.send(command);

    // Construire l'URL publique
    const publicUrl = `${this.config.endpoint}/${this.config.bucket}/${fileName}`;
    return publicUrl;
  }

  /**
   * Upload plusieurs images
   */
  async uploadImages(files: File[], folder: string = 'products'): Promise<string[]> {
    const uploadPromises = files.map((file) => this.uploadImage(file, folder));
    return Promise.all(uploadPromises);
  }

  /**
   * Créer une instance depuis les variables d'environnement
   */
  static fromEnv(): ImageUploader {
    const config: S3Config = {
      endpoint: process.env.S3_ENDPOINT || process.env.AWS_S3_ENDPOINT || '',
      region: process.env.S3_REGION || process.env.AWS_REGION || 'us-east-1',
      accessKeyId: process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey:
        process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || '',
      bucket: process.env.S3_BUCKET || process.env.AWS_S3_BUCKET || '',
    };

    // Validation
    if (!config.endpoint || !config.accessKeyId || !config.secretAccessKey || !config.bucket) {
      throw new Error(
        'Configuration S3 incomplète. Vérifiez les variables d\'environnement S3_* ou AWS_*'
      );
    }

    return new ImageUploader(config);
  }
}

