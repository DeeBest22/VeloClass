// Storage adapter for supabase-js auth. Safe on both server (SSR) and client.
type AuthStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

const memory = new Map<string, string>();

export function brokeredPreviewStorage(): AuthStorage {
  const ls = (): Storage | null => {
    try {
      return typeof window !== 'undefined' ? window.localStorage : null;
    } catch {
      return null; // blocked (private mode / sandboxed iframe)
    }
  };

  return {
    getItem: (key) => ls()?.getItem(key) ?? memory.get(key) ?? null,
    setItem: (key, value) => {
      const store = ls();
      if (store) {
        try { store.setItem(key, value); return; } catch { /* quota */ }
      }
      memory.set(key, value);
    },
    removeItem: (key) => {
      try { ls()?.removeItem(key); } catch { /* ignore */ }
      memory.delete(key);
    },
  };
}
