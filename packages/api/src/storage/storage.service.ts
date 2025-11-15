import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private minioClient: Minio.Client;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    const endpoint = this.configService.get<string>(
      'MINIO_ENDPOINT',
      'localhost',
    );
    const port = parseInt(
      this.configService.get<string>('MINIO_PORT', '9000'),
      10,
    );
    const accessKey = this.configService.get<string>(
      'MINIO_ACCESS_KEY',
      'minioadmin',
    );
    const secretKey = this.configService.get<string>(
      'MINIO_SECRET_KEY',
      'minioadmin',
    );
    const useSSL =
      this.configService.get<string>('MINIO_USE_SSL', 'false') === 'true';
    this.bucketName = this.configService.get<string>(
      'MINIO_BUCKET_NAME',
      'lims-files',
    );

    this.minioClient = new Minio.Client({
      endPoint: endpoint,
      port: port,
      useSSL: useSSL,
      accessKey: accessKey,
      secretKey: secretKey,
    });

    this.logger.log(`MinIO client initialized for ${endpoint}:${port}`);
  }

  async onModuleInit() {
    try {
      // Check if bucket exists, create if not
      const bucketExists = await this.minioClient.bucketExists(this.bucketName);
      if (!bucketExists) {
        await this.minioClient.makeBucket(this.bucketName, 'us-east-1');
        this.logger.log(`Bucket '${this.bucketName}' created`);
      } else {
        this.logger.log(`Bucket '${this.bucketName}' already exists`);
      }
    } catch (error) {
      this.logger.error(`Failed to initialize bucket: ${error.message}`);
      // Don't throw error here to allow app to start even if MinIO is not available
    }
  }

  /**
   * Upload a file to MinIO
   * @param key Object key (path) in the bucket
   * @param buffer File content as Buffer
   * @param contentType MIME type of the file
   * @returns Object key
   */
  async uploadFile(
    key: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<string> {
    try {
      await this.minioClient.putObject(
        this.bucketName,
        key,
        buffer,
        buffer.length,
        {
          'Content-Type': contentType,
        },
      );
      this.logger.log(`File uploaded successfully: ${key}`);
      return key;
    } catch (error) {
      this.logger.error(`Failed to upload file: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get a file from MinIO
   * @param key Object key (path) in the bucket
   * @returns File content as Buffer
   */
  async getFile(key: string): Promise<Buffer> {
    try {
      const stream = await this.minioClient.getObject(this.bucketName, key);
      const chunks: Buffer[] = [];

      return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
      });
    } catch (error) {
      this.logger.error(`Failed to get file: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get a presigned URL for downloading a file
   * @param key Object key (path) in the bucket
   * @param expirySeconds Expiry time in seconds (default: 24 hours)
   * @returns Presigned URL
   */
  async getPresignedUrl(key: string, expirySeconds = 86400): Promise<string> {
    try {
      const url = await this.minioClient.presignedGetObject(
        this.bucketName,
        key,
        expirySeconds,
      );
      return url;
    } catch (error) {
      this.logger.error(`Failed to generate presigned URL: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a file from MinIO
   * @param key Object key (path) in the bucket
   */
  async deleteFile(key: string): Promise<void> {
    try {
      await this.minioClient.removeObject(this.bucketName, key);
      this.logger.log(`File deleted successfully: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete file: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if a file exists in MinIO
   * @param key Object key (path) in the bucket
   * @returns true if file exists, false otherwise
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      await this.minioClient.statObject(this.bucketName, key);
      return true;
    } catch (error) {
      if (error.code === 'NotFound') {
        return false;
      }
      throw error;
    }
  }
}
