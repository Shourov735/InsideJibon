/**
 * Prepares an uploaded web `File` for object-storage writes without holding
 * the whole file in JS memory where the runtime supports it.
 *
 * On Cloudflare Workers, R2 accepts a `ReadableStream` only when its length
 * is known up front — `FixedLengthStream` provides that contract. Piping the
 * upload through it streams bytes straight into the store instead of
 * materializing them with `arrayBuffer()` (which spikes isolate memory per
 * concurrent upload).
 *
 * Where `FixedLengthStream` does not exist (Node dev/tests), falls back to
 * buffering so behavior stays identical everywhere.
 */

interface UploadFileLike {
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
  stream?(): ReadableStream<Uint8Array>;
}

interface FixedLengthStreamCtor {
  new (length: number): {
    readable: ReadableStream<Uint8Array>;
    writable: WritableStream<Uint8Array>;
  };
}

export async function resolveUploadBody(
  file: UploadFileLike
): Promise<ArrayBuffer | ReadableStream<Uint8Array>> {
  const ctor = (globalThis as Record<string, unknown>).FixedLengthStream as
    | FixedLengthStreamCtor
    | undefined;

  if (ctor && typeof file.stream === "function") {
    const pipe = new ctor(file.size);
    void file.stream().pipeTo(pipe.writable).catch(() => {
      // The consumer of `readable` (the storage put) surfaces failures.
    });
    return pipe.readable;
  }

  return file.arrayBuffer();
}
