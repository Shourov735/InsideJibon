import { FileTypeIcon } from "@/components/materials/file-type-icon";
import {
  formatBytes,
  formatMaterialDate,
  getFileTypeLabel,
  getMaterialDownloadUrl,
} from "@/lib/material-utils";
import type { MaterialSummary } from "@/types/material";
import { getTranslator } from "@/i18n/server";

interface LessonResourcesProps {
  materials: MaterialSummary[] | null;
  className?: string;
}

export async function LessonResources({
  materials,
  className = "",
}: LessonResourcesProps) {
  const t = await getTranslator();
  // If null, the student cannot access materials (not enrolled or course unpublished)
  if (materials === null) {
    return null;
  }

  return (
    <section
      aria-labelledby="lesson-resources-heading"
      className={`rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 sm:p-6 shadow-xs ${className}`}
    >
      <div className="flex items-center justify-between border-b border-outline-variant pb-3.5 mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container-high text-primary">
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <div>
            <h3
              id="lesson-resources-heading"
              className="text-sm font-bold text-on-surface"
            >
              {t("student.learn.resourcesHeading")}
            </h3>
            <p className="text-xs text-secondary">
              {t("student.learn.resourcesSubtitle")}
            </p>
          </div>
        </div>

        <span className="rounded-full bg-surface-container-low px-2.5 py-0.5 text-xs font-semibold text-secondary">
          {t.tn("common.fileCount", materials.length)}
        </span>
      </div>

      {materials.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-outline-variant bg-surface-container-low/40 p-4 text-secondary">
          <svg
            className="h-5 w-5 shrink-0 text-outline"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-xs">
            {t("student.learn.resourcesEmpty")}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {materials.map((material) => {
            const downloadUrl = getMaterialDownloadUrl(material.id);
            const fileLabel = getFileTypeLabel(
              material.mimeType,
              material.originalFilename,
              t.locale
            );

            return (
              <li
                key={material.id}
                className="group flex flex-col gap-3 rounded-xl border border-outline-variant bg-surface p-3.5 transition-all hover:border-primary/40 hover:bg-surface-container-lowest hover:shadow-2xs sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <FileTypeIcon
                    mimeType={material.mimeType}
                    filename={material.originalFilename}
                    size="md"
                    className="mt-0.5 transition-transform group-hover:scale-105"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-xs font-bold text-on-surface group-hover:text-primary transition-colors">
                      {material.name}
                    </h4>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-secondary">
                      <span className="font-medium text-on-surface-variant">
                        {fileLabel}
                      </span>
                      <span>•</span>
                      <span>{formatBytes(material.sizeBytes)}</span>
                      {material.originalFilename !== material.name && (
                        <>
                          <span>•</span>
                          <span
                            className="truncate max-w-[180px]"
                            title={material.originalFilename}
                          >
                            {material.originalFilename}
                          </span>
                        </>
                      )}
                      {material.createdAt && (
                        <>
                          <span>•</span>
                          <span>{formatMaterialDate(material.createdAt, t.locale)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <a
                  href={downloadUrl}
                  download={material.originalFilename}
                  className="inline-flex items-center justify-center gap-2 self-end sm:self-center rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary-container hover:text-on-primary-container focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  aria-label={t("student.learn.downloadAria", {
                    name: material.name,
                    size: formatBytes(material.sizeBytes),
                  })}
                >
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  <span>{t("common.download")}</span>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
