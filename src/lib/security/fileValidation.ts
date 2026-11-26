export const ALLOWED_DOCUMENT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export const ALLOWED_DOCUMENT_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".pdf",
] as const;

export const MAX_DOCUMENT_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function isPdfFile(file: File): boolean {
  return (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

export function validateDocumentFile(file: File): string | null {
  if (!file) {
    return "Please select a file to upload.";
  }

  if (file.size === 0) {
    return "The selected file is empty. Please choose a valid image or PDF.";
  }

  if (file.size > MAX_DOCUMENT_FILE_SIZE_BYTES) {
    return `File size (${formatFileSize(file.size)}) exceeds the 10 MB limit.`;
  }

  const normalizedType = file.type.toLowerCase();
  const normalizedName = file.name.toLowerCase();

  const hasValidMime = ALLOWED_DOCUMENT_MIME_TYPES.includes(
    normalizedType as (typeof ALLOWED_DOCUMENT_MIME_TYPES)[number]
  );
  const hasValidExtension = ALLOWED_DOCUMENT_EXTENSIONS.some((ext) =>
    normalizedName.endsWith(ext)
  );

  if (!hasValidMime && !hasValidExtension) {
    return "Unsupported file format. Upload a JPG, PNG, WebP image, or PDF document.";
  }

  return null;
}
