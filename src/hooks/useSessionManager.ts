import { useState, useEffect, useCallback } from 'react';
import { parseCollabLink, formatCollabLink, DEFAULT_RELAY_URL } from '../lib/link';
import { getIDBSessions, saveIDBSessions } from '../lib/idbSessionStore';

export interface WorkspaceSession {
  id: string;
  name: string;
  hash: string;
  createdAt: number;
}

const STORAGE_KEY = 'collab_workspace_sessions';

function createRoomLink(roomIdPrefix: string): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return formatCollabLink(DEFAULT_RELAY_URL, `${roomIdPrefix}-workspace`, bytes);
}

let _defaultSessions: WorkspaceSession[] | null = null;

function getDefaultSessions(): WorkspaceSession[] {
  if (!_defaultSessions) {
    _defaultSessions = [
      { id: '1', name: 'Main Canvas', hash: `#${createRoomLink('main-canvas')}`, createdAt: Date.now() },
      { id: '2', name: 'Design Sprint', hash: `#${createRoomLink('design-sprint')}`, createdAt: Date.now() - 3600000 },
    ];
  }
  return _defaultSessions;
}

export const useSessionManager = () => {
  const [sessions, setSessions] = useState<WorkspaceSession[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : getDefaultSessions();
    } catch {
      return getDefaultSessions();
    }
  });

  const [activeHash, setActiveHash] = useState<string>(() => {
    return window.location.hash || sessions[0]?.hash || `#${getDefaultSessions()[0].hash}`;
  });

  // Listen for hash changes in URL without full page reloads
  useEffect(() => {
    const handleHashChange = () => {
      const newHash = window.location.hash;
      setActiveHash(newHash);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Hydrate from IndexedDB on mount
  useEffect(() => {
    let active = true;
    getIDBSessions().then((idbSessions) => {
      if (active && idbSessions && idbSessions.length > 0) {
        setSessions(idbSessions);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Save sessions to local storage and IndexedDB
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch (e) {
      console.warn('Failed to persist workspace sessions to localStorage', e);
    }
    saveIDBSessions(sessions);
  }, [sessions]);

  const switchSession = useCallback((hash: string) => {
    const formattedHash = hash ? (hash.startsWith('#') ? hash : `#${hash}`) : '';
    if (window.location.hash !== formattedHash) {
      window.location.hash = formattedHash;
    }
    setActiveHash(formattedHash);
  }, []);

  const addSession = useCallback((name: string, hashInput?: string) => {
    let hash: string;
    if (hashInput && hashInput.trim()) {
      const trimmed = hashInput.trim().replace(/^#/, '');
      const testParse = parseCollabLink(trimmed);
      if (!('error' in testParse)) {
        hash = `#${trimmed}`;
      } else {
        const cleanId = trimmed.replaceAll(/[^A-Za-z0-9_-]/g, '-').slice(0, 32);
        const roomId = cleanId.length >= 10 ? cleanId : `${cleanId}-workspace`;
        const bytes = new Uint8Array(32);
        crypto.getRandomValues(bytes);
        hash = `#${formatCollabLink(DEFAULT_RELAY_URL, roomId, bytes)}`;
      }
    } else {
      const prefix = name.toLowerCase().replaceAll(/[^a-z0-9]/g, '-').slice(0, 16) || 'vps';
      hash = `#${createRoomLink(prefix)}`;
    }

    setSessions((prev) => {
      const sessionName = name.trim() || 'Workspace Session';
      const existingIdx = prev.findIndex((s) => s.hash === hash);
      if (existingIdx !== -1) {
        const existing = prev[existingIdx];
        // Update the session name if provided name is different or replaces a generic fallback
        if (sessionName && (existing.name !== sessionName)) {
          const updated = [...prev];
          updated[existingIdx] = { ...existing, name: sessionName };
          return updated;
        }
        return prev;
      }
      const newSession: WorkspaceSession = {
        id: crypto.randomUUID(),
        name: sessionName,
        hash,
        createdAt: Date.now(),
      };
      return [...prev, newSession];
    });

    switchSession(hash);
  }, [switchSession]);

  const removeSession = useCallback((id: string) => {
    let nextHash: string | null = null;
    setSessions((prev) => {
      const target = prev.find((s) => s.id === id);
      const filtered = prev.filter((s) => s.id !== id);
      if (filtered.length > 0 && target?.hash === activeHash) {
        nextHash = filtered[0].hash;
      }
      return filtered;
    });
    if (nextHash) {
      switchSession(nextHash);
    }
  }, [activeHash, switchSession]);

  return {
    activeHash,
    sessions,
    switchSession,
    addSession,
    removeSession,
  };
};

