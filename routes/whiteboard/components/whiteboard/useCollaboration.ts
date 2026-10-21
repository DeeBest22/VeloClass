import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/client";
import type { WhiteboardElement } from "./types";

export interface CollabUser {
  id: string;
  name: string;
  firstName: string | null;
  email: string | null;
  profilePicture: string | null;
  color: string;
  cursor: { x: number; y: number } | null;
  status: "active" | "idle";
}

export interface RemoteCursor {
  userId: string;
  name: string;
  firstName: string | null;
  profilePicture: string | null;
  color: string;
  x: number;
  y: number;
}

export interface CollabIdentity {
  id: string;
  name: string;
  firstName?: string;
  email?: string;
  profilePicture?: string | null;
}

const COLORS = ["#e03131", "#2f9e44", "#1971c2", "#f08c00", "#7048e8", "#0c8599", "#e64980"];
const colorOf = (id: string) => COLORS[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length] ?? "#1971c2";

type Op =
  | { type: "add";    objectId: string; objectData: WhiteboardElement }
  | { type: "modify"; objectId: string; delta: Partial<WhiteboardElement> }
  | { type: "delete"; objectId: string }
  | { type: "batch";  ops: Op[] }
  | { type: "clear" };

function toMap(els: WhiteboardElement[]): Map<string, WhiteboardElement> {
  const m = new Map<string, WhiteboardElement>();
  for (const el of els) if (!el.isDeleted) m.set(el.id, el);
  return m;
}

function diff(
  prev: Map<string, WhiteboardElement>,
  next: Map<string, WhiteboardElement>,
): Op[] {
  const ops: Op[] = [];
  for (const [id, el] of next) {
    if (!prev.has(id)) {
      ops.push({ type: "add", objectId: id, objectData: el });
    } else if (JSON.stringify(prev.get(id)) !== JSON.stringify(el)) {
      ops.push({ type: "modify", objectId: id, delta: el });
    }
  }
  for (const id of prev.keys()) {
    if (!next.has(id)) ops.push({ type: "delete", objectId: id });
  }
  return ops;
}

function applyOpToMap(map: Map<string, WhiteboardElement>, op: Op) {
  const one = (o: Op) => {
    switch (o.type) {
      case "add":    map.set(o.objectId, o.objectData); break;
      case "modify": map.set(o.objectId, { ...(map.get(o.objectId) ?? {}), ...o.delta } as WhiteboardElement); break;
      case "delete": map.delete(o.objectId); break;
      case "batch":  o.ops.forEach(one); break;
      case "clear":  map.clear(); break;
    }
  };
  one(op);
}

export function useCollaboration(
  roomId: string | undefined,
  setElements: React.Dispatch<React.SetStateAction<WhiteboardElement[]>>,
  identity?: CollabIdentity | null,
) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastSent = useRef<Map<string, WhiteboardElement>>(new Map()); // what everyone already has
  const pending = useRef<WhiteboardElement[] | null>(null);
  const latest = useRef<WhiteboardElement[]>([]);
  const cursor = useRef<{ x: number; y: number } | null>(null);
  const cursorDirty = useRef(false);
  const gotState = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const saveTimer = useRef<number | undefined>(undefined);
  const idRef = useRef(identity);
  idRef.current = identity;
  const roomRef = useRef(roomId);
  roomRef.current = roomId;
  const me = identity?.id;

  const [connected, setConnected] = useState(false);
  const [users, setUsers] = useState<CollabUser[]>([]);
  const [cursors, setCursors] = useState<Record<string, RemoteCursor>>({});

  /* Someone else changed the board: merge their changes into ours without echoing them back. */
  const applyRemote = useCallback((ops: Op[]) => {
    ops.forEach((o) => applyOpToMap(lastSent.current, o));
    setElements((prev) => {
      const m = new Map(prev.map((e) => [e.id, e] as const));
      ops.forEach((o) => applyOpToMap(m, o));
      return [...m.values()];
    });
  }, [setElements]);

  const load = useCallback((els: WhiteboardElement[]) => {
    if (latest.current.length === 0) {
      lastSent.current = toMap(els);
      setElements(els);
    } else applyRemote(els.map((el) => ({ type: "add", objectId: el.id, objectData: el }) as Op));
  }, [setElements, applyRemote]);

  const save = useCallback(() => {
    saveTimer.current = undefined;
    if (!roomRef.current) return;
    void (supabase as any).rpc("save_class_whiteboard", { p_class_id: roomRef.current, p_elements: latest.current.filter((e) => !e.isDeleted) });
  }, []);

  /* At most one message every 120ms: our changes since last time plus our pointer position. */
  const flush = useCallback(() => {
    timer.current = undefined;
    const channel = channelRef.current;
    const id = idRef.current;
    if (!channel || !id) return;
    const ops: Op[] = [];
    if (pending.current) {
      const next = toMap(pending.current);
      ops.push(...diff(lastSent.current, next));
      lastSent.current = next;
      pending.current = null;
    }
    const cur = cursorDirty.current ? cursor.current : null;
    cursorDirty.current = false;
    if (!ops.length && !cur) return;
    void channel.send({ type: "broadcast", event: "wb", payload: { from: id.id, name: id.name, firstName: id.firstName ?? null, pic: id.profilePicture ?? null, ops, cursor: cur } });
    if (ops.length) {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(save, 2500);
    }
  }, [save]);

  const kick = () => { if (timer.current === undefined) timer.current = window.setTimeout(flush, 120); };

  useEffect(() => {
    if (!roomId || !me) return;
    gotState.current = false;
    const channel = supabase.channel(`whiteboard:${roomId}`, { config: { presence: { key: me } } });
    channelRef.current = channel;
    channel
      .on("presence", { event: "sync" }, () => {
        const st = channel.presenceState<{ name: string; firstName: string | null; pic: string | null }>();
        setUsers((Object.entries(st) as [string, { name: string; firstName: string | null; pic: string | null }[]][]).map(([uid, metas]) => ({ id: uid, name: metas[0]?.name ?? "Member", firstName: metas[0]?.firstName ?? null, email: null, profilePicture: metas[0]?.pic ?? null, color: colorOf(uid), cursor: null, status: "active" as const })));
        setCursors((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => k in st)));
      })
      .on("broadcast", { event: "wb" }, ({ payload }: { payload: any }) => {
        if (payload.from === me) return;
        if (payload.ops?.length) applyRemote(payload.ops);
        if (payload.cursor) setCursors((p) => ({ ...p, [payload.from]: { userId: payload.from, name: payload.name ?? "Member", firstName: payload.firstName ?? null, profilePicture: payload.pic ?? null, color: colorOf(payload.from), x: payload.cursor.x, y: payload.cursor.y } }));
      })
      .on("broadcast", { event: "wb-hello" }, ({ payload }: { payload: any }) => {
        // a newcomer asks for the live board; the member with the smallest id answers
        const ids = Object.keys(channel.presenceState()).filter((k) => k !== payload.from).sort();
        if (ids[0] !== me) return;
        void channel.send({ type: "broadcast", event: "wb-state", payload: { to: payload.from, elements: [...toMap(latest.current).values()] } });
      })
      .on("broadcast", { event: "wb-state" }, ({ payload }: { payload: any }) => {
        if (payload.to !== me || gotState.current) return;
        gotState.current = true;
        load(payload.elements as WhiteboardElement[]);
      })
      .subscribe(async (status: string) => {
        if (status !== "SUBSCRIBED") { setConnected(false); return; }
        setConnected(true);
        const id = idRef.current;
        await channel.track({ name: id?.name ?? "Member", firstName: id?.firstName ?? null, pic: id?.profilePicture ?? null });
        const { data } = await (supabase as any).rpc("get_class_whiteboard", { p_class_id: roomId });
        if (!gotState.current && Array.isArray(data) && data.length) load(data as WhiteboardElement[]);
        void channel.send({ type: "broadcast", event: "wb-hello", payload: { from: me } });
      });
    return () => {
      window.clearTimeout(timer.current);
      timer.current = undefined;
      if (saveTimer.current !== undefined) { window.clearTimeout(saveTimer.current); save(); }
      channelRef.current = null;
      setConnected(false);
      void supabase.removeChannel(channel);
    };
  }, [roomId, me, applyRemote, load, save]);

  const syncElements = useCallback((localElements: WhiteboardElement[]) => {
    latest.current = localElements;
    if (!channelRef.current) return;
    pending.current = localElements;
    kick();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flush]);

  const sendCursor = useCallback((x: number, y: number) => {
    cursor.current = { x, y };
    cursorDirty.current = true;
    if (channelRef.current) kick();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flush]);

  return { connected, roomId: roomId ?? null, users, self: users.find((u) => u.id === me) ?? null, cursors, syncElements, sendCursor };
}