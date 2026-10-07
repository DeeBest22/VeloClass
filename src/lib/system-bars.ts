import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Capacitor, registerPlugin } from "@capacitor/core";

type Icons = "dark" | "light";

interface StatusBarControlPlugin {
  setIcons(options: { status?: Icons; nav?: Icons }): Promise<void>;
  getInsets(): Promise<{ top: number; bottom: number }>;
}

// Must match @CapacitorPlugin(name = "StatusBarControl") in MainActivity.java
const StatusBarControl = registerPlugin<StatusBarControlPlugin>("StatusBarControl");

const isNative = () => Capacitor.isNativePlatform();

/** Ask the native side for the real status/nav bar sizes and expose them to CSS. */
async function syncInsets() {
  if (!isNative()) return;
  try {
    const { top, bottom } = await StatusBarControl.getInsets();
    const style = document.documentElement.style;
    style.setProperty("--safe-top", `${top}px`);
    style.setProperty("--safe-bottom", `${bottom}px`);
  } catch {
    // Native plugin missing (old build). CSS falls back to env(safe-area-inset-*).
  }
}

/** Normalize any CSS color (hex, rgb, named) to [r, g, b]. */
function toRgb(color: string): [number, number, number] | null {
  const probe = document.createElement("div");
  probe.style.color = color;
  document.body.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();
  const m = resolved.match(/[\d.]+/g);
  if (!m || m.length < 3) return null;
  return [Number(m[0]), Number(m[1]), Number(m[2])];
}

function isLight(color: string): boolean {
  const rgb = toRgb(color);
  if (!rgb) return true;
  const [r, g, b] = rgb;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
}

const isSolid = (c: string) => !!c && c !== "transparent" && !/rgba\(.*,\s*0\)$/.test(c);

/**
 * Finds the color painted at a given y position.
 * Walks up from the element under the point until it finds a solid background.
 * For gradient or image headers, put data-theme-color="#0B1030" on the element.
 */
function colorAt(y: number): string | null {
  let el = document.elementFromPoint(window.innerWidth / 2, y) as HTMLElement | null;
  while (el) {
    const override = el.getAttribute("data-theme-color");
    if (override) return override;
    const bg = getComputedStyle(el).backgroundColor;
    if (isSolid(bg)) return bg;
    el = el.parentElement;
  }
  return null;
}

/**
 * Call once in the root component.
 *  - Native (Capacitor): keeps --safe-top / --safe-bottom in sync and switches the
 *    status bar and nav bar ICON color per page, based on what is behind them.
 *  - Plain browser: falls back to setting <meta name="theme-color">.
 */
export function useSystemBars() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    syncInsets();
  }, []);

  useEffect(() => {
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!isNative() && !meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }

    const apply = () => {
      const top = colorAt(2);
      if (isNative()) {
        const bottom = colorAt(window.innerHeight - 2);
        StatusBarControl.setIcons({
          status: top ? (isLight(top) ? "dark" : "light") : undefined,
          nav: bottom ? (isLight(bottom) ? "dark" : "light") : undefined,
        }).catch(() => {});
      } else if (top && meta) {
        meta.setAttribute("content", top);
      }
    };

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(apply);
    };

    // Wait two frames so the new route has painted before sampling
    raf = requestAnimationFrame(() => requestAnimationFrame(apply));
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, [pathname]);
}
