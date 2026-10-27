import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Pin, BellOff, ArrowUpRight, MessagesSquare, MoreHorizontal, Bell } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { classTint, setLastOpenedClassId, useMyClasses } from "@/lib/classes";
import { chatPreview, setChatPref, shortAgo, useClassChats } from "@/lib/class-chats";

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
  code: string;
  bg: string;
  accent: string;
  lastSender: string;
  lastMessage: string;
  time: string;
  at: number;
  unread: number;
  pinned: boolean;
  muted: boolean;
  empty: boolean;
};

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
function FeaturedChat({ chat, onOpen }: { chat: ClassChat; onOpen: () => void }) {
  const Icon = MessagesSquare;

  return (
    <button
      onClick={onOpen}
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
          {chat.pinned ? "Pinned" : chat.unread > 0 ? "Most active" : "Latest"}
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
        {!chat.empty && (
          <span className="font-semibold" style={{ color: INK }}>
            {chat.lastSender === "You" ? "You" : chat.lastSender.split(" ")[0]}:{" "}
          </span>
        )}
        {chat.lastMessage}
      </p>

      <div className="relative mt-4 flex items-end justify-between">
        <span className="text-[11px] font-medium" style={{ color: "rgba(0,0,0,0.5)" }}>
          {chat.empty ? chat.code : chat.time === "now" ? "Just now" : `${chat.time} ago`}
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

function ChatRow({ chat, onOpen, onPref }: { chat: ClassChat; onOpen: () => void; onPref: (pinned: boolean, muted: boolean) => void }) {
  const [menu, setMenu] = useState(false);
  const mark = chat.code.replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase() || chat.name.slice(0, 2).toUpperCase();

  return (
    <div className="relative flex items-center rounded-2xl transition-colors hover:bg-black/[0.02]" style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}>
      <button onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3.5 p-3 text-left">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-[12px] font-extrabold tracking-tight" style={{ backgroundColor: chat.bg, color: chat.accent }}>
          {mark}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              {chat.pinned && <Pin className="h-3 w-3 shrink-0" style={{ color: chat.accent }} fill={chat.accent} strokeWidth={0} />}
              <p className="truncate text-[13.5px] font-semibold" style={{ color: INK }}>
                {chat.name}
              </p>
            </div>
            <span className="shrink-0 text-[10.5px] tabular-nums" style={{ color: chat.unread > 0 && !chat.muted ? INK : INK_SOFT }}>
              {chat.time}
            </span>
          </div>

          <div className="mt-0.5 flex items-center justify-between gap-2">
            <p className="truncate text-[12px] leading-snug" style={{ color: INK_SOFT }}>
              {!chat.empty && (
                <span className="font-medium" style={{ color: "rgba(0,0,0,0.55)" }}>
                  {chat.lastSender === "You" ? "You: " : chat.lastSender ? `${chat.lastSender.split(" ")[0]}: ` : ""}
                </span>
              )}
              {chat.lastMessage}
            </p>

            <div className="flex shrink-0 items-center gap-1.5">
              {chat.muted && <BellOff className="h-3.5 w-3.5" style={{ color: INK_SOFT }} strokeWidth={1.75} />}
              {chat.unread > 0 && (
                <span
                  className="grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[10px] font-bold text-white"
                  style={{ backgroundColor: chat.muted ? "#9A9BA5" : FLAME }}
                >
                  {chat.unread > 99 ? "99+" : chat.unread}
                </span>
              )}
            </div>
          </div>
        </div>
      </button>

      <button onClick={() => setMenu((v) => !v)} onBlur={() => window.setTimeout(() => setMenu(false), 120)} aria-label="Chat options" aria-expanded={menu} className="mr-1.5 grid h-8 w-8 shrink-0 place-items-center rounded-full transition-colors hover:bg-black/[0.05]">
        <MoreHorizontal className="h-4 w-4" style={{ color: INK_SOFT }} />
      </button>
      {menu && (
        <div className="absolute right-2 top-12 z-10 w-44 overflow-hidden rounded-2xl bg-white py-1" style={{ border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 12px 30px rgba(20,22,31,0.14)" }}>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => { onPref(!chat.pinned, chat.muted); setMenu(false); }} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[12.5px] font-medium hover:bg-black/[0.03]" style={{ color: INK }}>
            <Pin className="h-4 w-4" strokeWidth={1.75} />{chat.pinned ? "Unpin chat" : "Pin to top"}
          </button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => { onPref(chat.pinned, !chat.muted); setMenu(false); }} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[12.5px] font-medium hover:bg-black/[0.03]" style={{ color: INK }}>
            {chat.muted ? <Bell className="h-4 w-4" strokeWidth={1.75} /> : <BellOff className="h-4 w-4" strokeWidth={1.75} />}{chat.muted ? "Unmute" : "Mute chat"}
          </button>
        </div>
      )}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="mt-6 space-y-2" aria-busy="true" aria-label="Loading chats">
      <div className="h-[150px] animate-pulse rounded-[28px] bg-black/[0.06]" />
      {[0, 1, 2].map((i) => <div key={i} className="h-[72px] animate-pulse rounded-2xl bg-black/[0.05]" />)}
    </div>
  );
}

function MessagesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [query, setQuery] = useState("");
  const classesQ = useMyClasses();
  const chatsQ = useClassChats();

  const chats = useMemo<ClassChat[]>(() => {
    const info = new Map((chatsQ.data ?? []).map((c) => [c.class_id, c]));
    return (classesQ.data ?? []).filter((c) => !c.archived).map((c) => {
      const row = info.get(c.id);
      const t = classTint(c.color);
      const empty = !row?.last_at;
      return {
        id: c.id,
        name: c.name,
        code: c.courseCode,
        bg: t.bg,
        accent: t.accent,
        lastSender: row?.last_sender_name ?? "",
        lastMessage: empty ? "No messages yet. Start the conversation." : chatPreview(row?.last_kind ?? null, row?.last_body ?? null),
        time: shortAgo(row?.last_at ?? null),
        at: row?.last_at ? Date.parse(row.last_at) : 0,
        unread: row?.unread ?? 0,
        pinned: row?.pinned ?? false,
        muted: row?.muted ?? false,
        empty,
      };
    });
  }, [classesQ.data, chatsQ.data]);

  const open = (id: string) => {
    setLastOpenedClassId(user?.id, id);
    void navigate({ to: "/discussions", search: { classId: id } });
  };
  const pref = (id: string, pinned: boolean, muted: boolean) =>
    void setChatPref(id, pinned, muted).then(() => qc.invalidateQueries({ queryKey: ["class-chats"] })).catch(() => {});

  const term = query.trim().toLowerCase();
  const matches = chats
    .filter((c) => !term || c.name.toLowerCase().includes(term) || c.code.toLowerCase().includes(term))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.at - a.at);
  const showFeatured = filter === "All" && !term && matches.length > 0;
  const featured = showFeatured ? [...matches].sort((a, b) => b.at - a.at)[0] : undefined;
  const shown = matches.filter((c) => c.id !== featured?.id).filter((c) => (filter === "Unread" ? c.unread > 0 : filter === "Pinned" ? c.pinned : true));

  const totalUnread = chats.reduce((sum, c) => sum + (c.muted ? 0 : c.unread), 0);
  const loading = classesQ.isLoading || chatsQ.isLoading;
  const failed = classesQ.isError || chatsQ.isError;

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
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              style={{ color: INK }}
            />
          </div>
        </header>

        {loading && <Skeleton />}
        {failed && !loading && (
          <div className="mt-6 rounded-2xl bg-white px-4 py-8 text-center" style={{ border: "1px solid rgba(0,0,0,0.08)" }}>
            <p className="text-[13.5px] font-medium" style={{ color: INK }}>We couldn't load your chats</p>
            <button onClick={() => { void classesQ.refetch(); void chatsQ.refetch(); }} className="mt-3 rounded-full px-4 py-2 text-[12px] font-semibold text-white" style={{ backgroundColor: INK }}>Try again</button>
          </div>
        )}
        {!loading && !failed && chats.length === 0 && (
          <div className="mt-6"><div className="flex flex-col items-center rounded-2xl px-4 py-12 text-center" style={{ backgroundColor: "white", border: "1px dashed rgba(0,0,0,0.12)" }}>
            <p className="text-[13.5px] font-medium" style={{ color: INK }}>No class chats yet</p>
            <p className="mt-1 text-[11.5px]" style={{ color: INK_SOFT }}>Join or create a class and its group chat will show up here</p>
          </div></div>
        )}

        {featured && (
          <section className="mt-6">
            <FeaturedChat chat={featured} onOpen={() => open(featured.id)} />
          </section>
        )}

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

          {loading || failed || chats.length === 0 ? null : shown.length === 0 ? (
            <div className="mt-4">
              <EmptyState />
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {shown.map((chat) => (
                <ChatRow key={chat.id} chat={chat} onOpen={() => open(chat.id)} onPref={(pinned, muted) => pref(chat.id, pinned, muted)} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}