import { useEffect, useRef, useCallback, useState } from "react";
import { io, Socket } from "socket.io-client";
import type { WhiteboardElement } from "./types";

const API_BASE_URL = "https://convospace-backend.onrender.com";

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
  roomId: string,
  setElements: React.Dispatch<React.SetStateAction<WhiteboardElement[]>>,
  identity?: CollabIdentity | null,
) {
  const socketRef      = useRef<Socket | null>(null);
  const serverMapRef   = useRef<Map<string, WhiteboardElement>>(new Map());
  const lastSentMapRef = useRef<Map<string, WhiteboardElement>>(new Map());
  const versionRef     = useRef(0);
  const applyingRemote = useRef(false);

  // Keep latest values in refs so callbacks never capture stale closures
  const roomIdRef    = useRef(roomId);
  const identityRef  = useRef(identity);
  roomIdRef.current   = roomId;
  identityRef.current = identity;

  // currentRoom in a ref so syncElements reads it without needing to be recreated
  const currentRoomRef = useRef<string | null>(null);

  const [connected,   setConnected]   = useState(false);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [users,       setUsers]       = useState<CollabUser[]>([]);
  const [self,        setSelf]        = useState<CollabUser | null>(null);
  const [cursors,     setCursors]     = useState<Record<string, RemoteCursor>>({});

  const buildUserInfo = () => {
    const id = identityRef.current;
    if (!id) return null;
    const boardTitle = new URLSearchParams(window.location.search).get("name");
    return {
      id: id.id,
      name: id.name,
      firstName: id.firstName ?? id.name.split(" ")[0],
      email: id.email ?? null,
      profilePicture: id.profilePicture ?? null,
      boardTitle: boardTitle ? decodeURIComponent(boardTitle) : null,
    };
  };

  // Generation counter: incremented every time we push remote state into React.
  // syncElements checks this to skip sending back changes that came from remote.
  const remoteGenRef     = useRef(0);
  const lastSyncedGenRef = useRef(0);

  const flushToCanvas = useCallback(() => {
    const els = Array.from(serverMapRef.current.values());
    remoteGenRef.current += 1;          // mark this as a remote-origin update
    applyingRemote.current = true;
    setElements(els);
    // Keep applyingRemote true for two frames so the syncElements effect that
    // fires after setElements can see it reliably.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { applyingRemote.current = false; });
    });
  }, [setElements]);

  // Socket setup — runs ONCE. All dynamic values read from refs.
  useEffect(() => {
    const socket = io(API_BASE_URL, {
      transports: ["websocket"],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    const doJoin = () => {
      socket.emit("whiteboard:join", {
        roomId: roomIdRef.current,
        userInfo: buildUserInfo(),
      });
    };

    socket.on("connect", () => { setConnected(true); doJoin(); });

    socket.on("disconnect", () => {
      setConnected(false);
      currentRoomRef.current = null;
      setCursors({});
    });

    socket.on("whiteboard:init", ({ roomId: rid, version, objects, users: us, self: s }) => {
      versionRef.current = version;
      currentRoomRef.current = rid;
      setCurrentRoom(rid);
      setUsers(us);
      setSelf(s);
      const map = serverMapRef.current;
      map.clear();
      for (const obj of Object.values(objects) as WhiteboardElement[]) map.set(obj.id, obj);
      lastSentMapRef.current = new Map(map);
      flushToCanvas();
    });

    socket.on("whiteboard:op_ack", ({ op, version, sourceSocketId }) => {
      versionRef.current = version;
      if (sourceSocketId === socket.id) return;
      applyOpToMap(serverMapRef.current, op);
      lastSentMapRef.current = new Map(serverMapRef.current);
      flushToCanvas();
    });

    socket.on("whiteboard:resync", ({ version, objects }) => {
      versionRef.current = version;
      const map = serverMapRef.current;
      map.clear();
      for (const obj of Object.values(objects) as WhiteboardElement[]) map.set(obj.id, obj);
      lastSentMapRef.current = new Map(map);
      flushToCanvas();
    });

    socket.on("whiteboard:user_joined", ({ user }) => {
      setUsers(prev => [...prev.filter(u => u.id !== user.id), user]);
    });
    socket.on("whiteboard:user_left", ({ userId }) => {
      setUsers(prev => prev.filter(u => u.id !== userId));
      setCursors(prev => { const n = { ...prev }; delete n[userId]; return n; });
    });
    socket.on("whiteboard:user_status", ({ userId, status }) => {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status } : u));
    });
    socket.on("whiteboard:cursor", ({ userId, x, y, color, name, firstName, profilePicture }) => {
      setCursors(prev => ({
        ...prev,
        [userId]: { userId, x, y, color, name, firstName: firstName ?? null, profilePicture: profilePicture ?? null },
      }));
    });
    socket.on("whiteboard:error", ({ message }) => console.warn("[Collab] server error:", message));

    return () => {
      socket.disconnect();
      socketRef.current = null;
      currentRoomRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — all values read from refs

  // Re-join when identity resolves after socket connected (auth loads async)
  const prevIdentityId = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const newId = identity?.id ?? null;
    if (prevIdentityId.current === undefined) { prevIdentityId.current = newId; return; }
    if (prevIdentityId.current === newId) return;
    prevIdentityId.current = newId;
    if (socketRef.current?.connected) {
      socketRef.current.emit("whiteboard:join", {
        roomId: roomIdRef.current,
        userInfo: buildUserInfo(),
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity?.id]);

  // Sync local → server. Zero deps — reads everything from refs, never stale.
  const syncElements = useCallback((localElements: WhiteboardElement[]) => {
    // Skip if we are currently applying a remote update OR if the generation
    // has advanced since the last sync (meaning setElements was just called
    // with remote data and React hasn't re-rendered the effect yet).
    if (applyingRemote.current) return;
    if (remoteGenRef.current !== lastSyncedGenRef.current) {
      lastSyncedGenRef.current = remoteGenRef.current;
      return;
    }
    const socket = socketRef.current;
    if (!socket?.connected || !currentRoomRef.current) return;

    const nextMap = toMap(localElements);
    const ops = diff(lastSentMapRef.current, nextMap);
    if (ops.length === 0) return;

    lastSentMapRef.current = new Map(nextMap);
    serverMapRef.current   = new Map(nextMap);

    if (ops.length === 1) {
      socket.emit("whiteboard:op", { op: ops[0], clientVersion: versionRef.current });
    } else {
      socket.emit("whiteboard:batch", { ops, clientVersion: versionRef.current });
    }
  }, []);

  const cursorThrottle = useRef(0);
  const sendCursor = useCallback((x: number, y: number) => {
    const now = Date.now();
    if (now - cursorThrottle.current < 40) return;
    cursorThrottle.current = now;
    socketRef.current?.emit("whiteboard:cursor", { x, y });
  }, []);

  return { connected, roomId: currentRoom, users, self, cursors, syncElements, sendCursor };
}