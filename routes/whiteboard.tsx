import { createFileRoute } from "@tanstack/react-router";
import Whiteboard from "./whiteboard/Whiteboard";

export const Route = createFileRoute("/whiteboard")({
  head: () => ({
    meta: [
      { title: "Whiteboard | Classroom" },
      { name: "description", content: "A private whiteboard for drawing, notes, and diagrams." },
    ],
  }),
  component: Whiteboard,
});
