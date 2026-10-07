import React, { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Search,
  FlaskConical,
  Calculator,
  Globe2,
  Palette,
  Code2,
  BookOpen,
  Music,
  Users,
  Pin,
  Radio,
} from "lucide-react";

// Registers this file as the /chat route. If you move this component
// out of src/routes (e.g. into src/components), delete this export —
// file-based routing only requires it for files that live in src/routes.
export const Route = createFileRoute("/chat")({
  component: ClassChatsPage,
});

/**
 * ClassChatsPage
 * ----------------------------------------------------------------------
 * A list of the class group-chats the current student belongs to.
 * This is the INDEX view only — opening a card should route to the
 * actual conversation, e.g. with TanStack Router:
 *
 *   const navigate = useNavigate();
 *   ...
 *   onClick={() => navigate({ to: "/classes/$classId/chat", params: { classId: c.id } })}
 *
 * and the route file would live at routes/classes.$classId.chat.tsx
 * exporting `Route = createFileRoute("/classes/$classId/chat")(...)`.
 * That screen is intentionally not built here.
 * ----------------------------------------------------------------------
 */

const SUBJECTS = {
  science: { label: "Science", color: "#8FE3B0", Icon: FlaskConical },
  math: { label: "Math", color: "#7FB3FF", Icon: Calculator },
  history: { label: "History", color: "#F2C879", Icon: Globe2 },
  art: { label: "Art", color: "#C9A6F2", Icon: Palette },
  cs: { label: "Computer Science", color: "#7FE0E0", Icon: Code2 },
  lit: { label: "Literature", color: "#F4A5A0", Icon: BookOpen },
  music: { label: "Music", color: "#F2A65A", Icon: Music },
};

const CLASSES = [
  {
    id: "bio-201",
    name: "AP Biology",
    subject: "science",
    teacher: "Ms. Alvarez",
    students: 24,
    lastMessage: { sender: "Jordan", text: "does anyone have the notes from the mitosis lecture?" , time: "2m" },
    unread: 3,
    live: true,
    pinned: true,
  },
  {
    id: "calc-2",
    name: "Calculus II",
    subject: "math",
    teacher: "Mr. Chen",
    students: 18,
    lastMessage: { sender: "You", text: "thanks, that cleared it up!", time: "18m" },
    unread: 0,
    live: true,
    pinned: false,
  },
  {
    id: "wh-1",
    name: "World History",
    subject: "history",
    teacher: "Dr. Obi",
    students: 31,
    lastMessage: { sender: "Priya", text: "essay draft is due Friday not Monday, just checked", time: "1h" },
    unread: 12,
    live: false,
    pinned: false,
  },
  {
    id: "studio-art",
    name: "Studio Art I",
    subject: "art",
    teacher: "Mx. Delgado",
    students: 15,
    lastMessage: { sender: "Sam", text: "sharing my charcoal sketch, feedback welcome", time: "3h" },
    unread: 0,
    live: false,
    pinned: false,
  },
  {
    id: "cs-101",
    name: "Intro to Programming",
    subject: "cs",
    teacher: "Mr. Okafor",
    students: 27,
    lastMessage: { sender: "Lin", text: "my recursion function keeps stack overflowing lol", time: "5h" },
    unread: 5,
    live: false,
    pinned: true,
  },
  {
    id: "lit-12",
    name: "British Literature",
    subject: "lit",
    teacher: "Mrs. Whitfield",
    students: 22,
    lastMessage: { sender: "Emeka", text: "the symbolism in ch. 9 is wild, discuss?", time: "Yesterday" },
    unread: 0,
    live: false,
    pinned: false,
  },
  {
    id: "music-th",
    name: "Music Theory",
    subject: "music",
    teacher: "Mr. Reyes",
    students: 12,
    lastMessage: { sender: "Tara", text: "practice recording posted for unit 4", time: "Mon" },
    unread: 0,
    live: false,
    pinned: false,
  },
];

const FILTERS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "live", label: "Live now" },
  { key: "pinned", label: "Pinned" },
];

// A few hand-drawn "chalk circle" outlines to rotate through so the
// unread stamp never looks like a perfect vector ellipse.
const STAMP_PATHS = [
  "M19 2.6C10 1.4 2 6.9 2.3 15.4 2.6 24 11 27.8 19.6 26.6 28 25.4 30.8 17.7 28.4 10.6 26.4 4.6 22.8 3.3 19 2.6Z",
  "M17.5 3.1C9 1.1 1.8 7.3 2.1 15.8 2.4 23.9 9.7 27.4 18 26.7 26.6 26 30.6 18.9 28.9 11.3 27.4 4.6 22.3 4.4 17.5 3.1Z",
  "M18.6 2.2C9.7 2.6 1.6 8.5 2.5 16.5 3.3 24 12.2 28.1 20.2 26.3 28.3 24.5 30.2 16.6 27.1 10 24.5 4.6 22.7 2 18.6 2.2Z",
];

function UnreadStamp({ count, index }) {
  const path = STAMP_PATHS[index % STAMP_PATHS.length];
  return (
    <span className="relative inline-flex items-center justify-center" style={{ width: 30, height: 28 }}>
      <svg viewBox="0 0 32 30" width="30" height="28" className="absolute inset-0" aria-hidden="true">
        <path d={path} fill="none" stroke="#F3F1E7" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <span
        className="relative text-[12px] leading-none"
        style={{ fontFamily: "'Kalam', cursive", color: "#F3F1E7", fontWeight: 700 }}
      >
        {count > 9 ? "9+" : count}
      </span>
    </span>
  );
}

function ClassCard({ cls, index, onOpen }) {
  const subject = SUBJECTS[cls.subject];
  const SubjectIcon = subject.Icon;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(cls)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen(cls)}
      className="group relative flex items-stretch gap-4 rounded-r-xl rounded-l-md pl-4 pr-4 py-4 mb-3 cursor-pointer outline-none transition-transform duration-150"
      style={{
        background: "#1E322B",
        borderTop: "1px solid rgba(243,241,231,0.06)",
        borderRight: "1px solid rgba(243,241,231,0.06)",
        borderBottom: "1px solid rgba(243,241,231,0.06)",
      }}
    >
      {/* chalk-stick tab */}
      <span
        className="absolute left-0 top-2 bottom-2 rounded-full transition-all duration-150 group-hover:top-0 group-hover:bottom-0"
        style={{ width: 5, background: subject.color, boxShadow: `0 0 10px ${subject.color}55` }}
        aria-hidden="true"
      />

      {/* icon badge */}
      <div
        className="shrink-0 w-12 h-12 rounded-full flex items-center justify-center"
        style={{ background: `${subject.color}1F`, border: `1px solid ${subject.color}55` }}
      >
        <SubjectIcon size={20} color={subject.color} strokeWidth={2} />
      </div>

      {/* main content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h3
            className="text-[19px] leading-tight truncate"
            style={{ fontFamily: "'Kalam', cursive", color: "#F3F1E7", fontWeight: 700 }}
          >
            {cls.name}
          </h3>
          {cls.pinned && (
            <Pin size={13} color="#A9B8B0" style={{ transform: "rotate(35deg)" }} aria-label="Pinned" />
          )}
          {cls.live && (
            <span
              className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full live-pulse"
              style={{ color: "#8FE3B0", border: "1px solid #8FE3B055", fontFamily: "'IBM Plex Mono', monospace" }}
            >
              <Radio size={10} /> live
            </span>
          )}
        </div>

        <p
          className="text-[12.5px] mt-0.5 truncate"
          style={{ color: "#A9B8B0", fontFamily: "'IBM Plex Sans', sans-serif" }}
        >
          {cls.teacher} <span aria-hidden="true">·</span>{" "}
          <span className="inline-flex items-center gap-1 align-middle">
            <Users size={11} className="inline -mt-0.5" /> {cls.students}
          </span>
        </p>

        <p
          className="text-[13.5px] mt-1.5 truncate"
          style={{ color: cls.unread > 0 ? "#F3F1E7" : "#8C988F", fontFamily: "'IBM Plex Sans', sans-serif" }}
        >
          <span style={{ color: subject.color, fontWeight: 600 }}>{cls.lastMessage.sender}: </span>
          {cls.lastMessage.text}
        </p>
      </div>

      {/* right meta column */}
      <div className="shrink-0 flex flex-col items-end justify-between py-0.5">
        <span
          className="text-[11px]"
          style={{ color: "#7C897F", fontFamily: "'IBM Plex Mono', monospace" }}
        >
          {cls.lastMessage.time}
        </span>
        {cls.unread > 0 ? (
          <UnreadStamp count={cls.unread} index={index} />
        ) : (
          <span style={{ width: 30, height: 28 }} aria-hidden="true" />
        )}
      </div>
    </div>
  );
}

export default function ClassChatsPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(() => {
    let list = CLASSES;
    if (filter === "unread") list = list.filter((c) => c.unread > 0);
    if (filter === "live") list = list.filter((c) => c.live);
    if (filter === "pinned") list = list.filter((c) => c.pinned);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (c) => c.name.toLowerCase().includes(q) || c.teacher.toLowerCase().includes(q)
      );
    }
    // pinned first, then unread desc
    return [...list].sort((a, b) => (b.pinned - a.pinned) || (b.unread - a.unread));
  }, [query, filter]);

  const totalUnread = CLASSES.reduce((sum, c) => sum + c.unread, 0);

  function handleOpen(cls) {
    // Wire this to TanStack Router in the real app, e.g.:
    // navigate({ to: "/classes/$classId/chat", params: { classId: cls.id } });
    console.log("open class chat:", cls.id);
  }

  return (
    <div
      className="min-h-screen w-full flex justify-center"
      style={{ background: "#16241F", fontFamily: "'IBM Plex Sans', sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Kalam:wght@400;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap');

        .chalk-dust {
          background-image:
            radial-gradient(1px 1px at 10% 20%, rgba(243,241,231,0.05) 1px, transparent 1px),
            radial-gradient(1px 1px at 80% 60%, rgba(243,241,231,0.04) 1px, transparent 1px),
            radial-gradient(1px 1px at 40% 80%, rgba(243,241,231,0.05) 1px, transparent 1px),
            radial-gradient(1px 1px at 65% 15%, rgba(243,241,231,0.04) 1px, transparent 1px);
          background-size: 220px 220px;
        }

        .chalk-input::placeholder { color: #7C897F; }
        .chalk-input:focus { outline: none; border-color: #F2C87999 !important; box-shadow: 0 0 0 3px rgba(242,200,121,0.15); }

        .chip { transition: background 120ms ease, color 120ms ease, border-color 120ms ease; }
        .chip:focus-visible, .card-focusable:focus-visible { outline: 2px solid #F2C879; outline-offset: 2px; }

        @keyframes livePulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
        .live-pulse svg { animation: livePulse 1.6s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .live-pulse svg { animation: none; }
        }
      `}</style>

      <div className="w-full max-w-2xl chalk-dust px-5 sm:px-8 pt-10 pb-16">
        {/* spiral-bound header rule */}
        <div className="flex items-center gap-2 mb-6" aria-hidden="true">
          {Array.from({ length: 22 }).map((_, i) => (
            <span
              key={i}
              className="hidden sm:block rounded-full"
              style={{ width: 5, height: 5, background: "#2A3F37", flexShrink: 0 }}
            />
          ))}
        </div>

        <header className="mb-6">
          <p
            className="text-[11px] tracking-[0.2em] uppercase mb-1"
            style={{ color: "#7C897F", fontFamily: "'IBM Plex Mono', monospace" }}
          >
            {CLASSES.length} classes · {totalUnread} unread
          </p>
          <h1
            className="text-[34px] sm:text-[40px] leading-none mb-2"
            style={{ fontFamily: "'Kalam', cursive", color: "#F3F1E7", fontWeight: 700 }}
          >
            Your class chats
          </h1>
          <p className="text-[14px]" style={{ color: "#A9B8B0" }}>
            Pick up where your classmates left off.
          </p>
        </header>

        {/* search */}
        <div className="relative mb-4">
          <Search
            size={16}
            color="#7C897F"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search classes or teachers…"
            className="chalk-input w-full pl-10 pr-4 py-2.5 rounded-lg text-[14px]"
            style={{
              background: "#1E322B",
              border: "1px solid #2A3F37",
              color: "#F3F1E7",
            }}
          />
        </div>

        {/* filter chips */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className="chip shrink-0 px-3.5 py-1.5 rounded-full text-[12.5px] font-medium"
                style={{
                  background: active ? "#F2C879" : "transparent",
                  color: active ? "#16241F" : "#A9B8B0",
                  border: `1px solid ${active ? "#F2C879" : "#2A3F37"}`,
                  fontFamily: "'IBM Plex Sans', sans-serif",
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* list */}
        {filtered.length > 0 ? (
          <div>
            {filtered.map((cls, i) => (
              <ClassCard key={cls.id} cls={cls} index={i} onOpen={handleOpen} />
            ))}
          </div>
        ) : (
          <div
            className="rounded-xl px-6 py-14 text-center"
            style={{ background: "#1E322B", border: "1px dashed #2A3F37" }}
          >
            <p style={{ fontFamily: "'Kalam', cursive", color: "#F3F1E7", fontSize: 20, fontWeight: 700 }}>
              Nothing on the board
            </p>
            <p className="text-[13px] mt-1" style={{ color: "#A9B8B0" }}>
              {query ? `No classes match "${query}."` : "Try a different filter."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
