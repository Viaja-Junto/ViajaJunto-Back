export interface StoredObject {
  key: string;
  url: string;
}

export interface PutObjectInput {
  key: string;
  body: Buffer;
  contentType: string;
}

export abstract class ObjectStorage {
  abstract put(input: PutObjectInput): Promise<StoredObject>;

  abstract delete(key: string): Promise<void>;

  abstract keyFromUrl(url: string): string | null;
}
