import { getCloudflareContext } from "@opennextjs/cloudflare";

import {
  type PutObjectInput,
  type Storage,
  StorageError,
  type StorageHeadResult,
  type StoredObject,
  StorageUnavailableError,
} from "./types";

/**
 * Cloudflare R2 storage backend.
 *
 * The R2 bucket is reached through the Worker binding (`MATERIALS_BUCKET`,
 * configured in wrangler.jsonc), so no access keys or secrets ever reach
 * the browser or the application process — credentials live inside the
 * Worker runtime itself.
 *
 * Bindings are resolved lazily per operation via `getCloudflareContext`,
 * which keeps this module safe to import (and type-check) on Node, where
 * the binding does not exist — callers there get a `StorageUnavailableError`
 * instead of a crash at import time.
 *
 * The bucket is typed structurally (not via @cloudflare/workers-types) so
 * this module has no dependency on wrangler typegen output.
 */

const BINDING_NAME = "MATERIALS_BUCKET";

interface R2HttpMetadata {
  contentType?: string;
}

interface R2ObjectLike {
  key: string;
  size: number;
  httpEtag: string | null;
  httpMetadata: R2HttpMetadata | null;
  customMetadata: Record<string, string> | null;
}

interface R2ObjectBodyLike extends R2ObjectLike {
  body: ReadableStream<Uint8Array>;
}

interface R2BucketLike {
  put(
    key: string,
    value: ArrayBuffer | ReadableStream<Uint8Array>,
    options?: { httpMetadata?: R2HttpMetadata; customMetadata?: Record<string, string> }
  ): Promise<unknown>;
  get(key: string): Promise<R2ObjectBodyLike | null>;
  head(key: string): Promise<R2ObjectLike | null>;
  delete(key: string | string[]): Promise<unknown>;
}

class R2Storage implements Storage {
  private bucket: R2BucketLike | null = null;

  private async getBucket(): Promise<R2BucketLike> {
    if (this.bucket) return this.bucket;

    let env: Record<string, unknown>;
    try {
      const ctx = await getCloudflareContext({ async: true });
      env = ctx.env as unknown as Record<string, unknown>;
    } catch (error) {
      // Not running on a Cloudflare Worker (e.g. `next dev` on Node or a
      // tsx test script). Surface a typed, sanitized error.
      throw new StorageUnavailableError("R2 storage is not available in this runtime.", {
        cause: error,
      });
    }

    const bucket = env[BINDING_NAME];
    if (!bucket) {
      throw new StorageUnavailableError(
        `R2 binding "${BINDING_NAME}" is not configured on this Worker.`,
      );
    }

    this.bucket = bucket as R2BucketLike;
    return this.bucket;
  }

  async putObject(input: PutObjectInput): Promise<void> {
    const bucket = await this.getBucket();
    try {
      await bucket.put(input.key, input.body, {
        httpMetadata: { contentType: input.contentType },
        customMetadata: input.customMetadata,
      });
    } catch (error) {
      throw new StorageError("Storage operation failed.", { cause: error });
    }
  }

  async getObject(key: string): Promise<StoredObject | null> {
    const bucket = await this.getBucket();
    try {
      const object = await bucket.get(key);
      if (!object) return null;
      return {
        key: object.key,
        body: object.body,
        contentType: object.httpMetadata?.contentType ?? "application/octet-stream",
        contentLength: object.size,
        etag: object.httpEtag ?? undefined,
        customMetadata: object.customMetadata ?? undefined,
      };
    } catch (error) {
      throw new StorageError("Storage operation failed.", { cause: error });
    }
  }

  async deleteObject(key: string): Promise<void> {
    const bucket = await this.getBucket();
    try {
      await bucket.delete(key);
    } catch (error) {
      throw new StorageError("Storage operation failed.", { cause: error });
    }
  }

  async headObject(key: string): Promise<StorageHeadResult | null> {
    const bucket = await this.getBucket();
    try {
      const object = await bucket.head(key);
      if (!object) return null;
      return {
        key: object.key,
        contentType: object.httpMetadata?.contentType ?? "application/octet-stream",
        contentLength: object.size,
        etag: object.httpEtag ?? undefined,
        customMetadata: object.customMetadata ?? undefined,
      };
    } catch (error) {
      throw new StorageError("Storage operation failed.", { cause: error });
    }
  }
}

let cached: R2Storage | null = null;

/**
 * Returns the app-wide R2 storage backend.
 *
 * Safe to call from anywhere at any time: the binding is resolved lazily on
 * the first actual operation. On non-Worker runtimes operations throw
 * `StorageUnavailableError` (services degrade gracefully / best-effort).
 */
export function getDefaultStorage(): Storage {
  if (!cached) cached = new R2Storage();
  return cached;
}