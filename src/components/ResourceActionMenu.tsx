import { Download, MoreHorizontal, Pencil, Trash2, UserRoundX } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { deleteClassResource, downloadClassFile, hideClassFile, renameClassResource } from "@/lib/class-files";

export function ResourceActionMenu({ classId, id, kind, name, path, isTeacher }: { classId: string; id: string; kind: "file" | "folder"; name: string; path?: string; isTeacher: boolean }) {
  const [open, setOpen] = useState(false);
  const stop = (event: React.MouseEvent) => event.stopPropagation();
  const run = async (action: () => Promise<void>) => { try { await action(); setOpen(false); } catch (error) { toast.error(error instanceof Error ? error.message : "Something went wrong."); } };
  return <div className="relative" onClick={stop}>
    <button type="button" onClick={() => setOpen((value) => !value)} className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground/70 hover:bg-black/[0.04]" aria-label={`Actions for ${name}`}><MoreHorizontal className="h-5 w-5" /></button>
    {open && <div className="absolute right-0 top-9 z-20 w-40 overflow-hidden rounded-xl border border-black/10 bg-white p-1 shadow-lg">
      {kind === "file" && path && <button type="button" onClick={() => void run(() => downloadClassFile(path))} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium hover:bg-black/[0.04]"><Download className="h-3.5 w-3.5" />Download</button>}
      {isTeacher && <button type="button" onClick={() => { const next = window.prompt(`Rename ${kind}`, name); if (next?.trim()) void run(() => renameClassResource(classId, id, kind, next.trim())); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium hover:bg-black/[0.04]"><Pencil className="h-3.5 w-3.5" />Rename</button>}
      {kind === "file" && <button type="button" onClick={() => void run(() => hideClassFile(classId, id))} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium hover:bg-black/[0.04]"><UserRoundX className="h-3.5 w-3.5" />Delete for me</button>}
      {isTeacher && <button type="button" onClick={() => { if (window.confirm(`Delete ${name} for everyone in this course?`)) void run(() => deleteClassResource(classId, id, kind)); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" />Delete</button>}
    </div>}
  </div>;
}
