import { useCallback, useEffect, useState } from "react";

/** Returns true when viewport width <= breakpoint */
export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= breakpoint);
  
  useEffect(() => {
    let rafId: number;
    const handler = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => setIsMobile(window.innerWidth <= breakpoint));
    };
    window.addEventListener("resize", handler, { passive: true });
    return () => { window.removeEventListener("resize", handler); cancelAnimationFrame(rafId); };
  }, [breakpoint]);
  
  return isMobile;
}

export function useIsTablet() {
  const [isTablet, setIsTablet] = useState(() => {
    const w = window.innerWidth;
    return w > 480 && w <= 1024;
  });
  
  useEffect(() => {
    let rafId: number;
    const handler = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const w = window.innerWidth;
        setIsTablet(w > 480 && w <= 1024);
      });
    };
    window.addEventListener("resize", handler, { passive: true });
    return () => { window.removeEventListener("resize", handler); cancelAnimationFrame(rafId); };
  }, []);
  
  return isTablet;
}
