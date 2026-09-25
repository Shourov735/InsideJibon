import "server-only";
import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { publicAssets, type PublicAsset } from "@/db/schema";
import { getPublicBucket } from "@/lib/cloudflare/r2";
import { StorageError, StorageUnavailableError } from "./types";

export type ImageVariant = "original" | "webp-480" | "webp-720" | "webp-1080";

export interface PublicUrlOptions {
  variant?: ImageVariant;
}

export interface PublicAssetOwner {
  kind: string;
  id?: string | null;
}

export type AssetOwner = PublicAssetOwner;

export interface UploadPublicAssetOptions {
  ownerKind?: string;
  ownerId?: string | null;
  kind?: string;
  id?: string | null;
  tags?: string[];
}

export const DEFAULT_CDN_BASE = "https://cdn.insidejibon.com.bd";

/**
 * Resolves the public CDN base origin from environment variables,
 * falling back to the canonical CDN base domain.
 */
export function getPublicCdnBase(): string {
  const envBase =
    process.env.PUBLIC_BUCKET_PUBLIC_URL?.replace(/\/+$/, "") ??
    process.env.NEXT_PUBLIC_PUBLIC_BUCKET_URL?.replace(/\/+$/, "");
  return envBase || DEFAULT_CDN_BASE;
}

/**
 * Resolves the public URL for an asset reference.
 *
 * The app is link-only: teachers host media elsewhere (YouTube, an image
 * host) and store the resulting HTTPS URL. Any value that is already an
 * absolute http(s) URL is therefore returned verbatim — it is never prefixed
 * with the CDN base, which would corrupt it.
 *
 * Plain relative keys are still resolved against the CDN base for backwards
 * compatibility with rows written before the link-only model.
 *
 * For image assets with a requested variant ('webp-480', 'webp-720', 'webp-1080'),
 * generates the Cloudflare Image Resizing URL (/cdn-cgi/image/format=webp,width=...).
 *
 * Non-image files, 'original' variant, and local environments fall back directly
 * to the unmodified asset URL.
 */
export function publicUrl(key: string, options?: PublicUrlOptions): string {
  if (!key) return "";
  const cleanKey = key.replace(/^\/+/, "").trim();

  // Link-only passthrough: an absolute http(s) URL is already its own public
  // location. `data:`/`javascript:` deliberately do not qualify — they are
  // rejected at input validation and must never be echoed into `src`/`href`.
  if (/^https?:\/\/\S+$/i.test(cleanKey)) {
    return cleanKey;
  }

  const base = getPublicCdnBase();
  const variant = options?.variant || "original";

  const isImage = /\.(jpe?g|png|webp|avif|gif|svg)$/i.test(cleanKey);

  // Direct URL fallback for original variant or non-image assets
  if (!isImage || variant === "original") {
    return `${base}/${cleanKey}`;
  }

  // Local/dev fallback: Cloudflare Image Resizing only runs on Cloudflare zones
  if (!base.startsWith("https://") || base.includes("localhost")) {
    return `${base}/${cleanKey}`;
  }

  const widths: Record<Exclude<ImageVariant, "original">, number> = {
    "webp-480": 480,
    "webp-720": 720,
    "webp-1080": 1080,
  };

  const width = widths[variant];
  if (!width) {
    return `${base}/${cleanKey}`;
  }

  return `${base}/cdn-cgi/image/format=webp,width=${width}/${cleanKey}`;
}

/**
 * Uploads an asset to the unauthenticated public R2 bucket (PUBLIC_BUCKET)
 * and records or updates its metadata in the public_assets table.
 *
 * Supports both positional owner/tags arguments and options object:
 * - uploadPublicAsset(key, data, mimeType, { kind: "course", id: "123" }, ["tag1"])
 * - uploadPublicAsset(key, data, mimeType, { ownerKind: "course", ownerId: "123", tags: ["tag1"] })
 *
 * Returns the public URL string of the uploaded asset.
 */
export async function uploadPublicAsset(
  key: string,
  data: ArrayBuffer | Uint8Array,
  mimeType: string,
  owner?: PublicAssetOwner | UploadPublicAssetOptions,
  tags?: string[]
): Promise<string> {
  const cleanKey = key.replace(/^\/+/, "").trim();
  if (!cleanKey) {
    throw new Error("Asset key cannot be empty.");
  }

  const byteSize = data.byteLength;

  let ownerKind = "system";
  let ownerId: string | null = null;
  let assetTags: string[] = [];

  if (owner) {
    if ("ownerKind" in owner && owner.ownerKind) {
      ownerKind = owner.ownerKind;
    } else if ("kind" in owner && owner.kind) {
      ownerKind = owner.kind;
    }

    if ("ownerId" in owner && owner.ownerId !== undefined) {
      ownerId = owner.ownerId;
    } else if ("id" in owner && owner.id !== undefined) {
      ownerId = owner.id;
    }

    if ("tags" in owner && Array.isArray(owner.tags)) {
      assetTags = owner.tags;
    }
  }

  if (tags && Array.isArray(tags)) {
    assetTags = tags;
  }

  // 1. Upload to Cloudflare R2 PUBLIC_BUCKET
  const bucket = await getPublicBucket();
  if (!bucket) {
    if (process.env.NODE_ENV === "test") {
      console.warn(
        `[public-storage] PUBLIC_BUCKET binding unavailable in test runtime; skipping R2 put for "${cleanKey}".`
      );
    } else {
      throw new StorageUnavailableError(
        "PUBLIC_BUCKET binding is not available in this runtime."
      );
    }
  } else {
    try {
      await bucket.put(cleanKey, data, {
        httpMetadata: { contentType: mimeType },
      });
    } catch (error) {
      throw new StorageError(
        `Failed to upload public asset "${cleanKey}" to R2.`,
        { cause: error }
      );
    }
  }

  // 2. Upsert into public_assets catalog
  const db = getDb();
  await db
    .insert(publicAssets)
    .values({
      storageKey: cleanKey,
      mimeType,
      byteSize,
      ownerKind,
      ownerId,
      tags: assetTags,
    })
    .onConflictDoUpdate({
      target: publicAssets.storageKey,
      set: {
        mimeType,
        byteSize,
        ownerKind,
        ownerId,
        tags: assetTags,
      },
    });

  return publicUrl(cleanKey);
}

/**
 * Deletes an asset from the public R2 bucket and removes its catalog entry
 * from the public_assets table. Idempotent on missing keys.
 *
 * Returns true upon completion.
 */
export async function deletePublicAsset(key: string): Promise<boolean> {
  const cleanKey = key.replace(/^\/+/, "").trim();
  if (!cleanKey) return false;

  const bucket = await getPublicBucket();
  if (bucket) {
    try {
      await bucket.delete(cleanKey);
    } catch (error) {
      throw new StorageError(
        `Failed to delete public asset "${cleanKey}" from R2.`,
        { cause: error }
      );
    }
  }

  const db = getDb();
  await db.delete(publicAssets).where(eq(publicAssets.storageKey, cleanKey));
  return true;
}

/**
 * Fetches a single public asset catalog entry by storage key.
 */
export async function getPublicAsset(key: string): Promise<PublicAsset | null> {
  const cleanKey = key.replace(/^\/+/, "").trim();
  if (!cleanKey) return null;

  const db = getDb();
  const [asset] = await db
    .select()
    .from(publicAssets)
    .where(eq(publicAssets.storageKey, cleanKey))
    .limit(1);

  return asset ?? null;
}

/**
 * Queries the public_assets catalog by ownerKind and optional ownerId.
 */
export async function getPublicAssetsByOwner(
  ownerKind: string,
  ownerId?: string | null
): Promise<PublicAsset[]> {
  const db = getDb();
  if (ownerId) {
    return db
      .select()
      .from(publicAssets)
      .where(
        and(
          eq(publicAssets.ownerKind, ownerKind),
          eq(publicAssets.ownerId, ownerId)
        )
      );
  }
  return db
    .select()
    .from(publicAssets)
    .where(eq(publicAssets.ownerKind, ownerKind));
}
