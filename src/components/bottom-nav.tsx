import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { MessageSquareText } from "lucide-react";

const HomeIcon = ({ filled }: { filled?: boolean }) => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={filled ? 0.5 : 1.6} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 10.5L12 3l9 7.5" />
    <path d="M5 9.5V19a1 1 0 001 1h4v-5a1 1 0 011-1h2a1 1 0 011 1v5h4a1 1 0 001-1V9.5" />
  </svg>
);

const CalendarIcon = ({ filled }: { filled?: boolean }) => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={filled ? 2.4 : 1.6} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const ChatIcon = ({ filled }: { filled?: boolean }) => (
  <MessageSquareText size={22} strokeWidth={filled ? 2.4 : 1.6} />
);

const ProfileIcon = ({ filled }: { filled?: boolean }) => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={filled ? 0.5 : 1.6} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4.5" />
    <path d="M20 21c0-3.87-3.58-7-8-7s-8 3.13-8 7" />
  </svg>
);

export type NavTab = "home" | "My Class" | "chat" | "profile";

interface BottomNavProps {
  activeTab?: NavTab;
  onTabChange?: (tab: NavTab) => void;
}

const tabs: { id: NavTab; label: string; path: string }[] = [
  { id: "home",     label: "Home",     path: "/"         },
  { id: "calendar", label: "My Class", path: "/courses" },
  { id: "chat",     label: "Chat",     path: "/chat"      },
  { id: "profile",  label: "Profile",  path: "/profile"  },
];

const TabIcon = ({ id, filled }: { id: NavTab; filled: boolean }) => {
  if (id === "home")     return <HomeIcon filled={filled} />;
  if (id === "calendar") return <CalendarIcon filled={filled} />;
  if (id === "chat")     return <ChatIcon filled={filled} />;
  return <ProfileIcon filled={filled} />;
};

const INK = "#14161F";
const INK_SOFT = "#9A9AA2";

const BottomNav = ({ activeTab: controlledActiveTab, onTabChange }: BottomNavProps) => {
  const navigate = useNavigate();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  // Mounted-check guards against SSR, where `document` doesn't exist. Must stay
  // above any early return so hook order never changes between renders.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const activeTab = controlledActiveTab ??
    tabs.find((tab) => tab.path === currentPath)?.id ?? "home";

  const activeIndex = Math.max(0, tabs.findIndex((tab) => tab.id === activeTab));

  const handleTabClick = (tab: typeof tabs[0]) => {
    navigate({ to: tab.path });
    onTabChange?.(tab.id);
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed -bottom-px left-0 right-0 z-[100]">
      <nav
        className="bg-white"
        style={{
          borderTop: "1px solid rgba(0,0,0,0.06)",
          paddingBottom: "var(--safe-bottom)",
        }}
      >
        <div className="relative max-w-md mx-auto grid grid-cols-4 items-center px-3 py-2.5">
          {/*
            Indicator position is derived from activeIndex (a number), not measured
            from the DOM via layoutId/FLIP. That measurement approach was sensitive
            to scroll position during route transitions, which is what caused the
            indicator to animate in from the wrong direction. This is scroll-proof.
          */}

        
          <motion.span
            aria-hidden
           className="pointer-events-none absolute top-1.5 h-[3px] w-7 rounded-full"
            style={{ backgroundColor: INK }}
            animate={{
  left: `calc(12px + (100% - 24px) * ${(activeIndex + 0.5) / tabs.length} - 14px)`,
}}
            transition={{ type: "spring", stiffness: 500, damping: 32 }}
          />
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                whileTap={{ scale: 0.92 }}
                onClick={() => handleTabClick(tab)}
                className="relative flex flex-col items-center gap-1.5 px-2 py-1"
                role="tab"
                aria-selected={isActive}
                aria-label={tab.label}
              >
                <span style={{ color: isActive ? INK : INK_SOFT }}>
                  <TabIcon id={tab.id} filled={isActive} />
                </span>
                <span
                  className="text-xs font-medium"
                  style={{ color: isActive ? INK : INK_SOFT }}
                >
                  {tab.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </nav>
    </div>,
    document.body
  );
};

export default BottomNav;
