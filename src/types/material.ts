import type { Material } from "@/db/schema";

export type { Material };

/**
 * Client-safe material shape. `storageKey` is internal and NEVER returned to
 * the client — the download URL is the only sanctioned way to fetch bytes.
 */
export interface MaterialSummary {
  id: string;
  lessonId: string;
  name: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
  updatedAt: Date;
}

export function toMaterialSummary(material: Material): MaterialSummary {
  return {
    id: material.id,
    lessonId: material.lessonId,
    name: material.name,
    originalFilename: material.originalFilename,
    mimeType: material.mimeType,
    sizeBytes: material.sizeBytes,
    createdAt: material.createdAt,
    updatedAt: material.updatedAt,
  };
}