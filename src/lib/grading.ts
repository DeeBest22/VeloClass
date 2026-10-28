import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/client";

export type KeyQuestion = { qid: string; qposition: number; qtext: string; options: string[]; correct_index: number; difficulty: string };
export type Grade = { submission_id: string; student_id: string | null; score: number; feedback: string | null; graded_at: string };

const db = supabase as any;
async function call<T>(fn: string, args: Record<string, unknown>, fallback: string) {
  const { data, error } = await db.rpc(fn, args);
  if (error) throw new Error(error.message || fallback);
  return data as T;
}

export function useAnswerKey(workId: string | undefined) {
  return useQuery({ queryKey: ["work-key", workId], enabled: !!workId, retry: false, queryFn: async () => ((await call<any[] | null>("get_work_answer_key", { p_work_id: workId }, "We couldn't load the answer key.")) ?? []).map((q): KeyQuestion => ({ ...q, qid: String(q.qid), correct_index: Number(q.correct_index), options: Array.isArray(q.options) ? q.options : [] })) });
}
export function useWorkGrades(workId: string | undefined) {
  return useQuery({ queryKey: ["work-grades", workId], enabled: !!workId, retry: false, queryFn: async () => ((await call<Grade[] | null>("list_work_grades", { p_work_id: workId }, "We couldn't load grades.")) ?? []).map((g) => ({ ...g, score: Number(g.score) })) });
}
export function useGradeActions(workId: string) {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ["work-grades", workId] });
  return {
    save: async (submissionId: string, studentId: string | null, score: number, feedback: string) => {
      await call<null>("save_work_grade", { p_submission_id: submissionId, p_work_id: workId, p_student_id: studentId, p_score: score, p_feedback: feedback }, "We couldn't save the grade.");
      await refresh();
    },
    clear: async (submissionId: string) => { await call<null>("clear_work_grade", { p_submission_id: submissionId }, "We couldn't reset the grade."); await refresh(); },
  };
}

/* Quiz-style work is stored as {"answers":{questionId: optionIndex}} (-1 = skipped). */
export function parseAnswers(body: string | null | undefined): Record<string, number> | null {
  try {
    const v = JSON.parse(body ?? "");
    if (v && typeof v === "object" && v.answers && typeof v.answers === "object") return v.answers as Record<string, number>;
  } catch { /* plain text response */ }
  return null;
}
/* Marks answers against the key. Each question is worth max / number of questions. */
export function autoMark(answers: Record<string, number>, key: KeyQuestion[], max: number) {
  const correct = key.filter((q) => answers[q.qid] === q.correct_index).length;
  const answered = key.filter((q) => typeof answers[q.qid] === "number" && answers[q.qid]! >= 0).length;
  return { correct, answered, n: key.length, score: key.length ? Math.round((correct * max / key.length) * 100) / 100 : 0 };
}