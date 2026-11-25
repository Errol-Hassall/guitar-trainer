/** A step is unlocked when it has no prerequisite, or that one is complete. */
export function isStepUnlocked(
  requiresStepId: number | null,
  completedStepIds: Set<number>,
): boolean {
  return requiresStepId === null || completedStepIds.has(requiresStepId)
}
