/**
 * Number of sorting circles on a mat. Each layout is calibrated to fit A4
 * portrait (21 × 29.7 cm) with circles big enough to hold sorted items.
 */
export type SortingMatCount = 2 | 3 | 4;

export interface SortingMatConfig {
  /** Optional title printed at the top of the mat (e.g. "Sort by Sound"). */
  title: string;
  /** How many sorting circles on the mat. */
  count: SortingMatCount;
  /** Per-circle label text. Length always equals `count`. */
  labels: string[];
  /** Hex border colour for every circle. */
  borderColor: string;
  /** CSS font-family string applied to label text. */
  fontFamily: string;
}
