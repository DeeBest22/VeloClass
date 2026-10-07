import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Play, Search, SlidersHorizontal } from "lucide-react";
import { useState } from "react";

import folderTileAsset from "@/assets/file_icon.png";
import catPhotoAsset from "@/assets/cat-photo.png";
import uiStillAsset from "@/assets/ui-still.png";
import { Button } from "@/components/ui/button";
import FileFloatingActionButton from "@/components/FileFloatingActionButton";

export const Route = createFileRoute("/files_/$folderId")({
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

type MediaTile = {
  id: string;
  src: string;
  alt: string;
};

type VideoItem = {
  id: string;
  title: string;
  duration: string;
  poster: string;
};

const PARENT_LABEL = "My Folder";

// A route param like "lecture-notes-1758..." -> "Lecture Notes" for display
// (the trailing timestamp segment added by slugify() is dropped).
function formatFolderTitle(id: string): string {
  const words = id.split("-").filter((part) => Number.isNaN(Number(part)));
  const label = words.length > 0 ? words : [id];
  return label.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

// Mock contents — swap for real folder data once the files API is wired up.
function getFolderContents(folderId: string): {
  subfolders: Subfolder[];
  bigImage: MediaTile;
  wideImage: MediaTile;
  smallImages: [MediaTile, MediaTile];
  video: VideoItem;
} {
  return {
    subfolders: [
      { id: `${folderId}-1`, title: "Naskah Asli", files: "1 files", size: "2 KB", faded: false },
      { id: `${folderId}-2`, title: "Secret Files", files: "2400 files", size: "64 GB", faded: false },
    ],
    bigImage: { id: `${folderId}-img-big`, src: catPhotoAsset, alt: "Course mascot illustration" },
    wideImage: { id: `${folderId}-img-wide`, src: uiStillAsset, alt: "UI design reference" },
    smallImages: [
      { id: `${folderId}-img-small-1`, src: uiStillAsset, alt: "UI design reference" },
      { id: `${folderId}-img-small-2`, src: catPhotoAsset, alt: "Course mascot illustration" },
    ],
    video: {
      id: `${folderId}-video-1`,
      title: "Workshop Walkthrough",
      duration: "4:12",
      poster: uiStillAsset,
    },
  };
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

function SearchButton() {
  return (
    <Button
      variant="icon"
      className="h-9 w-9 shrink-0 rounded-full bg-black/[0.03] transition-colors hover:bg-black/[0.06]"
      aria-label="Search files"
      title="Search files"
    >
      <Search size={20} className="text-foreground" />
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

function Breadcrumb({ current }: { current: string }) {
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5">
      <span className="truncate text-[15px] text-muted-foreground">{PARENT_LABEL}</span>
      <ChevronRight size={16} className="shrink-0 text-muted-foreground/60" />
      <span className="truncate text-[15px] font-semibold text-foreground">{current}</span>
    </nav>
  );
}

function SubfolderCard({ title, files, size, faded }: Subfolder) {
  return (
    <article className="folder-card">
      <div className="flex items-start justify-between">
        <div className={faded ? "opacity-40" : ""}>
          <img src={folderTileAsset} alt="" className="h-12 w-12 object-contain" />
        </div>
        <MoreButton label={`More options for ${title}`} />
      </div>
      <h3 className="mt-2 truncate text-[15px] font-medium text-foreground">{title}</h3>
      <div className="mt-1 flex items-center justify-between gap-3 text-xs">
        <span className="text-muted-foreground">{files}</span>
        <strong className="font-semibold text-foreground">{size}</strong>
      </div>
    </article>
  );
}

function ImageTile({ tile, heightPx, className = "" }: { tile: MediaTile; heightPx: number; className?: string }) {
  return (
    <button
      type="button"
      className={`group relative w-full overflow-hidden rounded-2xl ${className}`}
      style={{ height: heightPx }}
      aria-label={`Open ${tile.alt}`}
    >
      <img src={tile.src} alt={tile.alt} className="h-full w-full object-cover" />
      <span className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
    </button>
  );
}

function ImagesGrid({
  bigImage,
  wideImage,
  smallImages,
}: {
  bigImage: MediaTile;
  wideImage: MediaTile;
  smallImages: [MediaTile, MediaTile];
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <ImageTile tile={bigImage} heightPx={180} className="row-span-2" />
      <ImageTile tile={wideImage} heightPx={84} />
      <div className="grid grid-cols-2 gap-3">
        <ImageTile tile={smallImages[0]} heightPx={84} />
        <ImageTile tile={smallImages[1]} heightPx={84} />
      </div>
    </div>
  );
}

function VideoTile({ video }: { video: VideoItem }) {
  return (
    <button
      type="button"
      className="group relative block h-[160px] w-full overflow-hidden rounded-2xl"
      aria-label={`Play ${video.title}`}
    >
      <img src={video.poster} alt="" className="h-full w-full object-cover" />
      <span className="absolute inset-0 bg-black/10 transition-colors group-hover:bg-black/20" />
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-lg">
          <Play size={22} className="ml-0.5 text-[#071a33]" fill="currentColor" />
        </span>
      </span>
      <span className="absolute bottom-2.5 right-2.5 rounded-md bg-black/45 px-1.5 py-0.5 text-[11px] font-medium text-white">
        {video.duration}
      </span>
    </button>
  );
}

function FolderDetail() {
  const { folderId } = Route.useParams();
  const [notice, setNotice] = useState("");

  const title = formatFolderTitle(folderId);
  const { subfolders, bigImage, wideImage, smallImages, video } = getFolderContents(folderId);

  const showNotice = (message: string) => {
    setNotice(message);
    window.clearTimeout((showNotice as unknown as { _t?: number })._t);
    (showNotice as unknown as { _t?: number })._t = window.setTimeout(() => setNotice(""), 3000);
  };

  const handleUpload = (file: File) => {
    showNotice(`Added "${file.name}"`);
  };

  const handleNewFolder = (name: string) => {
    showNotice(`Created folder "${name}"`);
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
              <SearchButton />
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <Breadcrumb current={title} />
              <FilterButton />
            </div>
          </header>

          <div className="px-7 pt-5">
            <div className="section-heading flex items-center justify-between">
              <h2 className="m-0 leading-none">Folders</h2>
              <MoreButton label="More folder options" />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-4">
              {subfolders.map((folder) => (
                <SubfolderCard key={folder.id} {...folder} />
              ))}
            </div>

            <div className="section-heading mt-6 flex items-center justify-between">
              <h2 className="m-0 leading-none">Images</h2>
              <MoreButton label="More image options" />
            </div>
            <div className="mt-3">
              <ImagesGrid bigImage={bigImage} wideImage={wideImage} smallImages={smallImages} />
            </div>

            <div className="section-heading mt-6 flex items-center justify-between">
              <h2 className="m-0 leading-none">Videos</h2>
              <MoreButton label="More video options" />
            </div>
            <div className="mt-3 pb-24">
              <VideoTile video={video} />
            </div>
          </div>
          {notice && <div className="upload-notice">{notice}</div>}
        </section>
      </div>

      <FileFloatingActionButton onUpload={handleUpload} onNewFolder={handleNewFolder} />
    </main>
  );
}
