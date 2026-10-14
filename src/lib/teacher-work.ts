import { useSyncExternalStore } from "react";
import type { WorkType } from "@/components/WorkFloatingActionButton";

export const CLASS_SIZE = 52;

export type Shared = {
  id: string;
  title: string;
  type: WorkType;
  due: string;
  submitted: number;
  total: number;
  status: "open" | "grading" | "done";
  instructions?: string;
  points?: number;
  /** "all" for the whole class, otherwise the ids of the chosen students. */
  assignedTo?: "all" | string[];
};

/* -------------------------------------------------------------------------- */
/*  Students (placeholder roster: replace with the real class list)           */
/* -------------------------------------------------------------------------- */

const FIRST = ["Ade", "Bisi", "Chidi", "Dayo", "Efe", "Funke", "Gbenga", "Halima", "Ife", "Jide", "Kemi", "Lola", "Musa"];
const LAST = ["Okafor", "Adeyemi", "Bello", "Eze", "Balogun", "Yusuf", "Obi", "Ajayi", "Ogunleye", "Ibrahim", "Nwosu", "Salami", "Olawale"];

export const STUDENTS: { id: string; name: string }[] = Array.from({ length: CLASS_SIZE }, (_, i) => ({
  id: `st${i + 1}`,
  // Every first name pairs with a different surname in each block of 13, so all 52 are unique.
  name: `${FIRST[i % 13]!} ${LAST[(i * 5 + Math.floor(i / 13)) % 13]!}`,
}));

/* -------------------------------------------------------------------------- */
/*  Store                                                                     */
/*  Lives in memory, so it survives moving between pages but not a full       */
/*  reload. Swap addWork / useSharedWork for your API when it is ready.       */
/* -------------------------------------------------------------------------- */

let items: Shared[] = [
  { id: "s2", title: "Kinematics CBT Test", type: "Assessment", due: "Closed Oct 6", submitted: 52, total: 52, status: "done" },
  { id: "s3", title: "Lecture 5 - Dry Friction", type: "Classwork", due: "Posted today", submitted: 38, total: 52, status: "open" },
  { id: "s4", title: "Moments & Couples Quiz", type: "Assessment", due: "Grading", submitted: 52, total: 52, status: "grading" },
];

const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => items;

export function addWork(work: Shared) {
  items = [work, ...items];
  listeners.forEach((l) => l());
}

export function useSharedWork(): Shared[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
