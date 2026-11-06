import { randomUUID } from 'node:crypto';

export const PHOTO_CONTENT_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const;

type PhotoContentType = keyof typeof PHOTO_CONTENT_TYPES;

export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;

export interface UploadedPhoto {
  buffer: Buffer;
  mimetype: string;
}

export function isPhotoContentType(value: string): value is PhotoContentType {
  return Object.hasOwn(PHOTO_CONTENT_TYPES, value);
}

// A new key per upload lets browsers and CDNs cache a photo forever.
export function buildPhotoKey(
  folder: string,
  ownerId: string,
  contentType: PhotoContentType,
): string {
  return `${folder}/${ownerId}/${randomUUID()}.${PHOTO_CONTENT_TYPES[contentType]}`;
}
