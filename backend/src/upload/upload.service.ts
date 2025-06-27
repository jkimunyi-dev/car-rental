import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class UploadService {
  constructor(private configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get('CLOUDINARY_API_SECRET'),
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
  ) {
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
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder,
            transformation,
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          },
        );

        const stream = Readable.from(file.buffer);
        stream.pipe(uploadStream);
      });

      return result;
    } catch (error) {
      throw new BadRequestException(`Image upload failed: ${error.message}`);
    }
  }

  async uploadImages(
    files: Express.Multer.File[],
    folder: string = 'uploads',
    maxFiles = 10,
  ) {
    if (!files || !Array.isArray(files) || files.length === 0) {
      throw new BadRequestException('No files provided');
    }
    if (files.length > maxFiles) {
      throw new BadRequestException(`Maximum ${maxFiles} files allowed`);
    }
    const results = [];
    for (const file of files) {
      if (!file.buffer || file.size === 0) {
        throw new BadRequestException('Empty file detected');
      }
      results.push(await this.uploadImage(file, folder));
    }
    return results;
  }

  async uploadImageFromUrl(url: string, folder: string = 'uploads') {
    try {
      const result = await cloudinary.uploader.upload(url, {
        folder,
        transformation: [
          { width: 1200, height: 800, crop: 'limit' },
          { quality: 'auto' },
          { format: 'webp' },
        ],
      });

      return result;
    } catch (error) {
      throw new BadRequestException(
        `Image upload from URL failed: ${error.message}`,
      );
    }
  }

  async deleteImage(imageUrl: string) {
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
