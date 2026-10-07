import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Search,
  Pin,
  BellOff,
  ArrowUpRight,
  FlaskConical,
  Palette,
  Globe2,
  Database,
  type LucideIcon,
} from "lucide-react";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Messages — Classroom" },
      {
        name: "description",
        content: "Chats for every class you're enrolled in or teaching.",
      },
    ],
  }),
  component: MessagesPage,
});

const INK = "#14161F";
const INK_SOFT = "#6B6C76";
const CANVAS = "#F8F7F4";
const FLAME = "#FF5A36";

type ClassChat = {
  id: string;
  name: string;
  icon: LucideIcon;
  bg: string;
  accent: string;
  lastSender: string;
  lastMessage: string;
  time: string;
  unread: number;
  pinned?: boolean;
  muted?: boolean;
};

const classChats: ClassChat[] = [
  {
    id: "orgo-2",
    name: "Organic Chemistry II",
    icon: FlaskConical,
    bg: "#D9CFFB",
    accent: "#5B3FE0",
    lastSender: "Dr. Ada Bello",
    lastMessage: "Lab report rubric has been posted — check the resources tab before submitting.",
    time: "2m",
    unread: 3,
    pinned: true,
  },
  {
    id: "design-studio",
    name: "Design Studio",
    icon: Palette,
    bg: "#C3EFAE",
    accent: "#3C7A22",
    lastSender: "Kali Mona",
    lastMessage: "Great critiques today everyone, see you Thursday for round two.",
    time: "45m",
    unread: 0,
  },
  {
    id: "world-geo",
    name: "World Geography",
    icon: Globe2,
    bg: "#FFE0AE",
    accent: "#9A6412",
    lastSender: "You",
    lastMessage: "Thanks, I'll watch the recording tonight and send my notes.",
    time: "3h",
    unread: 0,
  },
  {
    id: "data-sci",
    name: "Data Science Bootcamp",
    icon: Database,
    bg: "#BFE3FA",
    accent: "#0E6FA8",
    lastSender: "Priya Shah",
    lastMessage: "Can someone share the dataset link again? Mine expired.",
    time: "1d",
    unread: 12,
    muted: true,
  },
];

const filters = ["All", "Unread", "Pinned"] as const;

function EmptyState() {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-2xl px-4 py-12 text-center"
      style={{ backgroundColor: "white", border: "1px dashed rgba(0,0,0,0.12)" }}
    >
      <p className="text-[13.5px] font-medium" style={{ color: INK }}>
        No chats here
      </p>
      <p className="mt-1 text-[11.5px]" style={{ color: INK_SOFT }}>
        Nothing matches this filter yet
      </p>
    </div>
  );
}

// The most recently active chat gets a big featured card, same treatment
// as the "Continue learning" card on Home — the one you're most likely
// to want to jump back into shouldn't look the same size as the rest.
function FeaturedChat({ chat }: { chat: ClassChat }) {
  const Icon = chat.icon;

  return (
    <button
      className="group relative flex w-full flex-col overflow-hidden rounded-[28px] p-5 text-left transition-transform hover:-translate-y-0.5"
      style={{ backgroundColor: chat.bg }}
    >
      <Icon
        aria-hidden
        className="pointer-events-none absolute -right-4 -top-4 h-28 w-28 rotate-[-12deg] opacity-[0.14]"
        style={{ color: chat.accent }}
        strokeWidth={1.5}
      />

      <div className="relative flex items-start justify-between">
        <span
          className="text-[10px] font-bold uppercase tracking-[0.14em]"
          style={{ color: chat.accent }}
        >
          {chat.unread > 0 ? "Most active" : "Pinned"}
        </span>
        <div
          className="grid h-8 w-8 place-items-center rounded-full"
          style={{ backgroundColor: "rgba(255,255,255,0.55)" }}
        >
          <ArrowUpRight className="h-4 w-4" style={{ color: INK }} />
        </div>
      </div>

      <p className="relative mt-2 text-[17px] font-bold leading-snug" style={{ color: INK }}>
        {chat.name}
      </p>

      <p className="relative mt-2 line-clamp-2 text-[12.5px] leading-relaxed" style={{ color: "rgba(0,0,0,0.6)" }}>
        <span className="font-semibold" style={{ color: INK }}>
          {chat.lastSender === "You" ? "You" : chat.lastSender.split(" ")[0]}:{" "}
        </span>
        {chat.lastMessage}
      </p>

      <div className="relative mt-4 flex items-end justify-between">
        <span className="text-[11px] font-medium" style={{ color: "rgba(0,0,0,0.5)" }}>
          {chat.time} ago
        </span>
        {chat.unread > 0 && (
          <span
            className="grid h-6 min-w-6 animate-pulse place-items-center rounded-full px-2 text-[11px] font-bold text-white"
            style={{ backgroundColor: FLAME }}
          >
            {chat.unread > 99 ? "99+" : chat.unread}
          </span>
        )}
      </div>
    </button>
  );
}

function ChatRow({ chat }: { chat: ClassChat }) {
  const Icon = chat.icon;

  return (
    <button
      className="flex w-full items-center gap-3.5 rounded-2xl p-3 text-left transition-colors hover:bg-black/[0.02]"
      style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}
    >
      <div
        className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl"
        style={{ backgroundColor: chat.bg }}
      >
        <Icon className="h-5 w-5" style={{ color: chat.accent }} strokeWidth={1.75} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            {chat.pinned && <Pin className="h-3 w-3 shrink-0" style={{ color: chat.accent }} fill={chat.accent} strokeWidth={0} />}
            <p className="truncate text-[13.5px] font-semibold" style={{ color: INK }}>
              {chat.name}
            </p>
          </div>
          <span
            className="shrink-0 text-[10.5px] tabular-nums"
            style={{ color: chat.unread > 0 ? INK : INK_SOFT }}
          >
            {chat.time}
          </span>
        </div>

        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p className="truncate text-[12px] leading-snug" style={{ color: INK_SOFT }}>
            <span className="font-medium" style={{ color: "rgba(0,0,0,0.55)" }}>
              {chat.lastSender === "You" ? "You: " : `${chat.lastSender.split(" ")[0]}: `}
            </span>
            {chat.lastMessage}
          </p>

          <div className="flex shrink-0 items-center gap-1.5">
            {chat.muted && <BellOff className="h-3.5 w-3.5" style={{ color: INK_SOFT }} strokeWidth={1.75} />}
            {chat.unread > 0 && (
              <span
                className="grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[10px] font-bold text-white"
                style={{ backgroundColor: FLAME }}
              >
                {chat.unread > 99 ? "99+" : chat.unread}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

function MessagesPage() {
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");

  const featured = classChats.find((c) => c.pinned) ?? classChats[0];
  const rest = classChats.filter((c) => c.id !== featured.id);

  const shown = rest.filter((c) => {
    if (filter === "Unread") return c.unread > 0;
    if (filter === "Pinned") return c.pinned;
    return true;
  });

  const totalUnread = classChats.reduce((sum, c) => sum + c.unread, 0);

  return (
    <div
      className="min-h-screen w-full"
      style={{ backgroundColor: CANVAS, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        html, body { background-color: #0a0a0f; }
      `}</style>



      <div className="mx-auto max-w-2xl px-5 pb-28">
        <header className="pt-7">
          <div className="flex items-baseline justify-between">
            <h1 className="text-[22px] font-bold leading-tight" style={{ color: INK }}>
              Messages
            </h1>
            {totalUnread > 0 && (
              <span className="text-[11px] font-semibold" style={{ color: FLAME }}>
                {totalUnread} unread
              </span>
            )}
          </div>

          <div className="mt-5 flex items-center gap-2 rounded-2xl border border-black/10 bg-black/[0.03] px-4 py-3 focus-within:border-black/20">
            <Search className="h-4 w-4 shrink-0" style={{ color: INK_SOFT }} strokeWidth={2} />
            <input
              type="search"
              placeholder="Search classes"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              style={{ color: INK }}
            />
          </div>
        </header>

        <section className="mt-6">
          <FeaturedChat chat={featured} />
        </section>

        <section className="mt-7">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold" style={{ color: INK }}>
              All classes
            </h2>
            <div className="flex gap-2">
              {filters.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className="shrink-0 rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors"
                  style={
                    filter === f
                      ? { backgroundColor: INK, color: "white" }
                      : { border: "1px solid rgba(0,0,0,0.1)", color: INK_SOFT }
                  }
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {shown.length === 0 ? (
            <div className="mt-4">
              <EmptyState />
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {shown.map((chat) => (
                <ChatRow key={chat.id} chat={chat} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}