import type { ObjectStorage, StoredObject } from '../domain/object-storage.js';
import { UnavailableError } from '@shared/domain/errors.js';

export class UnconfiguredObjectStorage implements ObjectStorage {
  put(): Promise<StoredObject> {
    return Promise.reject(
      new UnavailableError('Photo storage is not configured (set S3_BUCKET)'),
    );
  }

  delete(): Promise<void> {
    return Promise.resolve();
  }

  keyFromUrl(): string | null {
    return null;
  }
}
