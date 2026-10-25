import { supabase } from "@/integrations/client";

export type ShowResults = "live" | "after_vote" | "after_close";
export type Poll = { id: string; question: string; options: string[]; multiple: boolean; show_results: ShowResults; allow_change: boolean; closes_at: string | null; closed: boolean; created_at: string; counts: number[] | null; total_voters: number; my_votes: number[] };
export type NewPoll = { question: string; options: string[]; multiple: boolean; showResults: ShowResults; allowChange: boolean; minutes: number };

const db = supabase as any;
const fail = (e: { message?: string }, fallback: string) => new Error(e.message || fallback);

export async function listPolls(classId: string) {
  const { data, error } = await db.rpc("list_polls", { p_class_id: classId });
  if (error) throw fail(error, "We couldn't load polls.");
  return (data ?? []) as Poll[];
}
export async function createPoll(classId: string, p: NewPoll) {
  const { error } = await db.rpc("create_poll", { p_class_id: classId, p_question: p.question, p_options: p.options, p_multiple: p.multiple, p_show_results: p.showResults, p_allow_change: p.allowChange, p_minutes: p.minutes });
  if (error) throw fail(error, "We couldn't create the poll.");
}
export async function votePoll(pollId: string, options: number[]) {
  const { error } = await db.rpc("vote_poll", { p_poll_id: pollId, p_options: options });
  if (error) throw fail(error, "We couldn't record your vote.");
}
export async function closePoll(pollId: string) {
  const { error } = await db.rpc("close_poll", { p_poll_id: pollId });
  if (error) throw fail(error, "We couldn't close the poll.");
}
