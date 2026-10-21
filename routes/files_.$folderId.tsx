import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, FileText, Search, SlidersHorizontal, Video } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import folderTileAsset from "@/assets/file_icon.png";
import { Button } from "@/components/ui/button";
import FileFloatingActionButton from "@/components/FileFloatingActionButton";
import { ResourceActionMenu } from "@/components/ResourceActionMenu";
import { createClassFolder, openClassFile, uploadClassFile, useClassResources } from "@/lib/class-files";
import { useClassOverview } from "@/lib/classes";

export const Route = createFileRoute("/files_/$folderId")({
  validateSearch: (search: Record<string, unknown>): { classId?: string; folderName?: string } => ({
    classId: typeof search.classId === "string" ? search.classId : undefined,
    folderName: typeof search.folderName === "string" ? search.folderName : undefined,
  }),
  head: ({ params }) => {
    const title = formatFolderTitle(params.folderId);
    return {
      meta: [
        { title: `${title} · MCE 201 Course Files` },
        {
          name: "description",
          content: `Folders, images, and videos inside ${title} for MCE 201.`,
        },
        { property: "og:title", content: `${title} · MCE 201 Course Files` },
        {
          property: "og:description",
          content: `Folders, images, and videos inside ${title} for MCE 201.`,
        },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: FolderDetail,
});

type Subfolder = {
  id: string;
  title: string;
  files: string;
  size: string;
  faded: boolean;
};

const PARENT_LABEL = "My Folder";

// A route param like "lecture-notes-1758..." -> "Lecture Notes" for display
// (the trailing timestamp segment added by slugify() is dropped).
function formatFolderTitle(id: string): string {
  const words = id.split("-").filter((part) => Number.isNaN(Number(part)));
  const label = words.length > 0 ? words : [id];
  return label.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

function EllipsisIcon({ className }: { className?: string }) {
  // Custom instead of lucide's Ellipsis — needs bolder, more widely-spaced
  // dots than that icon's fixed proportions allow.
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <circle cx="3" cy="10" r="2" fill="currentColor" />
      <circle cx="10" cy="10" r="2" fill="currentColor" />
      <circle cx="17" cy="10" r="2" fill="currentColor" />
    </svg>
  );
}

function MoreButton({ label }: { label: string }) {
  return (
    <Button
      variant="icon"
      className="h-8 w-8 shrink-0 rounded-full"
      aria-label={label}
      title={label}
      onClick={(event) => event.stopPropagation()}
    >
      <EllipsisIcon className="h-5 w-5 text-muted-foreground/70" />
    </Button>
  );
}

function BackButton() {
  const router = useRouter();

  return (
    <Button
      variant="icon"
      onClick={() => router.history.back()}
      className="h-9 w-9 shrink-0 rounded-full bg-black/[0.03] transition-colors hover:bg-black/[0.06]"
      aria-label="Go back"
      title="Go back"
    >
      <ChevronLeft size={22} className="text-foreground" />
    </Button>
  );
}

function FilterButton() {
  return (
    <Button
      variant="icon"
      className="h-8 w-8 shrink-0 rounded-full"
      aria-label="Filter and sort options"
      title="Filter and sort options"
    >
      <SlidersHorizontal size={18} className="text-muted-foreground/70" />
    </Button>
  );
}

function Breadcrumb({ course, current }: { course?: string; current: string }) {
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5">
      <span className="truncate text-[15px] text-muted-foreground">{course ?? PARENT_LABEL}</span>
      <ChevronRight size={16} className="shrink-0 text-muted-foreground/60" />
      <span className="truncate text-[15px] font-semibold text-foreground">{current}</span>
    </nav>
  );
}

function SubfolderCard({ id, title, files, size, faded, classId, isTeacher }: Subfolder & { classId: string; isTeacher: boolean }) {
  return (
    <Link to="/files/$folderId" params={{ folderId: id }} search={{ classId, folderName: title }} className="folder-card block text-left no-underline">
      <div className="flex items-start justify-between">
        <div className={faded ? "opacity-40" : ""}>
          <img src={folderTileAsset} alt="" className="h-12 w-12 object-contain" />
        </div>
        {isTeacher && <ResourceActionMenu classId={classId} id={id} kind="folder" name={title} isTeacher={isTeacher} />}
      </div>
      <h3 className="mt-2 truncate text-[15px] font-medium text-foreground">{title}</h3>
      <div className="mt-1 flex items-center justify-between gap-3 text-xs">
        <span className="text-muted-foreground">{files}</span>
        <strong className="font-semibold text-foreground">{size}</strong>
      </div>
    </Link>
  );
}

function FolderDetail() {
  const { folderId } = Route.useParams();
  const { classId, folderName } = Route.useSearch();
  const [query, setQuery] = useState("");
  const resourcesQuery = useClassResources(classId, folderId);
  const overviewQuery = useClassOverview(classId);
  const resources = resourcesQuery.data;

  const title = folderName ?? formatFolderTitle(folderId);
  const subfolders: Subfolder[] = (resources?.folders ?? []).map((folder) => ({ id: folder.id, title: folder.name, files: `${folder.file_count} ${folder.file_count === 1 ? "file" : "files"}`, size: folder.size_bytes < 1024 * 1024 ? `${Math.round(folder.size_bytes / 1024)} KB` : `${(folder.size_bytes / (1024 * 1024)).toFixed(1)} MB`, faded: false }));
  const files = (resources?.files ?? []).filter((file) => file.name.toLowerCase().includes(query.toLowerCase()));
  const handleUpload = async (file: File) => {
    if (!classId) return;
    try { await uploadClassFile(classId, file, folderId); toast.success(`Added "${file.name}"`); }
    catch (error) { toast.error(error instanceof Error ? error.message : "We couldn't upload this file."); }
  };
  const handleNewFolder = async (name: string) => {
    if (!classId) return;
    try { await createClassFolder(classId, name, folderId); toast.success(`Created folder "${name}"`); }
    catch (error) { toast.error(error instanceof Error ? error.message : "We couldn't create this folder."); }
  };

  return (
    <main className="theme-files min-h-screen bg-page-shell py-0 lg:py-7">
      <div className="mx-auto max-w-[500px]">
        <section className="app-panel relative" aria-label={`${title} folder contents`}>
          <header className="px-7 pt-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <BackButton />
              </div>
              <label className="search-field w-44">
                <span className="sr-only">Search folder files</span>
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search file..." className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/70" />
                <Search size={20} className="text-muted-foreground" />
              </label>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <Breadcrumb course={overviewQuery.data?.courseCode} current={title} />
              <FilterButton />
            </div>
          </header>

          {classId ? <div className="px-7 pt-5">
            <div className="section-heading flex items-center justify-between">
              <h2 className="m-0 leading-none">Folders</h2>
              <MoreButton label="More folder options" />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-4">
              {subfolders.map((folder) => (
                <SubfolderCard key={folder.id} {...folder} classId={classId} isTeacher={overviewQuery.data?.myRole === "teacher"} />
              ))}
            </div>

            <div className="section-heading mt-6 flex items-center justify-between">
              <h2 className="m-0 leading-none">Files</h2>
              <MoreButton label="More file options" />
            </div>
            <div className="mt-3 pb-24">
              {files.length ? files.map((file) => {
                const Icon = file.mime.startsWith("video/") ? Video : FileText;
                return <div key={file.id} role="button" tabIndex={0} onClick={() => void openClassFile(file.path).catch((error) => toast.error(error instanceof Error ? error.message : "We couldn't open this file."))} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") void openClassFile(file.path).catch((error) => toast.error(error instanceof Error ? error.message : "We couldn't open this file.")); }} className="recent-file w-full text-left"><div className="file-icon-wrap"><Icon size={22} className="text-storage-blue" /></div><div className="min-w-0 flex-1"><h3 className="truncate text-sm font-medium text-foreground">{file.name}</h3><p className="mt-0.5 text-[10px] text-muted-foreground">{new Date(file.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p></div><ResourceActionMenu classId={classId} id={file.id} kind="file" name={file.name} path={file.path} isTeacher={overviewQuery.data?.myRole === "teacher"} /></div>;
              }) : <p className="py-8 text-center text-sm text-muted-foreground">No files in this folder</p>}
            </div>
          </div>
          : <p className="px-7 py-12 text-center text-sm text-muted-foreground">Open a class to view its files.</p>}
          {resourcesQuery.isPending && classId && <div className="upload-notice">Loading files…</div>}
          {resourcesQuery.isError && <div className="upload-notice">We couldn't load these files.</div>}
        </section>
      </div>

      {classId && <FileFloatingActionButton onUpload={handleUpload} onNewFolder={handleNewFolder} />}
    </main>
  );
}
