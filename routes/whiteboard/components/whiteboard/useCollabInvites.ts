import { useEffect, useRef, useState, useCallback } from "react";
import { API_BASE_URL } from "../../../config";

export interface CollabInvite {
  id: string;
  roomId: string;
  boardTitle: string;
  inviterName: string;
  inviterEmail?: string;
  invitedAt: string; // ISO string
  status: "pending" | "accepted" | "declined";
}

const POLL_INTERVAL_MS = 30_000; // re-check every 30s

export function useCollabInvites(userId: string | undefined) {
  const [invites, setInvites]   = useState<CollabInvite[]>([]);
  const [loading, setLoading]   = useState(false);
  const timerRef                = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchInvites = useCallback(async () => {
    if (!userId) return;
    const token = localStorage.getItem("sessionToken");
    try {
      const res = await fetch(`${API_BASE_URL}/api/boards/invites/pending`, {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return;
      const data: CollabInvite[] = await res.json();
      setInvites(data);
    } catch {
      // Network error — silently ignore
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) { setInvites([]); return; }
    setLoading(true);
    fetchInvites();
    timerRef.current = setInterval(fetchInvites, POLL_INTERVAL_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [userId, fetchInvites]);

  const respond = useCallback(async (inviteId: string, action: "accept" | "decline") => {
    const token = localStorage.getItem("sessionToken");
    try {
      const res = await fetch(`${API_BASE_URL}/api/boards/invites/${inviteId}/${action}`, {
        method: "POST",
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        // Optimistically remove from pending list regardless of accept/decline
        setInvites(prev => prev.filter(i => i.id !== inviteId));
        return true;
      }
    } catch {
      // ignore
    }
    return false;
  }, []);

  return { invites, loading, refetch: fetchInvites, respond };
}