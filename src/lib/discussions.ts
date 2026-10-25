import { supabase } from "@/integrations/client";
import type { LiveMessage } from "@/lib/live-class";

export async function getDiscussionMessages(classId: string) {
  const { data, error } = await (supabase as any).rpc("list_discussion_messages", { p_class_id: classId });
  if (error) throw new Error("We couldn't load the discussion.");
  return (data ?? []) as LiveMessage[];
}

export async function postDiscussionMessage(classId: string, v: Partial<LiveMessage> & { kind: LiveMessage["kind"] }) {
  const { error } = await (supabase as any).rpc("post_discussion_message", { p_class_id: classId, p_kind: v.kind, p_body: v.body ?? null, p_title: v.title ?? null, p_important: v.important ?? false, p_storage_path: v.storage_path ?? null, p_file_name: v.file_name ?? null, p_file_size: v.file_size ?? null, p_mime_type: v.mime_type ?? null });
  if (error) throw new Error(error.message || "We couldn't send that message.");
}
