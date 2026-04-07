// Document file extension detection.
// Used to fall back to message_type='image' on the storage side
// (for compatibility with the existing story_message_history CHECK constraint
// that may not yet include 'document') while still rendering documents
// correctly on the read side based on the actual filename extension.

export const DOC_EXTENSIONS = new Set([
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'txt', 'csv', 'rtf', 'odt', 'ods', 'odp', 'zip', 'epub',
]);

export function isDocumentFilename(filename: string | null | undefined): boolean {
  if (!filename) return false;
  const ext = filename.split('.').pop()?.toLowerCase();
  return !!ext && DOC_EXTENSIONS.has(ext);
}

// Given a stored message_type and filename, return the effective render type.
// This lets the send route store documents under any allowed type (e.g. 'image')
// while readers still treat them as documents.
export function effectiveMessageType(
  storedType: string | null | undefined,
  filename: string | null | undefined,
): string {
  if (storedType === 'document') return 'document';
  if (isDocumentFilename(filename)) return 'document';
  return storedType || 'text';
}
