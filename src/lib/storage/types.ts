/**
 * Storage contract for the application.
 *
 * The domain/services layer depends ONLY on this interface — never on the
 * R2 implementation directly. Swapping R2 for another object store later
 * only requires a new implementation of `Storage`.
 */

/** HTTP metadata attached to a stored object. */
export interface StorageObjectMetadata {
  /** MIME type, surfaced as the response `Content-Type`. */
  contentType: string;
  /** Arbitrary key/value metadata the provider may attach to the object. */
  customMetadata?: Record<string, string>;
}

/** A read of a stored object. */
export interface StoredObject extends StorageObjectMetadata {
  /** Object key in the store. */
  key: string;
  /** Object body as a byte stream (R2 bodies are lazy streams). */
  body: ReadableStream<Uint8Array>;
  /** Declared byte size of the object. */
  contentLength: number;
  /** Provider ETag when available (R2 reports it as `httpEtag`). */
  etag?: string;
}

/** Result of a HEAD — lightweight metadata, no body. */
export interface StorageHeadResult extends StorageObjectMetadata {
  key: string;
  contentLength: number;
  etag?: string;
}

export interface PutObjectInput extends StorageObjectMetadata {
  key: string;
  body: ArrayBuffer | ReadableStream<Uint8Array>;
}

export interface Storage {
  /** Stores an object, overwriting any existing object at `key`. */
  putObject(input: PutObjectInput): Promise<void>;

  /** Fetches an object, or `null` when no object exists at `key`. */
  getObject(key: string): Promise<StoredObject | null>;

  /** Removes an object. Deleting a missing object is a no-op. */
  deleteObject(key: string): Promise<void>;

  /** Fetches an object's metadata without its body, or `null`. */
  headObject(key: string): Promise<StorageHeadResult | null>;
}

/** Raised when a storage backend is not available in the current runtime. */
export class StorageUnavailableError extends Error {
  constructor(
    message = "Storage is not available in this runtime.",
    options?: { cause?: unknown }
  ) {
    super(message, options as ErrorOptions);
    this.name = "StorageUnavailableError";
  }
}

/** Raised when the underlying store fails (network, provider error, ...). */
export class StorageError extends Error {
  constructor(message = "Storage operation failed.", options?: { cause?: unknown }) {
    super(message, options);
    this.name = "StorageError";
  }
}