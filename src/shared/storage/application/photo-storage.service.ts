import { Injectable, Logger } from '@nestjs/common';
import { ObjectStorage } from '../domain/object-storage.js';
import {
  buildPhotoKey,
  isPhotoContentType,
  type UploadedPhoto,
} from '../domain/photo.js';
import { InvalidInputError } from '@shared/domain/errors.js';

interface UploadPhotoInput {
  folder: string;
  ownerId: string;
  photo: UploadedPhoto;
}

interface ReplacePhotoInput<T> extends UploadPhotoInput {
  previousUrl: string | null | undefined;
  save: (photoUrl: string) => Promise<T>;
}

@Injectable()
export class PhotoStorageService {
  private readonly logger = new Logger(PhotoStorageService.name);

  constructor(private readonly storage: ObjectStorage) {}

  async upload({ folder, ownerId, photo }: UploadPhotoInput): Promise<string> {
    if (!isPhotoContentType(photo.mimetype)) {
      throw new InvalidInputError(`Unsupported photo type "${photo.mimetype}"`);
    }

    const stored = await this.storage.put({
      key: buildPhotoKey(folder, ownerId, photo.mimetype),
      body: photo.buffer,
      contentType: photo.mimetype,
    });

    return stored.url;
  }

  // The old photo goes only after the save; the new one is rolled back if the save fails.
  async replace<T>({
    previousUrl,
    save,
    ...input
  }: ReplacePhotoInput<T>): Promise<T> {
    const photoUrl = await this.upload(input);

    let saved: T;
    try {
      saved = await save(photoUrl);
    } catch (error) {
      await this.discard(photoUrl);
      throw error;
    }

    await this.discard(previousUrl);

    return saved;
  }

  // Best effort: an orphan object is cheaper than failing a request that already succeeded.
  async discard(url: string | null | undefined): Promise<void> {
    if (!url) return;

    const key = this.storage.keyFromUrl(url);
    if (!key) return;

    try {
      await this.storage.delete(key);
    } catch (error) {
      this.logger.warn(
        `Could not delete orphan photo "${key}": ${(error as Error).message}`,
      );
    }
  }
}
