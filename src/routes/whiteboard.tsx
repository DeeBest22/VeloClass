import { createFileRoute, useRouter } from "@tanstack/react-router";
import Whiteboard from "./whiteboard/Whiteboard";

export const Route = createFileRoute("/whiteboard")({
  validateSearch: (search: Record<string, unknown>): { classId?: string } => {
    const classId = search["classId"];
    return typeof classId === "string" ? { classId } : {};
  },
  head: () => ({
    meta: [
      { title: "Whiteboard | Classroom" },
      { name: "description", content: "A whiteboard for drawing, notes, and diagrams. Open it from a class to draw together." },
    ],
  }),
  component: WhiteboardPage,
});

/* With a classId the board is shared with the class; without one it stays private. Close returns to where you came from. */
function WhiteboardPage() {
  const router = useRouter();
  const { classId } = Route.useSearch();
  return <Whiteboard classId={classId} onClose={() => router.history.back()} />;
}