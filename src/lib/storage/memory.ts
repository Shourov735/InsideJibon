import {
  type PutObjectInput,
  type Storage,
  type StorageHeadResult,
  type StoredObject,
} from "./types";

/**
 * In-memory storage backend. Used by automated tests and as a reference
 * implementation of the `Storage` contract. Never used in production.
 */
export class MemoryStorage implements Storage {
  private objects = new Map<
    string,
    {
      bytes: Uint8Array;
      contentType: string;
      customMetadata?: Record<string, string>;
    }
  >();

  async putObject(input: PutObjectInput): Promise<void> {
    const bytes =
      input.body instanceof ArrayBuffer
        ? new Uint8Array(input.body)
        : new Uint8Array(await new Response(input.body).arrayBuffer());

    this.objects.set(input.key, {
      bytes,
      contentType: input.contentType,
      customMetadata: input.customMetadata,
    });
  }

  async getObject(key: string): Promise<StoredObject | null> {
    const entry = this.objects.get(key);
    if (!entry) return null;
    return {
      key,
      body: new Blob([entry.bytes as unknown as BlobPart]).stream(),
      contentType: entry.contentType,
      contentLength: entry.bytes.byteLength,
      customMetadata: entry.customMetadata,
    };
  }

  async deleteObject(key: string): Promise<void> {
    this.objects.delete(key);
  }

  async headObject(key: string): Promise<StorageHeadResult | null> {
    const entry = this.objects.get(key);
    if (!entry) return null;
    return {
      key,
      contentType: entry.contentType,
      contentLength: entry.bytes.byteLength,
      customMetadata: entry.customMetadata,
    };
  }

  /** Total number of objects currently stored (test assertions). */
  objectCount(): number {
    return this.objects.size;
  }

  /** True when an object exists at `key` (test assertions). */
  has(key: string): boolean {
    return this.objects.has(key);
  }
}