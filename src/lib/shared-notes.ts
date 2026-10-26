import { supabase } from "@/integrations/client";

export type SharedBlock = { id: string; type: "heading" | "text" | "bullet" | "todo"; text: string; done: boolean };
export type SharedNote = {
  id: string;
  note_id: string;
  owner_id: string;
  owner_name: string | null;
  class_id: string;
  title: string;
  blocks: SharedBlock[];
  recipients: string[];
  updated_at: string;
};

// The shared_notes table is new, so it isn't in the generated types yet.
const table = () => (supabase as any).from("shared_notes");

export async function getMyShare(noteId: string, ownerId: string) {
  const { data, error } = await table().select("*").eq("note_id", noteId).eq("owner_id", ownerId).maybeSingle();
  if (error) throw new Error("We couldn't check sharing.");
  return (data ?? null) as SharedNote | null;
}

export async function upsertShare(row: Pick<SharedNote, "note_id" | "owner_id" | "owner_name" | "class_id" | "title" | "blocks" | "recipients">) {
  const { error } = await table().upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: "owner_id,note_id" });
  if (error) throw new Error("We couldn't share this note.");
}

export async function removeShare(noteId: string, ownerId: string) {
  const { error } = await table().delete().eq("note_id", noteId).eq("owner_id", ownerId);
  if (error) throw new Error("We couldn't stop sharing.");
}

export async function listSharedWithMe(userId: string, classId?: string) {
  let q = table().select("*").contains("recipients", [userId]).order("updated_at", { ascending: false });
  if (classId) q = q.eq("class_id", classId);
  const { data, error } = await q;
  if (error) throw new Error("We couldn't load shared notes.");
  return (data ?? []) as SharedNote[];
}
