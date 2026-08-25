/**
 * Counts a noun without the "1 changes" that generated copy usually produces.
 *
 * The design system holds copy to the same standard as layout, and a button
 * that says "Save 1 changes" reads as unfinished software.
 */
export function count(n: number, singular: string, plural = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : plural}`
}
