// Cross-device progress for signed-in, approved learners.
//
// localStorage stays the live store on every device. The cloud row
// (public.user_progress) is one more snapshot folded in with the same
// per-entry `mergeProgress`, so a device that was offline, or used before the
// learner signed up, never loses anything when it syncs.

import type { SupabaseClient } from "@supabase/supabase-js";
import { mergeProgress, normalize, type ProgressData } from "@/lib/progress";

const TABLE = "user_progress";

export async function fetchCloudProgress(supabase: SupabaseClient, userId: string): Promise<ProgressData | null> {
  const { data, error } = await supabase.from(TABLE).select("data").eq("user_id", userId).maybeSingle();

  if (error) throw error;

  return data?.data ? normalize(data.data) : null;
}

async function writeCloudProgress(supabase: SupabaseClient, userId: string, data: ProgressData): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .upsert({ user_id: userId, data, updated_at: new Date().toISOString() }, { onConflict: "user_id" });

  if (error) throw error;
}

/**
 * Push this device's progress. In "merge" mode the cloud copy is re-read and
 * folded in first, so another device's writes since our last sync survive;
 * the merged result is returned for the caller to adopt locally. "replace"
 * (import / reset) writes the snapshot verbatim.
 */
export async function pushCloudProgress(
  supabase: SupabaseClient,
  userId: string,
  local: ProgressData,
  mode: "merge" | "replace" = "merge"
): Promise<ProgressData> {
  if (mode === "replace") {
    await writeCloudProgress(supabase, userId, local);

    return local;
  }

  const remote = await fetchCloudProgress(supabase, userId);
  // Local goes last so this device wins ties, as with the file snapshot.
  const merged = remote ? mergeProgress(remote, local) : local;

  if (!remote || JSON.stringify(remote) !== JSON.stringify(merged)) {
    await writeCloudProgress(supabase, userId, merged);
  }

  return merged;
}
