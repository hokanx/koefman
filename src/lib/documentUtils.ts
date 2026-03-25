/**
 * Generate a document number in the format: PREFIX-YYYY-XXX
 * e.g. ANG-2026-001, RE-2026-042
 */
export const generateDocumentNumber = (prefix: string, count: number): string => {
  const year = new Date().getFullYear();
  const seq = String(count + 1).padStart(3, '0');
  return `${prefix}${year}-${seq}`;
};
