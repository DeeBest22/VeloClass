import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Calendar, Video, LogIn, Plus } from "lucide-react";

const generateMeetingId = (): string => {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  return Array.from({ length: 10 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
};

interface SpeedDialOption {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}

const FloatingCallButton = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  // `rendered` keeps the options in the DOM during the closing animation,
  // then removes them fully once the animation finishes (~300ms).
  const [rendered, setRendered] = useState(false);
  const [animating, setAnimating] = useState(false);

  const toggle = () => {
    if (isOpen) {
      // Start close animation, then unmount after it finishes
      setAnimating(false);
      setIsOpen(false);
      setTimeout(() => setRendered(false), 300);
    } else {
      setRendered(true);
      setIsOpen(true);
      // Tiny delay so the mount triggers the CSS enter transition
      requestAnimationFrame(() => requestAnimationFrame(() => setAnimating(true)));
    }
  };

  const close = () => {
    setAnimating(false);
    setIsOpen(false);
    setTimeout(() => setRendered(false), 300);
  };

  const options: SpeedDialOption[] = [
    {
      label: "Schedule Meeting",
      icon: <Calendar className="h-4 w-4" />,
      onClick: () => {
        close();
        navigate({ to: "/schedule" });
      },
    },
    {
      label: "Create Class",
      icon: <Video className="h-4 w-4" />,
      onClick: () => {
        close();
        const id = generateMeetingId();
        navigate({ to: "/create" });
      },
    },
    {
      label: "Join Class",
      icon: <LogIn className="h-4 w-4" />,
      onClick: () => {
        close();
        navigate({ to: "/join" });
      },
    },
  ];

  return (
    <>
      <style>{`
        .fab-backdrop {
          position: fixed;
          inset: 0;
          z-index: 48;
          background: transparent;
        }

        .fab-container {
          position: fixed;
          bottom: calc(
            80px
            + max(env(safe-area-inset-bottom, 0px), 0px)
            + 14px
          );
          right: 24px;
          z-index: 99;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 12px;
          /* Only as wide as the FAB button itself when options are not shown */
          width: fit-content;
        }

        .fab-options {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 10px;
        }

        .fab-option-row {
          display: flex;
          align-items: center;
          gap: 10px;
          opacity: 0;
          transform: translateY(10px);
          pointer-events: none;
          transition:
            opacity 200ms ease,
            transform 220ms cubic-bezier(0.4, 0, 0.2, 1);
        }

        .fab-option-row.visible {
          opacity: 1;
          transform: translateY(0);
          pointer-events: auto;
        }

        .fab-option-row:nth-child(1) { transition-delay: 60ms; }
        .fab-option-row:nth-child(2) { transition-delay: 30ms; }
        .fab-option-row:nth-child(3) { transition-delay: 0ms; }

        .fab-option-row.visible:nth-child(1) { transition-delay: 0ms; }
        .fab-option-row.visible:nth-child(2) { transition-delay: 40ms; }
        .fab-option-row.visible:nth-child(3) { transition-delay: 80ms; }

        .fab-label-pill {
          background: #0f0f0f;
          color: #ffffff;
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.01em;
          padding: 7px 14px;
          border-radius: 10px;
          border: 1.5px solid rgba(255,255,255,0.07);
          box-shadow:
            0 0 0 1px rgba(0,0,0,0.3),
            0 3px 10px rgba(0,0,0,0.25);
          white-space: nowrap;
          cursor: pointer;
          transition: background 120ms ease;
        }

        .fab-label-pill:hover { background: #1a1a1a; }
        .fab-label-pill:active { background: #222; }

        .fab-mini-btn {
          width: 42px;
          height: 42px;
          border-radius: 13px;
          background: #6c63ff;
          border: none;
          box-shadow:
            0 0 0 1px rgba(108, 99, 255, 0.3),
            0 4px 12px rgba(108, 99, 255, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #ffffff;
          flex-shrink: 0;
          transition: background 120ms ease, transform 100ms ease, box-shadow 120ms ease;
        }

        .fab-mini-btn:hover {
          background: #7b74ff;
          box-shadow:
            0 0 0 1px rgba(108, 99, 255, 0.4),
            0 6px 16px rgba(108, 99, 255, 0.4);
        }

        .fab-mini-btn:active {
          transform: scale(0.93);
          background: #5a52e0;
        }

        /* Main FAB */
        .fab-main {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          background: #6c63ff;
          border: none;
          box-shadow:
            0 0 0 1px rgba(108, 99, 255, 0.25),
            0 4px 16px rgba(108, 99, 255, 0.45),
            0 1px 4px rgba(0,0,0,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #ffffff;
          transition: transform 100ms ease, background 150ms ease, box-shadow 150ms ease;
          flex-shrink: 0;
        }

        .fab-main:hover {
          background: #7b74ff;
          box-shadow:
            0 0 0 1px rgba(108, 99, 255, 0.35),
            0 6px 22px rgba(108, 99, 255, 0.5);
        }

        .fab-main:active {
          transform: scale(0.95);
          background: #5a52e0;
        }

        .fab-plus-icon {
          transition: transform 280ms cubic-bezier(0.4, 0, 0.2, 1);
        }

        .fab-plus-icon.rotated {
          transform: rotate(45deg);
        }
      `}</style>

      {isOpen && <div className="fab-backdrop" onClick={close} />}

      <div className="fab-container">
        {/* Options are fully removed from DOM when closed — no invisible hit-area */}
        {rendered && (
          <div className="fab-options">
            {options.map((opt, i) => (
              <div key={i} className={`fab-option-row${animating ? " visible" : ""}`}>
                <span className="fab-label-pill" onClick={opt.onClick}>
                  {opt.label}
                </span>
                <button className="fab-mini-btn" onClick={opt.onClick} aria-label={opt.label}>
                  {opt.icon}
                </button>
              </div>
            ))}
          </div>
        )}

        <button className="fab-main" onClick={toggle} aria-label="Meeting options">
          <Plus className={`h-5 w-5 fab-plus-icon${isOpen ? " rotated" : ""}`} />
        </button>
      </div>
    </>
  );
};

export default FloatingCallButton;