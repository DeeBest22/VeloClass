import { z } from "zod";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/client";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export const createClassInputSchema = z
  .object({
    name: z.string().trim().min(1, "Give this class a name before continuing.").max(120),
    courseCode: z.string().trim().min(1, "A class code is required.").max(60),
    description: z.string().trim().max(2000).nullable(),
    department: z.string().trim().max(200).nullable(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    scheduleDays: z.array(z.enum(days)).max(7).nullable(),
    scheduleTime: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
    displayName: z.string().trim().max(120).nullable(),
  })
  .superRefine((value, ctx) => {
    if ((value.scheduleDays === null) !== (value.scheduleTime === null)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Complete the schedule or skip it." });
    }
  });

export type CreateClassInput = z.infer<typeof createClassInputSchema>;

export class CreateClassError extends Error {}
export class JoinClassError extends Error {}

function notifyMyClassesChanged(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("my-classes-changed"));
}

function notifyClassChanged(classId: string): void {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("class-changed", { detail: classId }));
}

function friendlyCreateClassError(error: { code?: string; message?: string }): string {
  const message = error.message?.toLowerCase() ?? "";
  if (error.code === "28000") return "Please sign in again before creating a class.";
  if (message.includes("class name is required")) return "Give this class a name before continuing.";
  if (message.includes("class code is required")) return "A class code is required.";
  if (message.includes("too long") || message.includes("not valid")) {
    return "Please check the class details and try again.";
  }
  if (message.includes("failed to fetch") || message.includes("network") || message.includes("load failed")) {
    return "Can't reach the server. Check your connection and try again.";
  }
  return "We couldn't create your class. Please try again.";
}

export async function createClass(input: CreateClassInput): Promise<{ id: string; joinCode: string }> {
  const parsed = createClassInputSchema.safeParse(input);
  if (!parsed.success) throw new CreateClassError(parsed.error.issues[0]?.message ?? "Please check the class details.");

  try {
    const { data, error } = await supabase.rpc("create_class", {
      p_name: parsed.data.name,
      p_course_code: parsed.data.courseCode,
      p_description: parsed.data.description,
      p_department: parsed.data.department,
      p_color: parsed.data.color,
      p_schedule_days: parsed.data.scheduleDays,
      p_schedule_time: parsed.data.scheduleTime,
      p_display_name: parsed.data.displayName,
    });
    if (error) throw error;

    const result = data[0];
    if (!result?.id || !result.join_code) throw new Error("The server returned an incomplete class.");
    notifyMyClassesChanged();
    return { id: result.id, joinCode: result.join_code };
  } catch (error) {
    if (error instanceof CreateClassError) throw error;
    const safeError = error as { code?: string; message?: string };
    throw new CreateClassError(friendlyCreateClassError(safeError));
  }
}

function friendlyJoinClassError(error: { code?: string; message?: string }): string {
  const message = error.message?.toLowerCase() ?? "";
  if (error.code === "28000") return "Please sign in again before joining a class.";
  if (message.includes("failed to fetch") || message.includes("network") || message.includes("load failed")) {
    return "Can't reach the server. Check your connection and try again.";
  }
  return "We couldn't join this class. Please try again.";
}

export async function joinClass(code: string): Promise<{
  id: string;
  name: string;
  color: string;
  alreadyMember: boolean;
}> {
  try {
    const { data, error } = await supabase.rpc("join_class", { p_code: code });
    if (error) throw error;

    const result = data[0];
    switch (result?.error_code) {
      case "invalid_code":
        throw new JoinClassError("That class code isn't valid. Check it and try again.");
      case "archived":
        throw new JoinClassError("This class is not accepting students.");
      case "rate_limited":
        throw new JoinClassError("Too many attempts. Try again in a few minutes.");
    }
    if (!result?.id || !result.name || !result.color) {
      throw new Error("The server returned an incomplete class.");
    }
    const joined = {
      id: result.id,
      name: result.name,
      color: result.color,
      alreadyMember: result.already_member,
    };
    notifyMyClassesChanged();
    return joined;
  } catch (error) {
    if (error instanceof JoinClassError) throw error;
    throw new JoinClassError(friendlyJoinClassError(error as { code?: string; message?: string }));
  }
}

export type ClassOverview = {
  id: string;
  name: string;
  courseCode: string;
  description: string | null;
  department: string | null;
  color: string;
  scheduleDays: string[] | null;
  scheduleTime: string | null;
  archived: boolean;
  teacherName: string;
  studentCount: number;
  myRole: "teacher" | "student";
  joinCode: string | null;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isClassId(value: string | undefined): value is string {
  return typeof value === "string" && uuidPattern.test(value);
}

async function fetchClassOverview(classId: string): Promise<ClassOverview | null> {
  const { data, error } = await supabase.rpc("get_class_overview", { p_class_id: classId });
  if (error) throw new Error("We couldn't load this class. Please try again.");

  const result = data[0];
  if (!result) return null;
  return {
    id: result.id,
    name: result.name,
    courseCode: result.course_code,
    description: result.description,
    department: result.department,
    color: result.color,
    scheduleDays: result.schedule_days,
    scheduleTime: result.schedule_time,
    archived: result.archived,
    teacherName: result.teacher_name ?? "Teacher",
    studentCount: result.student_count,
    myRole: result.my_role,
    joinCode: result.join_code,
  };
}

export function useClassOverview(classId: string | undefined) {
  const queryClient = useQueryClient();
  useEffect(() => {
    const refresh = (event: Event) => {
      if (event instanceof CustomEvent && event.detail === classId) void queryClient.invalidateQueries({ queryKey: ["class-overview", classId] });
    };
    window.addEventListener("class-changed", refresh);
    return () => window.removeEventListener("class-changed", refresh);
  }, [classId, queryClient]);
  return useQuery({
    queryKey: ["class-overview", classId],
    queryFn: () => fetchClassOverview(classId as string),
    enabled: isClassId(classId),
  });
}

export function formatSchedule(days: string[] | null, time: string | null): string | null {
  if (!days?.length || !time) return null;
  const [hoursText, minutes] = time.split(":");
  const hours = Number(hoursText);
  if (!Number.isInteger(hours) || !minutes || hours < 0 || hours > 23) return null;
  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  const dayText = days.length === 1 ? days[0] : days.length === 2 ? `${days[0]} & ${days[1]}` : `${days.slice(0, -1).join(", ")} & ${days[days.length - 1]}`;
  return `${dayText} · ${displayHours}:${minutes} ${suffix}`;
}

const lastOpenedClassKey = (userId: string) => `last-opened-class:${userId}`;

export function getLastOpenedClassId(userId: string | undefined): string | null {
  if (!userId) return null;
  try {
    return window.localStorage.getItem(lastOpenedClassKey(userId));
  } catch {
    return null;
  }
}

export function setLastOpenedClassId(userId: string | undefined, classId: string): void {
  if (!userId) return;
  try {
    window.localStorage.setItem(lastOpenedClassKey(userId), classId);
  } catch {
    /* local storage may be unavailable */
  }
}

export type MyClass = {
  id: string;
  name: string;
  courseCode: string;
  department: string | null;
  color: string;
  scheduleDays: string[] | null;
  scheduleTime: string | null;
  archived: boolean;
  myRole: "teacher" | "student";
  studentCount: number;
  teacherName: string | null;
  joinedAt: string;
  createdAt: string;
};

async function fetchMyClasses(): Promise<MyClass[]> {
  const { data, error } = await supabase.rpc("list_my_classes");
  if (error) throw new Error("We couldn't load your classes. Please try again.");
  return data.map((item) => ({
    id: item.id,
    name: item.name,
    courseCode: item.course_code,
    department: item.department,
    color: item.color,
    scheduleDays: item.schedule_days,
    scheduleTime: item.schedule_time,
    archived: item.archived,
    myRole: item.my_role,
    studentCount: item.student_count,
    teacherName: item.teacher_name,
    joinedAt: item.joined_at,
    createdAt: item.created_at,
  }));
}

export function useMyClasses() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const refresh = () => void queryClient.invalidateQueries({ queryKey: ["my-classes"] });
    window.addEventListener("my-classes-changed", refresh);
    return () => window.removeEventListener("my-classes-changed", refresh);
  }, [queryClient]);
  return useQuery({ queryKey: ["my-classes"], queryFn: fetchMyClasses });
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = /^#[0-9a-f]{6}$/i.test(hex) ? hex.slice(1) : "6C63FF";
  return [0, 2, 4].map((index) => Number.parseInt(normalized.slice(index, index + 2), 16)) as [number, number, number];
}

function blend([red, green, blue]: [number, number, number], target: [number, number, number], amount: number): string {
  const channel = (value: number, targetValue: number) => Math.round(value + (targetValue - value) * amount);
  return `rgb(${channel(red, target[0])}, ${channel(green, target[1])}, ${channel(blue, target[2])})`;
}

export function classTint(hex: string): { bg: string; ink: string; accent: string; track: string } {
  const rgb = hexToRgb(hex);
  return {
    bg: blend(rgb, [255, 255, 255], 0.73),
    ink: blend(rgb, [20, 22, 31], 0.68),
    accent: blend(rgb, [20, 22, 31], 0.28),
    track: `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.2)`,
  };
}

export function roleLabel(role: "teacher" | "student"): "Teaching" | "Enrolled" {
  return role === "teacher" ? "Teaching" : "Enrolled";
}

export type ClassMember = { userId: string; displayName: string; role: "teacher" | "student"; joinedAt: string; isMe: boolean };

async function runClassMutation<T>(action: () => PromiseLike<{ data: T; error: { code?: string; message?: string } | null }>, classId: string): Promise<T> {
  const { data, error } = await action();
  if (error) {
    const message = error.message?.toLowerCase() ?? "";
    if (message.includes("only teachers") || message.includes("only the class owner")) throw new Error("You don't have permission to do that.");
    throw new Error("We couldn't update this class. Please try again.");
  }
  notifyMyClassesChanged(); notifyClassChanged(classId);
  return data;
}

export function updateClass(classId: string, input: CreateClassInput) {
  return runClassMutation(() => supabase.rpc("update_class", { p_class_id: classId, p_name: input.name, p_course_code: input.courseCode, p_description: input.description, p_department: input.department, p_color: input.color, p_schedule_days: input.scheduleDays, p_schedule_time: input.scheduleTime }), classId);
}
export function regenerateJoinCode(classId: string) { return runClassMutation(() => supabase.rpc("regenerate_join_code", { p_class_id: classId }), classId); }
export function setClassArchived(classId: string, archived: boolean) { return runClassMutation(() => supabase.rpc("set_class_archived", { p_class_id: classId, p_archived: archived }), classId); }
export function deleteClass(classId: string) { return runClassMutation(() => supabase.rpc("delete_class", { p_class_id: classId }), classId); }
export function leaveClass(classId: string) { return runClassMutation(() => supabase.rpc("leave_class", { p_class_id: classId }), classId); }
export function removeMember(classId: string, userId: string) { return runClassMutation(() => supabase.rpc("remove_member", { p_class_id: classId, p_user_id: userId }), classId); }

export function useClassMembers(classId: string | undefined) {
  const queryClient = useQueryClient();
  useEffect(() => {
    const refresh = (event: Event) => {
      if (event instanceof CustomEvent && event.detail === classId) void queryClient.invalidateQueries({ queryKey: ["class-members", classId] });
    };
    window.addEventListener("class-changed", refresh);
    return () => window.removeEventListener("class-changed", refresh);
  }, [classId, queryClient]);
  return useQuery({
    queryKey: ["class-members", classId],
    enabled: isClassId(classId),
    queryFn: async (): Promise<ClassMember[]> => {
      const { data, error } = await supabase.rpc("list_class_members", { p_class_id: classId as string });
      if (error) throw new Error("We couldn't load class members.");
      return data.map((member) => ({ userId: member.user_id, displayName: member.display_name, role: member.role, joinedAt: member.joined_at, isMe: member.is_me }));
    },
  });
}
