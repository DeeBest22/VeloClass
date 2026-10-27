import { supabase } from "@/integrations/client";

export type RosterRow = { user_id: string; joined_at: string; n_msgs: number; n_questions: number; n_answers: number; n_polls: number; n_quizzes: number; quiz_avg: number; last_active: string | null };
const db = supabase as any;

export async function fetchRoster(classId: string) {
  const { data, error } = await db.rpc("class_roster", { p_class_id: classId });
  if (error) throw new Error(error.message || "We couldn't load class activity.");
  return (data ?? []) as RosterRow[];
}
export async function removeStudents(classId: string, userIds: string[]) {
  const { data, error } = await db.rpc("class_remove_members", { p_class_id: classId, p_user_ids: userIds });
  if (error) throw new Error(error.message || "We couldn't remove those students.");
  window.dispatchEvent(new CustomEvent("class-changed", { detail: classId }));
  window.dispatchEvent(new Event("my-classes-changed"));
  return data as number;
}
