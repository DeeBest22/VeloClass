import { supabase } from "@/integrations/client";
import type { Question as BuilderQuestion } from "@/components/QuestionBuilder";

export type QuizSummary = { id: string; title: string; question_count: number; duration_minutes: number | null; show_answers: boolean; shuffle: boolean; closed: boolean; created_at: string; submitted_count: number; avg_pct: number | null; my_status: "none" | "started" | "done"; my_score: number | null; my_total: number | null; my_started_at: string | null };
export type QuizStart = { title: string; started_at: string; server_now: string; duration_minutes: number | null; shuffle: boolean; questions: { id: string; text: string; options: string[] }[] };
export type QuizResult = { score: number; total: number; late: boolean; title: string; review: { id: string; text: string; options: string[]; correct: number; picked: number }[] | null };
export type QuizResults = { title: string; closed: boolean; questions: BuilderQuestion[]; attempts: { user_id: string; score: number; total: number; started_at: string; submitted_at: string; late: boolean; answers: Record<string, number> }[] };

const db = supabase as any;
async function call<T>(fn: string, args: Record<string, unknown>, fallback: string) {
  const { data, error } = await db.rpc(fn, args);
  if (error) throw new Error(error.message || fallback);
  return data as T;
}
export const listQuizzes = async (classId: string) => ((await call<QuizSummary[] | null>("list_quizzes", { p_class_id: classId }, "We couldn't load quizzes.")) ?? []);
export const createQuiz = (classId: string, v: { title: string; questions: BuilderQuestion[]; minutes: number | null; showAnswers: boolean; shuffle: boolean }) =>
  call<string>("create_quiz", { p_class_id: classId, p_title: v.title, p_questions: v.questions, p_duration: v.minutes, p_show_answers: v.showAnswers, p_shuffle: v.shuffle }, "We couldn't send the quiz.");
export const startQuiz = (id: string) => call<QuizStart>("start_quiz", { p_quiz_id: id }, "We couldn't start the quiz.");
export const submitQuiz = (id: string, answers: Record<string, number>) => call<QuizResult>("submit_quiz", { p_quiz_id: id, p_answers: answers }, "We couldn't submit your answers.");
export const getQuizResult = (id: string) => call<QuizResult>("quiz_result", { p_quiz_id: id }, "We couldn't load your result.");
export const getQuizResults = (id: string) => call<QuizResults>("list_quiz_results", { p_quiz_id: id }, "We couldn't load the results.");
export const closeQuiz = (id: string) => call<null>("close_quiz", { p_quiz_id: id }, "We couldn't close the quiz.");
export const deleteQuiz = (id: string) => call<null>("delete_quiz", { p_quiz_id: id }, "We couldn't delete the quiz.");
