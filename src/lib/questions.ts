import { supabase } from "@/integrations/client";

export type Question = { id: string; asker_id: string | null; anonymous: boolean; private: boolean; body: string; accepted_answer_id: string | null; created_at: string; me_too: number; i_me_too: boolean; answer_count: number; mine: boolean };
export type Answer = { id: string; question_id: string; author_id: string; body: string; created_at: string; helpful: number; i_helpful: boolean; by_teacher: boolean };

const db = supabase as any;
async function call(fn: string, args: Record<string, unknown>, fallback: string) {
  const { data, error } = await db.rpc(fn, args);
  if (error) throw new Error(error.message || fallback);
  return data;
}
export const listQuestions = async (classId: string) => ((await call("list_questions", { p_class_id: classId }, "We couldn't load questions.")) ?? []) as Question[];
export const listAnswers = async (classId: string) => ((await call("list_answers", { p_class_id: classId }, "We couldn't load answers.")) ?? []) as Answer[];
export const askQuestion = (classId: string, body: string, isPrivate: boolean, anonymous: boolean) => call("ask_question", { p_class_id: classId, p_body: body, p_private: isPrivate, p_anonymous: anonymous }, "We couldn't send your question.");
export const answerQuestion = (questionId: string, body: string) => call("answer_question", { p_question_id: questionId, p_body: body }, "We couldn't post your answer.");
export const toggleMeToo = (questionId: string) => call("toggle_me_too", { p_question_id: questionId }, "Something went wrong.");
export const toggleHelpful = (answerId: string) => call("toggle_helpful", { p_answer_id: answerId }, "Something went wrong.");
export const acceptAnswer = (questionId: string, answerId: string | null) => call("accept_answer", { p_question_id: questionId, p_answer_id: answerId }, "Something went wrong.");
export const deleteQuestion = (questionId: string) => call("delete_question", { p_question_id: questionId }, "We couldn't delete this question.");
