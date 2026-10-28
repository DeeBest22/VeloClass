import { useEffect, useState } from "react";
import { ArrowLeft, ArrowUpDown, ArrowUpRight, Award, TrendingUp, Users } from "lucide-react";

export type Analysis = {
  submitted: number;
  average: number | null; // percent
  max: number;
  bands: number[]; // students per band: 80+, 60-79, 40-59, 0-39
  accuracy: number[]; // percent correct per question
  top: { name: string; score: number } | null;
  onOpenTop: () => void;
};

const DISPLAY = "'Bricolage Grotesque', 'Plus Jakarta Sans', system-ui, sans-serif";
const INK = "#0E0F14", VIOLET = "#5B4DE8", TRACK = "#DEDBF1", MUTED = "#6F6C8A", BASE = "#E6E3F6", SEP = "#EFEDFC";
const BANDS = [
  { label: "80–100%", fill: INK, stripes: true },
  { label: "60–79%", fill: VIOLET, stripes: true },
  { label: "40–59%", fill: "#B7B2DE", stripes: false },
  { label: "0–39%", fill: "#D3CFEB", stripes: false },
];
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

const polar = (r: number, deg: number): [number, number] => [100 + r * Math.cos(((deg - 90) * Math.PI) / 180), 100 + r * Math.sin(((deg - 90) * Math.PI) / 180)];
const sector = (r: number, a0: number, a1: number) => {
  const [x0, y0] = polar(r, a0), [x1, y1] = polar(r, a1);
  return `M100 100 L${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`;
};

const Card = ({ title, onArrow, children }: { title: string; onArrow: () => void; children: React.ReactNode }) => (
  <section className="relative rounded-[30px] p-5" style={{ background: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.8)", boxShadow: "0 24px 60px -30px rgba(91,77,232,0.35)", backdropFilter: "blur(14px)" }}>
    <div className="flex items-start justify-between">
      <h2 className="text-[19px] font-medium tracking-tight" style={{ fontFamily: DISPLAY, color: INK }}>{title}</h2>
      <button type="button" onClick={onArrow} aria-label={`Open ${title}`} className="grid size-11 place-items-center rounded-full bg-white transition-transform active:scale-90" style={{ boxShadow: "0 8px 20px -10px rgba(14,15,20,0.25)" }}><ArrowUpRight className="size-[18px]" style={{ color: INK }} strokeWidth={2} /></button>
    </div>
    {children}
  </section>
);
const Caption = ({ children }: { children: React.ReactNode }) => <p className="mt-1.5 text-[10.5px] font-medium uppercase tracking-[0.1em]" style={{ color: MUTED }}>{children}</p>;

export function PerformanceAnalysis({ data, onClose }: { data: Analysis; onClose: () => void }) {
  const [shown, setShown] = useState(false);
  const [band, setBand] = useState<number | null>(null);
  const hardest = data.accuracy.length > 1 ? data.accuracy.indexOf(Math.min(...data.accuracy)) : data.accuracy.length === 1 ? 0 : -1;
  const [sel, setSel] = useState(Math.max(0, hardest));
  useEffect(() => { const t = window.setTimeout(() => setShown(true), 60); return () => window.clearTimeout(t); }, []);

  /* donut: each band is a slice, sized by how many students landed in it */
  const total = data.bands.reduce((a, b) => a + b, 0);
  const maxCount = Math.max(1, ...data.bands);
  let angle = 0;
  const slices = BANDS.map((b, i) => {
    const count = data.bands[i] ?? 0;
    const sweep = total ? (count / total) * 360 : 0;
    const out = { ...b, i, count, a0: angle, a1: angle + sweep, r: 68 + 30 * (count / maxCount) };
    angle += sweep;
    return out;
  }).filter((s) => s.count > 0);

  const n = data.accuracy.length;
  const bar = n > 8 ? 6 : 10;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: "linear-gradient(165deg,#E4E0FF 0%,#F2F0FF 52%,#E9E5FF 100%)" }}>
      <main className="mx-auto min-h-screen w-full max-w-3xl px-5 pb-12 pt-6">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onClose} aria-label="Back" className="grid size-11 place-items-center rounded-full bg-white/70 transition-transform active:scale-90"><ArrowLeft className="size-5" style={{ color: INK }} strokeWidth={2.2} /></button>
          <div><h1 className="text-[22px] font-medium tracking-tight" style={{ fontFamily: DISPLAY, color: INK }}>Performance</h1><p className="text-[12px] font-medium" style={{ color: MUTED }}>{data.submitted} {data.submitted === 1 ? "submission" : "submissions"}</p></div>
        </div>

        <div className={`mt-6 grid gap-4 ${n > 0 ? "sm:grid-cols-2" : ""}`}>
          <Card title="Score analysis" onArrow={data.top ? data.onOpenTop : () => {}}>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
              {BANDS.map((b, i) => (
                <button key={b.label} type="button" onClick={() => setBand(band === i ? null : i)} className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.08em] transition-opacity" style={{ color: INK, opacity: band === null || band === i ? 1 : 0.4 }}>
                  <span className="size-2 rounded-full" style={{ backgroundColor: b.fill }} />{b.label} {data.bands[i] ?? 0}
                </button>
              ))}
            </div>
            <div className="relative mx-auto mt-4 aspect-square w-full max-w-[250px]">
              <svg viewBox="0 0 200 200" className="size-full" role="img" aria-label="Students by score band">
                <defs><pattern id="pa-stripes" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="2.6" height="6" fill="rgba(255,255,255,0.13)" /></pattern></defs>
                <circle cx="100" cy="100" r="98" fill={BASE} />
                {slices.map((s) => (
                  <g key={s.i} onClick={() => setBand(band === s.i ? null : s.i)} className="cursor-pointer" style={{ transformOrigin: "100px 100px", transform: shown ? "scale(1)" : "scale(0.55)", opacity: shown ? (band === null || band === s.i ? 1 : 0.35) : 0, transition: `transform .8s cubic-bezier(.22,1,.36,1) ${s.i * 70}ms, opacity .5s ease ${s.i * 70}ms` }}>
                    <path d={slices.length === 1 ? `M100 ${100 - s.r} A${s.r} ${s.r} 0 1 1 99.99 ${100 - s.r} Z` : sector(s.r, s.a0, s.a1)} fill={s.fill} stroke={SEP} strokeWidth="3" strokeLinejoin="round" />
                    {s.stripes && <path d={slices.length === 1 ? `M100 ${100 - s.r} A${s.r} ${s.r} 0 1 1 99.99 ${100 - s.r} Z` : sector(s.r, s.a0, s.a1)} fill="url(#pa-stripes)" />}
                  </g>
                ))}
                <circle cx="100" cy="100" r="40" fill="white" />
                <circle cx="100" cy="100" r="46" fill="none" stroke="#C9C5E4" strokeWidth="1" strokeDasharray="1 4" strokeLinecap="round" />
              </svg>
              {total === 0 && <p className="pointer-events-none absolute inset-0 z-10 grid place-items-center px-10 text-center text-[12px] font-medium" style={{ color: MUTED }}>No scored submissions yet</p>}
              <span className="pointer-events-none absolute inset-0 grid place-items-center"><ArrowUpDown className="size-6" style={{ color: INK }} strokeWidth={1.8} /></span>
            </div>
            <p className="mt-5 text-[30px] font-medium leading-none tracking-tight" style={{ fontFamily: DISPLAY, color: INK }}>{data.average === null ? "No scores yet" : `${data.average}% average`}</p>
            <Caption>Out of {fmt(data.max)} points</Caption>
          </Card>

          {n > 0 && (
            <Card title="Questions" onArrow={() => setSel(Math.max(0, hardest))}>
              <div className="mt-2 flex h-[220px] items-end justify-between gap-1 overflow-x-auto pb-0.5 pt-12">
                {data.accuracy.map((p, i) => {
                  const on = i === sel;
                  return (
                    <button key={i} type="button" onClick={() => setSel(i)} aria-label={`Question ${i + 1}, ${p}% correct`} aria-pressed={on} className="flex h-full min-w-[26px] flex-1 flex-col items-center justify-end gap-3">
                      <span className="relative flex w-full flex-1 justify-center">
                        <span className="relative h-full overflow-visible rounded-full" style={{ width: bar, backgroundColor: TRACK }}>
                          <span className="absolute inset-x-0 bottom-0 rounded-full" style={{ height: shown ? `${Math.max(p, 3)}%` : "0%", backgroundColor: on ? VIOLET : INK, transition: `height .9s cubic-bezier(.22,1,.36,1) ${i * 45}ms, background-color .3s` }} />
                          {on && (
                            <span className="absolute left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-medium text-white" style={{ bottom: "calc(100% + 8px)", backgroundColor: INK }}>
                              Q{i + 1} {p}%
                              <span className="absolute left-1/2 top-full size-2 -translate-x-1/2 -translate-y-1 rotate-45" style={{ backgroundColor: INK }} />
                            </span>
                          )}
                        </span>
                      </span>
                      <span className="text-[11px] transition-all" style={{ color: on ? INK : MUTED, fontWeight: on ? 700 : 500 }}>Q{i + 1}</span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-5 text-[30px] font-medium leading-none tracking-tight" style={{ fontFamily: DISPLAY, color: INK }}>{hardest >= 0 ? `Q${hardest + 1} hardest` : "Questions"}</p>
              <Caption>{hardest >= 0 ? `Only ${data.accuracy[hardest]}% got it right` : ""}</Caption>
            </Card>
          )}
        </div>

        <div className="mt-8 grid grid-cols-5 gap-3">
          <div className="relative col-span-3 overflow-hidden rounded-[28px] p-5" style={{ background: INK }}>
            <span className="pointer-events-none absolute inset-0" style={{ backgroundImage: "repeating-linear-gradient(45deg,rgba(255,255,255,0.05) 0 3px,transparent 3px 9px)" }} />
            <div className="relative flex items-center justify-between"><p className="text-[9.5px] font-medium uppercase tracking-[0.1em]" style={{ color: "#B7B2DE" }}>Class average</p><span className="grid size-8 place-items-center rounded-full" style={{ backgroundColor: VIOLET }}><TrendingUp className="size-[15px] text-white" strokeWidth={2} /></span></div>
            <p className="relative mt-6 flex items-baseline gap-1"><span className="text-[54px] font-medium leading-none tracking-tight text-white" style={{ fontFamily: DISPLAY }}>{data.average === null ? "–" : data.average}</span>{data.average !== null && <span className="text-[20px] font-medium" style={{ color: "#B7B2DE" }}>%</span>}</p>
            <div className="relative mt-5 flex gap-1">{Array.from({ length: 10 }, (_, i) => <span key={i} className="h-2 flex-1 rounded-full" style={{ backgroundColor: shown && data.average !== null && i < Math.round(data.average / 10) ? "#8F84FF" : "rgba(255,255,255,0.14)", transition: `background-color .4s ease ${i * 60}ms` }} />)}</div>
            <p className="relative mt-2.5 text-[10.5px] font-medium uppercase tracking-[0.1em]" style={{ color: "#B7B2DE" }}>Out of {fmt(data.max)} points</p>
          </div>
          <div className="col-span-2 flex flex-col gap-3">
            {[
              { label: "Submitted", icon: Users, value: String(data.submitted), unit: "", sub: data.submitted === 1 ? "student" : "students", strong: false },
              { label: "Top scorer", icon: Award, value: data.top ? fmt(data.top.score) : "–", unit: data.top ? "pts" : "", sub: data.top ? data.top.name.split(" ")[0]! : "No scores yet", strong: true },
            ].map((s) => (
              <div key={s.label} className="flex flex-1 flex-col justify-between rounded-[24px] p-4" style={{ background: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.8)", boxShadow: "0 18px 40px -26px rgba(91,77,232,0.45)", backdropFilter: "blur(14px)" }}>
                <div className="flex items-center justify-between gap-2"><p className="truncate text-[9.5px] font-medium uppercase tracking-[0.1em]" style={{ color: MUTED }}>{s.label}</p><span className="grid size-8 shrink-0 place-items-center rounded-full" style={{ backgroundColor: SEP }}><s.icon className="size-[15px]" style={{ color: VIOLET }} strokeWidth={2} /></span></div>
                <div className="mt-4 min-w-0">
                  <p className="flex items-baseline gap-1"><span className="text-[32px] font-medium leading-none tracking-tight" style={{ fontFamily: DISPLAY, color: INK }}>{s.value}</span>{s.unit && <span className="text-[12px] font-medium" style={{ color: MUTED }}>{s.unit}</span>}</p>
                  <p className="mt-1.5 truncate text-[11px]" style={{ color: s.strong ? INK : MUTED, fontWeight: s.strong ? 600 : 500 }}>{s.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      
</main>
    </div>
  );
}