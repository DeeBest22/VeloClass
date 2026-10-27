import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/client";

export type ClassChatRow = { class_id: string; last_kind: string | null; last_body: string | null; last_sender_name: string | null; last_at: string | null; last_mine: boolean; unread: number; pinned: boolean; muted: boolean };

const db = supabase as any;

export async function fetchClassChats() {
  const { data, error } = await db.rpc("list_class_chats");
  if (error) throw new Error("We couldn't load your chats. Please try again.");
  return (data ?? []) as ClassChatRow[];
}
export const markClassChatRead = async (classId: string) => { await db.rpc("mark_class_chat_read", { p_class_id: classId }); };
export async function setChatPref(classId: string, pinned: boolean, muted: boolean) {
  const { error } = await db.rpc("set_chat_pref", { p_class_id: classId, p_pinned: pinned, p_muted: muted });
  if (error) throw new Error("We couldn't update that chat.");
}

/* Polls every 10s and when the tab regains focus, so new messages and unread counts stay current. */
export function useClassChats() {
  const qc = useQueryClient();
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") void qc.invalidateQueries({ queryKey: ["class-chats"] }); };
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, [qc]);
  return useQuery({ queryKey: ["class-chats"], queryFn: fetchClassChats, refetchInterval: 10000 });
}

export function chatPreview(kind: string | null, body: string | null): string {
  const b = (body ?? "").trim();
  switch (kind) {
    case "text": return b;
    case "announcement": return `Announcement: ${b}`;
    case "file": return `Shared a file: ${b}`;
    case "voice": return "Voice message";
    case "sketch": return "Sketch";
    case "poll": return `Poll: ${b}`;
    case "question": return `Question: ${b}`;
    case "quiz": return `Quiz: ${b}`;
    default: return b;
  }
}
export function shortAgo(iso: string | null): string {
  if (!iso) return "";
  const s = (Date.now() - Date.parse(iso)) / 1000;
  return s < 60 ? "now" : s < 3600 ? `${Math.floor(s / 60)}m` : s < 86400 ? `${Math.floor(s / 3600)}h` : `${Math.floor(s / 86400)}d`;
}
