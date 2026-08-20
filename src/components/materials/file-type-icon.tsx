import { getFileTypeCategory, type FileCategory } from "@/lib/material-utils";

interface FileTypeIconProps {
  mimeType?: string;
  filename?: string;
  category?: FileCategory;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function FileTypeIcon({
  mimeType = "",
  filename = "",
  category: explicitCategory,
  size = "md",
  className = "",
}: FileTypeIconProps) {
  const category = explicitCategory ?? getFileTypeCategory(mimeType, filename);

  const sizeClasses = {
    sm: "w-8 h-8 rounded-md text-xs",
    md: "w-10 h-10 rounded-lg text-sm",
    lg: "w-12 h-12 rounded-xl text-base",
  }[size];

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  }[size];

  switch (category) {
    case "pdf":
      return (
        <div
          aria-hidden="true"
          className={`flex shrink-0 items-center justify-center border border-error/20 bg-error-container text-error ${sizeClasses} ${className}`}
        >
          <svg
            className={iconSizes}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 13h2a1 1 0 011 1v0a1 1 0 01-1 1H9v-4h2a1 1 0 011 1v0a1 1 0 01-1 1"
            />
          </svg>
        </div>
      );

    case "doc":
      return (
        <div
          aria-hidden="true"
          className={`flex shrink-0 items-center justify-center border border-secondary-container bg-secondary-container text-on-secondary-container ${sizeClasses} ${className}`}
        >
          <svg
            className={iconSizes}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
      );

    case "ppt":
      return (
        <div
          aria-hidden="true"
          className={`flex shrink-0 items-center justify-center border border-amber-200 bg-amber-100 text-amber-800 ${sizeClasses} ${className}`}
        >
          <svg
            className={iconSizes}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
            />
          </svg>
        </div>
      );

    case "xls":
      return (
        <div
          aria-hidden="true"
          className={`flex shrink-0 items-center justify-center border border-emerald-200 bg-emerald-100 text-emerald-800 ${sizeClasses} ${className}`}
        >
          <svg
            className={iconSizes}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 10h18M3 14h18m-9-4v8m-7 4h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
      );

    case "image":
      return (
        <div
          aria-hidden="true"
          className={`flex shrink-0 items-center justify-center border border-purple-200 bg-purple-100 text-purple-800 ${sizeClasses} ${className}`}
        >
          <svg
            className={iconSizes}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
      );

    case "archive":
      return (
        <div
          aria-hidden="true"
          className={`flex shrink-0 items-center justify-center border border-slate-300 bg-slate-200 text-slate-800 ${sizeClasses} ${className}`}
        >
          <svg
            className={iconSizes}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
            />
          </svg>
        </div>
      );

    case "text":
      return (
        <div
          aria-hidden="true"
          className={`flex shrink-0 items-center justify-center border border-outline-variant bg-surface-container-high text-on-surface-variant ${sizeClasses} ${className}`}
        >
          <svg
            className={iconSizes}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 6h16M4 12h16M4 18h7"
            />
          </svg>
        </div>
      );

    default:
      return (
        <div
          aria-hidden="true"
          className={`flex shrink-0 items-center justify-center border border-outline-variant bg-surface-container text-secondary ${sizeClasses} ${className}`}
        >
          <svg
            className={iconSizes}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
        </div>
      );
  }
}
