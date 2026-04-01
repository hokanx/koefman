/**
 * Strips legacy "Accepted snapshot: {...}" blocks from notes.
 * These were accidentally appended during public offer acceptance.
 */
export const sanitizeNotes = (notes: string | null | undefined): string => {
  if (!notes) return '';
  // Remove the separator + snapshot block
  return notes
    .replace(/\n*---\nAccepted snapshot:\s*\{[\s\S]*\}$/m, '')
    .replace(/^Accepted snapshot:\s*\{[\s\S]*\}$/m, '')
    .trim();
};
