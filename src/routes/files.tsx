import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ChevronLeft, FileText, Search, Video } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import fileAsset from "@/assets/file_icon.png";
import { Button } from "@/components/ui/button";
import FileFloatingActionButton from "@/components/FileFloatingActionButton";
import { ResourceActionMenu } from "@/components/ResourceActionMenu";
import { createClassFolder, openClassFile, uploadClassFile, useClassResources } from "@/lib/class-files";
import { useClassOverview } from "@/lib/classes";

export const Route = createFileRoute("/files")({
  validateSearch: (search: Record<string, unknown>): { classId?: string } => ({
    classId: typeof search.classId === "string" ? search.classId : undefined,
  }),
  head: () => ({
    meta: [
      { title: "MCE 201 Course Files" },
      {
        name: "description",
        content: "Course folders, lecture files, images, and videos for MCE 201.",
      },
      { property: "og:title", content: "MCE 201 Course Files" },
      {
        property: "og:description",
        content: "Course folders, lecture files, images, and videos for MCE 201.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type FolderSummary = {
  id: string;
  title: string;
  files: string;
  size: string;
  faded: boolean;
};

// Twitter-style: "Sep 24" for this year, "Sep 24, 2024" once it's from a
// past year.
function formatTimestamp(date: Date): string {
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

function ImageFileIcon({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <clipPath id="image-file-icon-frame">
          <rect x="3.35" y="3.35" width="17.3" height="17.3" rx="4.15" />
        </clipPath>
      </defs>
      <rect x="2.5" y="2.5" width="19" height="19" rx="5" stroke="currentColor" strokeWidth="1.75" />
      <g clipPath="url(#image-file-icon-frame)">
        <circle cx="8.3" cy="8.3" r="2.05" fill="currentColor" />
        <path
          d="M2.5 19.2c0-.42.17-.82.46-1.11l4.75-4.75a1.85 1.85 0 0 1 2.5-.1l1.24 1.08a1.85 1.85 0 0 0 2.45-.03l3.3-3.02a1.85 1.85 0 0 1 2.63.16l2.17 2.5v6.3H2.5Z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
}

function iconForFile(name: string): typeof FileText {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["mp4", "mov", "webm", "mkv"].includes(ext)) return Video;
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) return ImageFileIcon;
  return FileText;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
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
      // Cards this sits inside (e.g. FolderCard) are clickable links —
      // stop the click from also triggering navigation.
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

function FolderCard({ id, title, files, size, faded = false, classId, isTeacher }: FolderSummary & { classId: string; isTeacher: boolean }) {
  return (
    <Link
      to="/files/$folderId"
      params={{ folderId: id }}
      search={{ classId, folderName: title }}
      className="folder-card block text-left no-underline"
      aria-label={`Open ${title}`}
    >
      <div className="flex items-start justify-between">
        <div className={faded ? "opacity-40" : ""}>
          <img src={fileAsset} alt="" className="h-12 w-12 object-contain" />
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


function StorageChart() {
  // Content cleared out intentionally — shell kept so the surrounding
  // layout/spacing stays put while this gets redesigned.
  return (
    <section
      className="h-[144px] rounded-[14px] bg-[#071a33] p-5 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.5)]"
      aria-label="Course storage overview"
    />
  );
}
 


function Index() {
  const { classId } = Route.useSearch();
  const [query, setQuery] = useState("");
  const resourcesQuery = useClassResources(classId);
  const overviewQuery = useClassOverview(classId);
  const resources = resourcesQuery.data;
  const files = resources?.files ?? [];
  const folders: FolderSummary[] = (resources?.folders ?? []).map((folder) => ({
    id: folder.id,
    title: folder.name,
    files: `${folder.file_count} ${folder.file_count === 1 ? "file" : "files"}`,
    size: formatSize(folder.size_bytes),
    faded: false,
  }));

  const filteredFiles = files.filter((file) =>
    file.name.toLowerCase().includes(query.toLowerCase()),
  );

  const handleUpload = async (file: File) => {
    if (!classId) return;
    try { await uploadClassFile(classId, file); toast.success(`Added "${file.name}"`); }
    catch (error) { toast.error(error instanceof Error ? error.message : "We couldn't upload this file."); }
  };

  const handleNewFolder = async (name: string) => {
    if (!classId) return;
    try { await createClassFolder(classId, name); toast.success(`Created folder "${name}"`); }
    catch (error) { toast.error(error instanceof Error ? error.message : "We couldn't create this folder."); }
  };

  return (
    <main className="theme-files min-h-screen bg-page-shell py-0 lg:py-7">
      <div className="mx-auto max-w-[500px]">
        <section className="app-panel relative" aria-label="Course storage overview">
          <header className="px-7 pt-5">
            <div className="flex items-center gap-3">
              <BackButton />
              <h1 className="m-0 text-[17px] font-semibold leading-none text-foreground">
                {overviewQuery.data ? `${overviewQuery.data.courseCode}` : "Files"}
              </h1>
            </div>

            <label className="search-field mt-5">
              <span className="sr-only">Search course files</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search file..."
                className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/70"
              />
              <Search size={24} className="text-muted-foreground" />
            </label>
          </header>

          <div className="px-7 pt-4">
            {classId ? <StorageChart /> : <p className="py-8 text-center text-sm text-muted-foreground">Open a class to view its files.</p>}

            {classId && <>
            <div className="section-heading mt-7 flex items-center justify-between">
              <h2 className="m-0 leading-none">My Folders</h2>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-4">
              {folders.map((folder) => (
                <FolderCard key={folder.id} {...folder} classId={classId} isTeacher={overviewQuery.data?.myRole === "teacher"} />
              ))}
            </div>

            <div className="section-heading mt-5 flex items-center justify-between">
              <h2 className="m-0 leading-none">Recent Files</h2>
              
            </div>
            <div className="mt-2 pb-24">
              {filteredFiles.length > 0 ? (
                filteredFiles.map((file) => {
                  const Icon = iconForFile(file.name);
                  return <div key={file.id} role="button" tabIndex={0} onClick={() => void openClassFile(file.path).catch((error) => toast.error(error instanceof Error ? error.message : "We couldn't open this file."))} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") void openClassFile(file.path).catch((error) => toast.error(error instanceof Error ? error.message : "We couldn't open this file.")); }} className="recent-file w-full text-left">
                    <div className="file-icon-wrap">
                      <Icon size={22} className="text-storage-blue" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-medium text-foreground">{file.name}</h3>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">{formatTimestamp(new Date(file.created_at))}</p>
                    </div>
                    <ResourceActionMenu classId={classId} id={file.id} kind="file" name={file.name} path={file.path} isTeacher={overviewQuery.data?.myRole === "teacher"} />
                  </div>;
                })
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">No matching files</p>
              )}
            </div>
            </>}
            </div>
          {resourcesQuery.isPending && <div className="upload-notice">Loading files…</div>}
          {resourcesQuery.isError && <div className="upload-notice">We couldn't load these files.</div>}
      
        </section>
      </div>

      {classId && <FileFloatingActionButton onUpload={handleUpload} onNewFolder={handleNewFolder} />}
    </main>
  );
}
