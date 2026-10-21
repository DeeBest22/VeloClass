import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import type { WorkType } from "@/components/WorkFloatingActionButton";
import { supabase } from "@/integrations/client";
import { isClassId } from "@/lib/classes";

/** Kept for the legacy teacher preview route; live class totals come from `useSharedWork`. */
export const CLASS_SIZE = 0;

export type Shared = {
  id: string;
  title: string;
  type: WorkType;
  due: string;
  submitted: number;
  total: number;
  status: "open" | "grading" | "done";
  dueAt: string;
  durationMinutes?: number;
  questionCount: number;
  attachmentCount: number;
  instructions?: string;
  points?: number;
  /** "all" for the whole class, otherwise the ids of the chosen students. */
  assignedTo?: "all" | string[];
};

type WorkRow = { id: string; type: "assignment" | "classwork" | "assessment"; title: string; instructions: string; due_at: string; duration_minutes: number | null; points: number | null; question_count: number; attachment_count: number; submitted_count: number; total_students: number; status: "open" | "grading" | "done" };
const workType = (type: WorkRow["type"]): WorkType => type === "assignment" ? "Assignment" : type === "classwork" ? "Classwork" : "Assessment";
const dueLabel = (dueAt: string) => {
  const due = new Date(dueAt);
  if (due <= new Date()) return `Closed ${due.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  return `Due ${due.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`;
};
async function listWork(classId: string): Promise<Shared[]> {
  const { data, error } = await supabase.rpc("list_class_work", { p_class_id: classId });
  if (error) throw new Error("We couldn't load class work. Please try again.");
  return (data as WorkRow[]).map((item) => ({ id: item.id, title: item.title, type: workType(item.type), due: dueLabel(item.due_at), dueAt: item.due_at, submitted: item.submitted_count, total: item.total_students, status: item.status, instructions: item.instructions, ...(item.duration_minutes !== null ? { durationMinutes: item.duration_minutes } : {}), questionCount: item.question_count, attachmentCount: item.attachment_count, ...(item.points !== null ? { points: item.points } : {}) }));
}
export function useSharedWork(classId: string | undefined) {
  const queryClient = useQueryClient();
  useEffect(() => {
    const refresh = (event: Event) => { if (event instanceof CustomEvent && event.detail === classId) void queryClient.invalidateQueries({ queryKey: ["class-work", classId] }); };
    window.addEventListener("class-changed", refresh); return () => window.removeEventListener("class-changed", refresh);
  }, [classId, queryClient]);
  return useQuery({ queryKey: ["class-work", classId], enabled: isClassId(classId), queryFn: () => listWork(classId as string) });
}
const questionSchema = z.object({ id: z.string(), text: z.string().trim().min(1), options: z.array(z.string().trim().min(1)).length(4), correct: z.number().int().min(0).max(3), difficulty: z.enum(["easy", "medium", "hard"]) });
const createWorkSchema = z.object({ classId: z.string().uuid(), type: z.enum(["Assignment", "Classwork", "Assessment"]), title: z.string().trim().min(1).max(80), instructions: z.string(), dueAt: z.date(), durationMinutes: z.number().int().positive().nullable(), points: z.number().int().min(1).max(1000).nullable(), questions: z.array(questionSchema).max(20), files: z.array(z.instanceof(File)).max(5, "You can attach up to 5 files.") }).superRefine((value, ctx) => { if (value.dueAt <= new Date()) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Choose a due date in the future." }); if (value.files.some((file) => file.size > 20 * 1024 * 1024)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Each attachment must be 20 MB or smaller." }); });
export type CreateWorkInput = z.infer<typeof createWorkSchema>;
export class CreateWorkError extends Error { failedFiles?: string[]; }
export async function createWork(input: CreateWorkInput): Promise<{ id: string; failedFiles: string[] }> {
  const parsed = createWorkSchema.safeParse(input); if (!parsed.success) throw new CreateWorkError(parsed.error.issues[0]?.message ?? "Check the work details and try again.");
  try {
    const value = parsed.data; const { data, error } = await supabase.rpc("create_work", { p_class_id: value.classId, p_type: value.type.toLowerCase(), p_title: value.title, p_instructions: value.instructions, p_due_at: value.dueAt.toISOString(), p_duration_minutes: value.type === "Assessment" ? value.durationMinutes : null, p_points: value.points, p_questions: value.questions });
    if (error || !data) throw error ?? new Error("No work id returned.");
    const failedFiles: string[] = [];
    await Promise.all(value.files.map(async (file, index) => { const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_") || `attachment-${index + 1}`; const path = `${value.classId}/${data}/${index + 1}-${safeName}`; const upload = await supabase.storage.from("class-work").upload(path, file, { upsert: false }); if (upload.error) { console.error("Couldn't upload work attachment", upload.error); failedFiles.push(file.name); return; } const registered = await supabase.rpc("register_work_attachment", { p_work_id: data, p_path: path, p_name: file.name, p_size: file.size, p_mime: file.type }); if (registered.error) { console.error("Couldn't register work attachment", registered.error); failedFiles.push(file.name); } }));
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("class-changed", { detail: value.classId }));
    return { id: data, failedFiles };
  } catch (error) { if (error instanceof CreateWorkError) throw error; console.error("Couldn't create class work", error); const message = (error as { message?: string }).message?.toLowerCase() ?? ""; throw new CreateWorkError(message.includes("future") ? "Choose a due date in the future." : message.includes("teacher") ? "Only teachers can share work in this class." : message.includes("archived") ? "Unarchive this class before sharing work." : message.includes("network") || message.includes("fetch") ? "Can't reach the server. Check your connection and try again." : "We couldn't share this work. Please try again."); }
}
