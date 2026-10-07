import { createFileRoute, useRouter } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { ArrowUp, ChevronLeft, FileText, MoreHorizontal, Pin, Reply, X } from 'lucide-react';

import headerBg from '@/assets/course-header-bg.jpg';
import lecturerPfp from '@/assets/lecturer-pfp.png';

/* Announcements page for a single course. Self-contained: data, components, sheet and styles. */

export const Route = createFileRoute('/announcements')({
  head: () => ({
    meta: [
      { title: 'Announcements · MCE 201' },
      {
        name: 'description',
        content: 'Course announcements and student replies for MCE 201.',
      },
      { property: 'og:title', content: 'Announcements · MCE 201' },
      {
        property: 'og:description',
        content: 'Course announcements and student replies for MCE 201.',
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  component: AnnouncementsPage,
});

const COURSE = { code: 'MCE 201', name: 'Engineering Mechanics', lecturer: 'Dr. Tunde Bakare', students: 64 };

const C = {
  navy: '#141C33',
  ink: '#15171C',
  text2: '#5C5F66',
  text3: '#8E9098',
  line: '#EFEFEC',
  bg: '#F5F5F2',
  blue: '#3162F4',
  red: '#D6343A',
  redSoft: '#FDEEEE',
};

type Group = 'Pinned' | 'Today' | 'Earlier this week' | 'Last week';
type Reply = { id: number; name: string; text: string };
type Post = {
  id: number;
  author: string;
  initials: string;
  role: 'Lecturer' | 'Teaching assistant';
  group: Group;
  time: string;
  title: string;
  body: string;
  file?: { name: string; size: string };
  replyCount: number;
  replies: Reply[];
  unread?: boolean;
  important?: boolean;
};

const POSTS: Post[] = [
  {
    id: 1, author: 'Dr. Tunde Bakare', initials: 'TB', role: 'Lecturer', group: 'Pinned', time: 'Sep 22',
    title: 'Course outline and grading', file: { name: 'MCE201_Outline.pdf', size: '310 KB' }, replyCount: 18, replies: [],
    body: 'Continuous assessment is 30% and the final exam is 70%. Please go through the outline so you know what to expect each week.',
  },
  {
    id: 2, author: 'Dr. Tunde Bakare', initials: 'TB', role: 'Lecturer', group: 'Today', time: '9:41 AM', unread: true, important: true,
    title: 'Lecture moved to 2 PM', replyCount: 7, replies: [],
    body: "Today's lecture on friction and equilibrium will now hold at 2 PM in the same virtual room. Attendance will be taken.",
  },
  {
    id: 3, author: 'Kemi Adeyemi', initials: 'KA', role: 'Teaching assistant', group: 'Today', time: '8:05 AM', unread: true,
    title: 'Tutorial questions for Week 5', file: { name: 'Week5_Tutorial.pdf', size: '480 KB' }, replyCount: 3, replies: [],
    body: "Attempt questions 1 to 6 before Thursday's tutorial. We will solve the rest together during the session.",
  },
  {
    id: 4, author: 'Dr. Tunde Bakare', initials: 'TB', role: 'Lecturer', group: 'Earlier this week', time: 'Tue',
    title: 'Test 1 scores are out', replyCount: 12, replies: [],
    body: 'The class average was 61%. Scores are in your grades. If you want to review your script, book a slot during office hours.',
  },
  {
    id: 5, author: 'Kemi Adeyemi', initials: 'KA', role: 'Teaching assistant', group: 'Last week', time: 'Sep 19',
    title: 'Office hours this week', replyCount: 1, replies: [],
    body: 'I will be available on Wednesday from 3 PM to 5 PM for questions on trusses and free body diagrams.',
  },
];

const GROUPS: Group[] = ['Pinned', 'Today', 'Earlier this week', 'Last week'];
const FILTERS = ['All', 'Unread', 'Files'] as const;
type Filter = (typeof FILTERS)[number];

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap');
.ann-root { font-family: Geist, system-ui, -apple-system, sans-serif; -webkit-font-smoothing: antialiased; }
.ann-noscroll::-webkit-scrollbar { display: none; }
@keyframes ann-fade { from { opacity: 0 } to { opacity: 1 } }
@keyframes ann-fade-out { from { opacity: 1 } to { opacity: 0 } }
@keyframes ann-up { from { transform: translateY(100%) } to { transform: translateY(0) } }
@keyframes ann-down { from { transform: translateY(0) } to { transform: translateY(100%) } }
.ann-backdrop { animation: ann-fade .2s ease-out; }
.ann-backdrop.ann-out { animation: ann-fade-out .22s ease-in forwards; }
.ann-sheet { animation: ann-up .32s cubic-bezier(.22,1,.36,1); }
.ann-sheet.ann-out { animation: ann-down .26s cubic-bezier(.4,0,1,1) forwards; }
@media (prefers-reduced-motion: reduce) { .ann-backdrop, .ann-sheet { animation: none; } }
`;

function Avatar({ post, size = 40 }: { post: Pick<Post, 'initials' | 'role'>; size?: number }) {
  const lead = post.role === 'Lecturer';

  if (lead) {
    return (
      <img
        src={lecturerPfp}
        alt=""
        className="shrink-0 rounded-full object-cover ring-1 ring-black/[0.06]"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="grid shrink-0 place-items-center rounded-full text-[13px] font-semibold"
      style={{ width: size, height: size, background: '#ECEEF4', color: C.navy }}
    >
      {post.initials}
    </div>
  );
}

function FileTile({ file }: { file: NonNullable<Post['file']> }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl px-3 py-2.5" style={{ background: '#F8F8F6', border: `1px solid ${C.line}` }}>
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ background: C.redSoft, color: C.red }}>
        <FileText size={17} strokeWidth={1.9} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium" style={{ color: C.ink }}>{file.name}</p>
        <p className="text-[11px]" style={{ color: C.text3 }}>PDF · {file.size}</p>
      </div>
    </div>
  );
}

function AnnouncementCard({ post, onOpen }: { post: Post; onOpen: () => void }) {
  const pinned = post.group === 'Pinned';
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-[24px] bg-white p-[18px] text-left ring-1 ring-black/[0.035] transition-transform duration-150 ease-out active:scale-[.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141C33]"
      style={{ boxShadow: '0 1px 2px rgba(16,16,20,.04), 0 10px 28px -14px rgba(16,16,20,.12)' }}
    >
      <div className="flex items-center gap-3">
        <Avatar post={post} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold" style={{ color: C.ink }}>{post.author}</p>
          <p className="text-[12px]" style={{ color: C.text3 }}>{post.role} · {post.time}</p>
        </div>
        {pinned && (
          <span className="flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium" style={{ background: '#F0F2F7', color: C.navy }}>
            <Pin size={11} className="rotate-45" /> Pinned
          </span>
        )}
        {post.unread && <span className="h-2 w-2 rounded-full" style={{ background: C.blue }} aria-label="Unread" />}
      </div>

      <div className="mt-4">
        {post.important && (
          <span className="mb-2 inline-flex rounded-full px-2 py-[3px] text-[11px] font-semibold" style={{ background: C.redSoft, color: C.red }}>
            Important
          </span>
        )}
        <h3 className="text-[17px] font-semibold leading-[23px] tracking-[-0.015em]" style={{ color: C.ink }}>{post.title}</h3>
        <p className="mt-1.5 line-clamp-3 text-[14.5px] leading-[21px]" style={{ color: C.text2 }}>{post.body}</p>
      </div>

      {post.file && <div className="mt-4"><FileTile file={post.file} /></div>}

      <div className="mt-4 flex items-center gap-2 pt-3.5 text-[12.5px]" style={{ borderTop: `1px solid ${C.line}`, color: C.text3 }}>
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ background: '#EAF0FE', color: C.blue }}>
          <Reply size={12.5} strokeWidth={2.1} />
        </span>
        {post.replyCount} class {post.replyCount === 1 ? 'reply' : 'replies'}
      </div>
    </button>
  );
}

const EXIT_MS = 260;

function PostSheet({ post, onClose, onReply }: { post: Post; onClose: () => void; onReply: (text: string) => void }) {
  const [draft, setDraft] = useState('');
  const [closing, setClosing] = useState(false);

  const requestClose = () => setClosing(true);

  useEffect(() => {
    if (!closing) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t = setTimeout(onClose, reduced ? 0 : EXIT_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closing]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && requestClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onReply(text);
    setDraft('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className={`ann-backdrop absolute inset-0 bg-black/40 ${closing ? 'ann-out' : ''}`} onClick={requestClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ann-sheet-title"
        className={`ann-sheet relative flex max-h-[90vh] w-full max-w-[430px] flex-col rounded-t-[28px] bg-white ${closing ? 'ann-out' : ''}`}
      >
        <div className="flex items-center justify-between px-6 pb-2 pt-3">
          <span className="w-9" />
          <span className="h-1 w-9 rounded-full" style={{ background: '#E4E4E8' }} />
          <button type="button" onClick={requestClose} aria-label="Close" className="-mr-2 grid h-9 w-9 place-items-center rounded-full" style={{ color: C.text3 }}>
            <X size={18} />
          </button>
        </div>

        <div className="ann-noscroll flex-1 overflow-y-auto px-6 pb-4 [scrollbar-width:none]">
          <div className="flex items-center gap-3">
            <Avatar post={post} size={44} />
            <div>
              <p className="text-[14px] font-semibold" style={{ color: C.ink }}>{post.author}</p>
              <p className="text-[13px]" style={{ color: C.text3 }}>{post.role} · {COURSE.code} · {post.time}</p>
            </div>
          </div>
          <h2 id="ann-sheet-title" className="mt-6 text-[24px] font-semibold leading-[30px] tracking-[-0.02em]" style={{ color: C.ink }}>
            {post.title}
          </h2>
          <p className="mt-3 text-[16px] leading-[26px]" style={{ color: '#3A3B40' }}>{post.body}</p>
          {post.file && <div className="mt-5"><FileTile file={post.file} /></div>}

          <p className="mt-8 text-[13px] font-semibold" style={{ color: C.text3 }}>
            {post.replyCount} class {post.replyCount === 1 ? 'reply' : 'replies'}
          </p>
          {post.replies.length > 0 && (
            <ul className="mt-3 space-y-3">
              {post.replies.map((r) => (
                <li key={r.id} className="flex gap-2.5">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold" style={{ background: '#EAF0FE', color: C.blue }}>
                    You
                  </div>
                  <div className="rounded-2xl rounded-tl-md px-3.5 py-2" style={{ background: C.bg }}>
                    <p className="text-[12px] font-semibold" style={{ color: C.ink }}>{r.name}</p>
                    <p className="text-[14px] leading-[20px]" style={{ color: C.text2 }}>{r.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <form onSubmit={submit} className="px-6 pb-7 pt-2" style={{ borderTop: `1px solid ${C.line}` }}>
          <div className="mt-2 flex items-center gap-2 rounded-full py-1.5 pl-5 pr-1.5" style={{ background: C.bg }}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Reply to class"
              aria-label="Reply to class"
              className="h-9 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-[#A9ABB2]"
              style={{ color: C.ink }}
            />
            <button
              type="submit"
              aria-label="Send reply"
              disabled={!draft.trim()}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white transition-opacity disabled:opacity-25"
              style={{ background: C.navy }}
            >
              <ArrowUp size={17} strokeWidth={2.2} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AnnouncementsPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>(POSTS);
  const [filter, setFilter] = useState<Filter>('All');
  const [openId, setOpenId] = useState<number | null>(null);

  const open = posts.find((p) => p.id === openId) ?? null;
  const unread = posts.filter((p) => p.unread).length;

  const grouped = useMemo(() => {
    const list = posts.filter((p) => (filter === 'All' ? true : filter === 'Unread' ? p.unread : Boolean(p.file)));
    return GROUPS.map((g) => ({ g, items: list.filter((p) => p.group === g) })).filter((x) => x.items.length > 0);
  }, [posts, filter]);

  const openPost = (id: number) => {
    setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, unread: false } : p)));
    setOpenId(id);
  };

  const addReply = (text: string) => {
    setPosts((ps) =>
      ps.map((p) =>
        p.id === openId
          ? { ...p, replyCount: p.replyCount + 1, replies: [...p.replies, { id: Date.now(), name: 'You', text }] }
          : p,
      ),
    );
  };

  return (
    <div className="ann-root min-h-screen" style={{ background: '#E8E8E4' }}>
      <style>{STYLES}</style>
      <div className="mx-auto min-h-screen max-w-[430px]" style={{ background: C.bg }}>
        <header
          className="relative overflow-hidden bg-cover bg-center px-5 pb-16 pt-5 text-white"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(20,28,51,.45) 0%, rgba(20,28,51,.75) 65%, ${C.navy} 100%), url(${headerBg})`,
          }}
        >
          <div className="relative flex items-center justify-between">
            <button
              type="button"
              onClick={() => router.history.back()}
              aria-label="Back"
              className="grid h-10 w-10 place-items-center rounded-[14px] transition-transform active:scale-95"
              style={{ background: C.navy, boxShadow: '0 6px 16px -6px rgba(0,0,0,.5)' }}
            >
              <ChevronLeft size={20} strokeWidth={2.25} className="text-white" />
            </button>
       
            <button type="button" aria-label="More options" className="-mr-2 grid h-11 w-11 place-items-center rounded-full active:bg-white/10">
              <MoreHorizontal size={21} />
            </button>
          </div>
          <div className="relative mt-5">
            <span className="inline-flex rounded-full bg-white/10 px-2.5 py-1 text-[12px] font-semibold tracking-wide">{COURSE.code}</span>
            <h1 className="mt-2.5 text-[28px] font-semibold leading-[34px] tracking-[-0.03em]">{COURSE.name}</h1>
            <p className="mt-1.5 text-[13.5px] text-white/60">{COURSE.lecturer} · {COURSE.students} students</p>
          </div>
        </header>

        <div className="sticky top-0 z-10 -mt-10 px-4 pt-2">
          <div
            className="flex items-center justify-between rounded-[18px] bg-white p-1.5 ring-1 ring-black/[0.04]"
            style={{ boxShadow: '0 10px 28px -12px rgba(16,16,20,.22)' }}
            role="tablist"
            aria-label="Filter announcements"
          >
            <div className="flex gap-1">
              {FILTERS.map((f) => {
                const active = filter === f;
                return (
                  <button
                    key={f}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setFilter(f)}
                    className="h-9 rounded-xl px-4 text-[13.5px] font-medium transition-colors duration-150"
                    style={{ background: active ? C.navy : 'transparent', color: active ? '#fff' : C.text2 }}
                  >
                    {f}
                    {f === 'Unread' && unread > 0 && (
                      <span className="ml-1.5" style={{ color: active ? 'rgba(255,255,255,.7)' : C.blue }}>{unread}</span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="pr-3 text-[12px]" style={{ color: C.text3 }}>{posts.length} posts</p>
          </div>
        </div>

        <main className="px-4 pb-12">
          {grouped.length > 0 ? (
            grouped.map(({ g, items }) => (
              <section key={g} className="pt-6">
                <h2 className="px-1 pb-2.5 text-[13px] font-semibold" style={{ color: C.text3 }}>{g}</h2>
                <div className="space-y-3">
                  {items.map((p) => <AnnouncementCard key={p.id} post={p} onOpen={() => openPost(p.id)} />)}
                </div>
              </section>
            ))
          ) : (
            <div className="pt-24 text-center">
              <p className="text-[15px] font-semibold" style={{ color: C.ink }}>You are all caught up</p>
              <p className="mt-1 text-[13px]" style={{ color: C.text3 }}>New announcements will show up here.</p>
            </div>
          )}
        </main>
      </div>

      {open && <PostSheet key={open.id} post={open} onClose={() => setOpenId(null)} onReply={addReply} />}
    </div>
  );
}