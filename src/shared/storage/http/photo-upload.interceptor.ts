import { FileInterceptor } from '@nestjs/platform-express';
import { PHOTO_MAX_BYTES } from '../domain/photo.js';

export const PhotoUploadInterceptor = FileInterceptor('file', {
  limits: { fileSize: PHOTO_MAX_BYTES, files: 1 },
});
