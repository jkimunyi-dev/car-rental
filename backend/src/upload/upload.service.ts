import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
  bytes: number;
}

@Injectable()
export class UploadService {
  constructor(private configService: ConfigService) {
    const cloudName = this.configService.get('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get('CLOUDINARY_API_SECRET');

    console.log('Cloudinary Configuration:', {
      cloudName: cloudName ? 'Set' : 'Missing',
      apiKey: apiKey ? 'Set' : 'Missing',
      apiSecret: apiSecret ? 'Set (hidden)' : 'Missing',
    });

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      timeout: 60000,
    });
  }

  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'uploads',
    transformation: any[] = [
      { width: 1200, height: 800, crop: 'limit' },
      { quality: 'auto' },
      { format: 'webp' },
    ],
  ): Promise<CloudinaryUploadResult> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file type
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only JPEG, PNG, and WebP are allowed',
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size too large. Maximum size is 5MB');
    }

    try {
      const result = await new Promise<UploadApiResponse>((resolve, reject) => {
        // Add timeout handling
        const timeoutId = setTimeout(() => {
          reject(new Error('Upload timeout - request took too long'));
        }, 30000); // 30 seconds timeout

        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder,
            transformation,
            timeout: 30000, // 30 seconds
            resource_type: 'image',
          },
          (error, result) => {
            clearTimeout(timeoutId);
            if (error) {
              console.error('Cloudinary upload error:', error);
              reject(error);
            } else {
              resolve(result!);
            }
          },
        );

        try {
          const stream = Readable.from(file.buffer);
          stream.pipe(uploadStream);
        } catch (streamError) {
          clearTimeout(timeoutId);
          reject(streamError);
        }
      });

      return {
        secure_url: result.secure_url,
        public_id: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        resource_type: result.resource_type,
        bytes: result.bytes,
      };
    } catch (error) {
      console.error('Upload service error:', error);
      throw new BadRequestException(`Image upload failed: ${error.message}`);
    }
  }

  async uploadImages(
    files: Express.Multer.File[],
    folder: string = 'uploads',
    maxFiles = 10,
  ): Promise<CloudinaryUploadResult[]> {
    if (!files || !Array.isArray(files) || files.length === 0) {
      throw new BadRequestException('No files provided');
    }
    if (files.length > maxFiles) {
      throw new BadRequestException(`Maximum ${maxFiles} files allowed`);
    }
    const results: CloudinaryUploadResult[] = [];
    for (const file of files) {
      if (!file.buffer || file.size === 0) {
        throw new BadRequestException('Empty file detected');
      }
      results.push(await this.uploadImage(file, folder));
    }
    return results;
  }

  async uploadImageFromUrl(url: string, folder: string = 'uploads'): Promise<CloudinaryUploadResult> {
    try {
      const result = await cloudinary.uploader.upload(url, {
        folder,
        transformation: [
          { width: 1200, height: 800, crop: 'limit' },
          { quality: 'auto' },
          { format: 'webp' },
        ],
      });

      return {
        secure_url: result.secure_url,
        public_id: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        resource_type: result.resource_type,
        bytes: result.bytes,
      };
    } catch (error) {
      throw new BadRequestException(
        `Image upload from URL failed: ${error.message}`,
      );
    }
  }

  async deleteImage(imageUrl: string): Promise<void> {
    try {
      // Extract public_id from Cloudinary URL
      const publicId = this.extractPublicId(imageUrl);

      if (publicId) {
        await cloudinary.uploader.destroy(publicId);
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      throw new BadRequestException(`Image deletion failed: ${error.message}`);
    }
  }

  private extractPublicId(imageUrl: string): string | null {
    try {
      const parts = imageUrl.split('/');
      const filename = parts[parts.length - 1];
      const publicId = filename.split('.')[0];

      // Find the folder path
      const folderIndex = parts.findIndex((part) => part === 'upload');
      if (folderIndex >= 0 && folderIndex < parts.length - 2) {
        const folderPath = parts.slice(folderIndex + 2, -1).join('/');
        return folderPath ? `${folderPath}/${publicId}` : publicId;
      }

      return publicId;
    } catch (error) {
      console.error('Error extracting public ID:', error);
      return null;
    }
  }
}
