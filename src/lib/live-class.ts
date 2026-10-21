import { supabase } from "@/integrations/client";

export type LiveMessage = { id: string; sender_id: string; sender_name: string; sender_role: "teacher" | "student"; kind: "text" | "announcement" | "file" | "voice" | "sketch"; body: string | null; title: string | null; important: boolean; storage_path: string | null; file_name: string | null; file_size: number | null; mime_type: string | null; created_at: string };
export type LiveMember = { id: string; name: string; role: "teacher" | "student"; avatar_url: string | null };

export async function getLiveMembers(classId: string) {
  const { data, error } = await (supabase as any).rpc("list_live_class_members", { p_class_id: classId });
  if (error) throw new Error("We couldn't load class members.");
  return (data ?? []) as LiveMember[];
}

export async function getLiveMessages(classId: string) {
  const { data, error } = await (supabase as any).rpc("list_live_class_messages", { p_class_id: classId });
  if (error) throw new Error("We couldn't load the live-class messages.");
  return (data ?? []) as LiveMessage[];
}

export async function postLiveMessage(classId: string, values: Partial<LiveMessage> & { kind: LiveMessage["kind"] }) {
  const { error } = await (supabase as any).rpc("post_live_class_message", { p_class_id: classId, p_kind: values.kind, p_body: values.body ?? null, p_title: values.title ?? null, p_important: values.important ?? false, p_storage_path: values.storage_path ?? null, p_file_name: values.file_name ?? null, p_file_size: values.file_size ?? null, p_mime_type: values.mime_type ?? null });
  if (error) throw new Error(error.message || "We couldn't send that message.");
}

export async function uploadLiveFile(classId: string, file: Blob, name: string, mime = file.type) {
  const safeName = name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${classId}/live/${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase.storage.from("class-files").upload(path, file, { contentType: mime || undefined });
  if (error) throw new Error(`Couldn't upload ${name}.`);
  return path;
}

export async function liveFileUrl(path: string) {
  const { data, error } = await supabase.storage.from("class-files").createSignedUrl(path, 60 * 30);
  if (error || !data) throw new Error("Couldn't open this shared file.");
  return data.signedUrl;
}
