import { supabase } from "@/integrations/client";

export type Template = "study" | "reading" | "project" | "custom";
export type JoinMode = "open" | "request" | "invite" | "assigned";
export type Settings = { class_id: string; creators: "none" | "all" | "selected"; allowed: string[]; max_groups_per_student: number | null; max_members: number | null };
export type Group = { id: string; class_id: string; name: string; description: string; template: Template; join_mode: JoinMode; max_members: number | null; created_by: string; created_at: string };
export type Member = { group_id: string; class_id: string; user_id: string; display_name: string; role: "owner" | "member"; status: "member" | "requested" | "invited"; joined_at: string };
export type Msg = { id: string; group_id: string; user_id: string; display_name: string; body: string; created_at: string; kind: "text" | "file" | "voice" | "sketch"; file_path: string | null; file_name: string | null; file_size: number | null; mime: string | null; duration: number | null };
export type Attachment = { kind: "file" | "voice" | "sketch"; path: string; name: string; size: number; mime: string; duration?: number | undefined };
export const MAX_FILE = 25 * 1024 * 1024;
export type Item = { id: string; group_id: string; kind: "resource" | "topic" | "task"; text: string; url: string | null; done: boolean; author_id: string; author_name: string; created_at: string };
export type Vote = { item_id: string; group_id: string; user_id: string };
export type Person = { id: string; name: string; role: "teacher" | "student" };

// The ws_* tables are new, so they are not in the generated types yet.
const db = supabase as any;
async function q<T>(p: PromiseLike<{ data: T; error: { message?: string } | null }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(error.message || "Something went wrong.");
  return data;
}

export const DEFAULTS = (class_id: string): Settings => ({ class_id, creators: "none", allowed: [], max_groups_per_student: null, max_members: null });
export const getSettings = async (classId: string) => (await q<Settings | null>(db.from("ws_settings").select("*").eq("class_id", classId).maybeSingle())) ?? DEFAULTS(classId);
export const saveSettings = (s: Settings) => q(db.from("ws_settings").upsert(s, { onConflict: "class_id" }));
export const listGroups = async (classId: string) => (await q<Group[]>(db.from("ws_groups").select("*").eq("class_id", classId).order("created_at", { ascending: true }))) ?? [];
export const listMembers = async (classId: string) => (await q<Member[]>(db.from("ws_members").select("*").eq("class_id", classId))) ?? [];
export const listRoster = async (classId: string): Promise<Person[]> =>
  ((await q<{ user_id: string; display_name: string; role: "teacher" | "student" }[]>(db.rpc("list_class_members", { p_class_id: classId }))) ?? []).map((m) => ({ id: m.user_id, name: m.display_name, role: m.role }));

export const createGroup = (a: { classId: string; name: string; desc: string; template: Template; mode: JoinMode; max: number | null }) =>
  q<string>(db.rpc("ws_create_group", { p_class: a.classId, p_name: a.name, p_desc: a.desc, p_template: a.template, p_join_mode: a.mode, p_max: a.max }));
export const setJoinMode = (id: string, join_mode: JoinMode) => q(db.from("ws_groups").update({ join_mode }).eq("id", id));
export const deleteGroup = (id: string) => q(db.from("ws_groups").delete().eq("id", id));
export const joinGroup = (id: string) => q(db.rpc("ws_join", { p_group: id }));
export const respond = (group: string, user: string, accept: boolean) => q(db.rpc("ws_respond", { p_group: group, p_user: user, p_accept: accept }));
export const invite = (group: string, user: string) => q(db.rpc("ws_invite", { p_group: group, p_user: user }));
export const leave = (group: string, user: string | null = null) => q(db.rpc("ws_leave", { p_group: group, p_user: user }));

export const listMessages = async (g: string) => (await q<Msg[]>(db.from("ws_messages").select("*").eq("group_id", g).order("created_at", { ascending: true }).limit(300))) ?? [];
export const sendMessage = (g: string, user_id: string, display_name: string, body: string, a?: Attachment) =>
  q(db.from("ws_messages").insert({ group_id: g, user_id, display_name, body, ...(a ? { kind: a.kind, file_path: a.path, file_name: a.name, file_size: a.size, mime: a.mime, duration: a.duration ?? null } : {}) }));
export async function uploadAttachment(groupId: string, blob: Blob, name: string) {
  const path = `${groupId}/${crypto.randomUUID()}-${name.replace(/[^a-zA-Z0-9._-]/g, "_") || "file"}`;
  const { error } = await supabase.storage.from("workspace-files").upload(path, blob, { contentType: blob.type || undefined });
  if (error) throw new Error("Couldn't upload that. Please try again.");
  return path;
}
export async function signedAttachmentUrl(path: string) {
  const { data, error } = await supabase.storage.from("workspace-files").createSignedUrl(path, 3600);
  if (error || !data) throw new Error("We couldn't open this file.");
  return data.signedUrl;
}

export const listItems = async (groups: string[], kind?: Item["kind"]) => {
  let r = db.from("ws_items").select("*").in("group_id", groups).order("created_at", { ascending: false });
  if (kind) r = r.eq("kind", kind);
  return (await q<Item[]>(r)) ?? [];
};
export const addItem = (group_id: string, kind: Item["kind"], text: string, author_id: string, author_name: string, url: string | null = null) =>
  q(db.from("ws_items").insert({ group_id, kind, text, url, author_id, author_name }));
export const setDone = (id: string, done: boolean) => q(db.from("ws_items").update({ done }).eq("id", id));
export const deleteItem = (id: string) => q(db.from("ws_items").delete().eq("id", id));
export const listVotes = async (groups: string[]) => (await q<Vote[]>(db.from("ws_votes").select("*").in("group_id", groups))) ?? [];
export const toggleVote = (item_id: string, group_id: string, user_id: string, on: boolean) =>
  on ? q(db.from("ws_votes").insert({ item_id, group_id, user_id })) : q(db.from("ws_votes").delete().eq("item_id", item_id).eq("user_id", user_id));