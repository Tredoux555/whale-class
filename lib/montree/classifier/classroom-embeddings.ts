import { getSupabase } from "@/lib/supabase-client";

/**
 * Classroom onboarding status cache.
 * Maps classroomId to { timestamp, status }
 * TTL: 5 minutes
 */
const onboardingStatusCache = new Map<
  string,
  { timestamp: number; status: OnboardingStatus }
>();

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const ONBOARDING_COVERAGE_THRESHOLD =
  parseFloat(process.env.ONBOARDING_COVERAGE_THRESHOLD || "0.30");

export interface OnboardingStatus {
  isOnboarding: boolean;
  coveragePercent: number;
  vmCount: number;
  curriculumCount: number;
}

/**
 * Gets the classroom onboarding status.
 * A classroom is "onboarding" if the teacher has learned fewer than ONBOARDING_COVERAGE_THRESHOLD (default 30%) of the curriculum.
 *
 * @param classroomId The classroom ID
 * @returns OnboardingStatus with visual memory count, curriculum count, and coverage percent
 */
export async function getClassroomOnboardingStatus(
  classroomId: string
): Promise<OnboardingStatus> {
  // Check cache
  const cached = onboardingStatusCache.get(classroomId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.status;
  }

  const supabase = getSupabase();

  // Parallel queries for visual memory distinct work count and curriculum count
  // Note: Supabase JS client doesn't support COUNT(DISTINCT), so we fetch work_keys and dedupe
  const [vmResult, curriculumResult] = await Promise.all([
    supabase
      .from("montree_visual_memory")
      .select("work_key")
      .eq("classroom_id", classroomId),
    supabase
      .from("montree_classroom_curriculum_works")
      .select("id", { count: "exact", head: true })
      .eq("classroom_id", classroomId),
  ]);

  // Distinct work_key count (visual memory can have duplicates for same work)
  const distinctWorkKeys = new Set(
    (vmResult.data || []).map((r) => r.work_key).filter(Boolean)
  );
  const vmCount = distinctWorkKeys.size;
  const curriculumCount = curriculumResult.count ?? 0;

  // Calculate coverage: what percent of curriculum has been learned
  const coveragePercent = curriculumCount > 0 ? vmCount / curriculumCount : 0;

  // Onboarding threshold: if coverage is below threshold, still onboarding
  // But if classroom has NO curriculum works at all, it's not onboarding — it's uninitialized
  const isOnboarding = curriculumCount > 0 && coveragePercent < ONBOARDING_COVERAGE_THRESHOLD;

  const status: OnboardingStatus = {
    isOnboarding,
    coveragePercent: Math.round(coveragePercent * 100) / 100, // Round to 2 decimal places
    vmCount,
    curriculumCount,
  };

  // Cache the result
  onboardingStatusCache.set(classroomId, {
    timestamp: Date.now(),
    status,
  });

  return status;
}

/**
 * Invalidate the onboarding status cache for a classroom.
 * Call this after writing to visual_memory table.
 *
 * @param classroomId The classroom ID to invalidate
 */
export function invalidateOnboardingCache(classroomId: string): void {
  onboardingStatusCache.delete(classroomId);
}

/**
 * Clear all onboarding status caches.
 * Useful for testing or forced refresh.
 */
export function clearOnboardingCache(): void {
  onboardingStatusCache.clear();
}
