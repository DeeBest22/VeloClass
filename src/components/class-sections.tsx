import { Link } from "@tanstack/react-router";
import { FileText, MessageSquare, Megaphone, Folder, CalendarCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const TINTS = {
  amber: { chip: "bg-amber-100 text-amber-700" },
  indigo: { chip: "bg-indigo-100 text-indigo-700" },
  rose: { chip: "bg-rose-100 text-rose-700" },
  sky: { chip: "bg-sky-100 text-sky-700" },
  emerald: { chip: "bg-emerald-100 text-emerald-700" },
  slate: { chip: "bg-slate-100 text-slate-500" },
};

type Tint = keyof typeof TINTS;

export type ClassSection = {
  label: string;
  to: "/assignments" | "/discussions" | "/announcements" | "/files" | "/assessments";
  blurb?: string;
  count: number;
  icon: LucideIcon;
  tint: Tint;
};

const sections: ClassSection[] = [
  { label: "Assignments", to: "/assignments", blurb: "New submissions to grade", count: 12, icon: FileText, tint: "amber" },
  { label: "Discussions", to: "/discussions", count: 3, icon: MessageSquare, tint: "rose" },
  { label: "Announcements", to: "/announcements", count: 2, icon: Megaphone, tint: "sky" },
  { label: "Files", to: "/files", count: 1, icon: Folder, tint: "emerald" },
  { label: "Assessments", to: "/assessments", count: 0, icon: CalendarCheck, tint: "slate" },
];

function CountBadge({ count, tint, size = "sm" }: { count: number; tint: Tint; size?: "sm" | "lg" }) {
  const active = count > 0;
  const palette = active ? TINTS[tint].chip : "bg-slate-100 text-slate-400";
  const sizing = size === "lg" ? "min-w-[2rem] px-2.5 py-1 text-base" : "min-w-[1.625rem] px-2 py-0.5 text-[13px]";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold tabular-nums ${sizing} ${palette}`}
    >
      {count}
    </span>
  );
}

function FeaturedCard({ section }: { section: ClassSection }) {
  const tint = TINTS[section.tint];
  const Icon = section.icon;
  return (
    <Link
      to={section.to}
      className="col-span-2 flex items-center gap-4 rounded-tile border border-slate-200 bg-white p-4 text-left transition-transform active:scale-95"
    >
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-chip ${tint.chip}`}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-slate-500">{section.label}</span>
        {section.blurb && (
          <span className="block truncate text-xs text-slate-400">{section.blurb}</span>
        )}
      </span>
      <CountBadge count={section.count} tint={section.tint} size="lg" />
    </Link>
  );
}

function SectionCard({ section }: { section: ClassSection }) {
  const tint = TINTS[section.tint];
  const Icon = section.icon;
  return (
    <Link
      to={section.to}
      className="flex flex-col gap-3 rounded-tile border border-slate-200 bg-white p-3.5 text-left transition-transform active:scale-95"
    >
      <span className="flex items-center justify-between">
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-chip-sm ${tint.chip}`}>
          <Icon className="h-4 w-4" />
        </span>
        <CountBadge count={section.count} tint={section.tint} />
      </span>
      <span className="truncate text-xs font-semibold text-slate-600">{section.label}</span>
    </Link>
  );
}

export default function ClassSections() {
  const featured = sections.reduce((a, b) => (b.count > a.count ? b : a), sections[0]);
  const rest = sections.filter((s) => s !== featured);
  const total = sections.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="mx-auto w-full max-w-sm rounded-tile bg-slate-50 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900">Class sections</h2>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-600">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
          {total} new
        </span>
      </div>
      <div className="mt-3 border-t border-slate-200" />
      <div className="mt-4 grid grid-cols-2 gap-3">
        <FeaturedCard section={featured} />
        {rest.map((s) => (
          <SectionCard key={s.label} section={s} />
        ))}
      </div>
    </div>
  );
}