import { useNavigate, useRouter } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

/**
 * Shared back button. Goes back in history when there is something to go
 * back to, otherwise falls back to "/" so it never feels dead on a fresh load.
 */
export function BackButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const navigate = useNavigate();

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.history.back();
    } else {
      navigate({ to: "/" });
    }
  };

  return (
    <button
      type="button"
      onClick={goBack}
      aria-label="Go back"
      className={`group grid h-11 w-11 place-items-center rounded-full border border-border bg-card text-foreground transition-all duration-200 hover:bg-muted active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none ${className}`}
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <ChevronLeft
        className="h-5 w-5 transition-transform duration-200 group-hover:-translate-x-0.5 motion-reduce:transition-none"
        strokeWidth={2}
      />
    </button>
  );
}
