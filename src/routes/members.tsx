import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { isClassId, removeMember, useClassMembers, useClassOverview } from "@/lib/classes";

export const Route = createFileRoute("/members")({
  validateSearch: (search: Record<string, unknown>): { classId?: string } => {
    const classId = search["classId"];
    return typeof classId === "string" ? { classId } : {};
  },
  component: MembersPage,
});

function MembersPage() {
  const router = useRouter();
  const { classId } = Route.useSearch();
  const overview = useClassOverview(classId);
  const members = useClassMembers(classId);
  const [removing, setRemoving] = useState<string | null>(null);
  const remove = async (userId: string) => { if (!classId) return; setRemoving(userId); try { await removeMember(classId, userId); } finally { setRemoving(null); } };
  if (!isClassId(classId) || overview.data === null || overview.isError) return <Page><p>Class not found or you don't have access.</p><Link to="/join">Join a class</Link></Page>;
  if (overview.isPending || members.isPending) return <Page><div className="h-16 animate-pulse rounded-2xl bg-slate-100" /></Page>;
  const students = members.data?.filter((member) => member.role === "student") ?? [];
  return <main className="min-h-screen bg-background"><div className="mx-auto w-full max-w-md px-4 pb-12 pt-5"><header className="flex items-center gap-3"><button onClick={() => router.history.back()} className="grid h-10 w-10 place-items-center rounded-full bg-white shadow-[var(--shadow-card)]"><ArrowLeft className="h-4 w-4" /></button><h1 className="text-lg font-bold">Members</h1></header><div className="mt-6 space-y-3">{members.data?.map((member) => <div key={member.userId} className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white p-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-sm font-bold">{member.displayName.slice(0, 1).toUpperCase()}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{member.displayName}{member.isMe ? " (you)" : ""}</p><span className="text-xs text-slate-400">{member.role === "teacher" ? "Teacher" : "Student"}</span></div>{overview.data?.myRole === "teacher" && member.role === "student" && !member.isMe && <button disabled={removing === member.userId} onClick={() => void remove(member.userId)} className="text-xs font-semibold text-course-red">{removing === member.userId ? "Removing…" : "Remove"}</button>}</div>)}{students.length === 0 && <p className="rounded-2xl border border-dashed border-black/10 px-4 py-8 text-center text-sm text-slate-400">No students yet. Share your join code.</p>}</div></div></main>;
}

function Page({ children }: { children: React.ReactNode }) { return <main className="flex min-h-screen items-center justify-center bg-background p-4"><div className="rounded-2xl border border-black/10 bg-white p-6 text-center text-sm text-slate-500">{children}</div></main>; }
