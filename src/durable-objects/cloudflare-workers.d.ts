// Ambient declarations for the Cloudflare Workers types referenced by
// `src/durable-objects/classroom-room.ts`. We don't depend on
// `@cloudflare/workers-types` (it would balloon the install) — the
// DO only needs a narrow surface:
//   - DurableObjectState with `storage.sql` returning SqlStorage
//   - SqlStorage.exec / SqlStorage
//
// At runtime the real types are provided by the `workerd` isolate
// and the OpenNext-generated worker entry point. This file exists
// purely so `tsc --noEmit` doesn't choke during dev / CI.

declare module "cloudflare:workers" {
  export interface DurableObjectId {
    toString(): string;
    equals(other: DurableObjectId): boolean;
  }

  export interface DurableObjectStorage {
    get<T>(key: string): Promise<T | undefined>;
    put<T>(key: string, value: T): Promise<void>;
    delete(key: string): Promise<boolean>;
    transaction<T>(closure: () => Promise<T>): Promise<T>;
    sql: SqlStorage;
  }

  export interface SqlStorage {
    exec<T = unknown>(query: string, ...bindings: unknown[]): SqlStorageCursor<T>;
  }

  export interface SqlStorageCursor<T> {
    [Symbol.iterator](): IterableIterator<T>;
    toArray(): T[];
    one(): T | null;
    raw<T = unknown>(): IterableIterator<T>;
  }

  export interface DurableObjectState {
    storage: DurableObjectStorage;
    waitUntil(promise: Promise<unknown>): void;
    blockConcurrencyWhile<T>(callback: () => Promise<T>): Promise<T>;
    id: DurableObjectId;
  }

  // Minimal env binding the DO reads.
  export interface Env {
    CLASSROOM_TICKET_SECRET?: string;
    LIVE_FLUSH_SECRET?: string;
    NOTIFICATIONS_QUEUE?: { send(message: unknown): Promise<void> };
    [key: string]: unknown;
  }
}
