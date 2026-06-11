
"use client";

import { useEffect, useState, useCallback } from 'react';
import { AppSettings, Dynamic, Participant, Match, Round, Vote } from './types';

// Storage Keys
const KEYS = {
  SETTINGS: 'retos_event_config',
  PARTICIPANTS: 'retos_registrations',
  USER: 'retos_registered_user',
  DYNAMICS: 'retos_dynamics',
  MATCHES: 'retos_matches',
  VOTES: 'retos_votes',
  ROUNDS: 'retos_rounds'
};

// Helper to notify other tabs/hooks in the same window
const notifyStorageChange = () => {
  window.dispatchEvent(new Event('local-db-update'));
};

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);

  const load = useCallback(() => {
    const data = localStorage.getItem(KEYS.SETTINGS);
    if (data) {
      setSettings(JSON.parse(data));
    } else {
      const initial: AppSettings = {
        eventName: 'Retos Graduados IDEHA',
        finalistsCount: 2,
        registrationOpen: false,
        currentStatus: 'idle',
      };
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(initial));
      setSettings(initial);
    }
  }, []);

  useEffect(() => {
    load();
    window.addEventListener('local-db-update', load);
    window.addEventListener('storage', load);
    return () => {
      window.removeEventListener('local-db-update', load);
      window.removeEventListener('storage', load);
    };
  }, [load]);

  return settings;
}

export function useDynamics() {
  const [dynamics, setDynamics] = useState<Dynamic[]>([]);

  const load = useCallback(() => {
    const data = localStorage.getItem(KEYS.DYNAMICS);
    setDynamics(data ? JSON.parse(data) : []);
  }, []);

  useEffect(() => {
    load();
    window.addEventListener('local-db-update', load);
    window.addEventListener('storage', load);
    return () => {
      window.removeEventListener('local-db-update', load);
      window.removeEventListener('storage', load);
    };
  }, [load]);

  return dynamics;
}

export function useParticipants() {
  const [participants, setParticipants] = useState<Participant[]>([]);

  const load = useCallback(() => {
    const data = localStorage.getItem(KEYS.PARTICIPANTS);
    setParticipants(data ? JSON.parse(data) : []);
  }, []);

  useEffect(() => {
    load();
    window.addEventListener('local-db-update', load);
    window.addEventListener('storage', load);
    return () => {
      window.removeEventListener('local-db-update', load);
      window.removeEventListener('storage', load);
    };
  }, [load]);

  return participants;
}

export function useMatches(roundId?: string) {
  const [matches, setMatches] = useState<Match[]>([]);

  const load = useCallback(() => {
    const data = localStorage.getItem(KEYS.MATCHES);
    const allMatches: Match[] = data ? JSON.parse(data) : [];
    if (roundId) {
      setMatches(allMatches.filter(m => m.roundId === roundId));
    } else {
      setMatches(allMatches);
    }
  }, [roundId]);

  useEffect(() => {
    load();
    window.addEventListener('local-db-update', load);
    window.addEventListener('storage', load);
    return () => {
      window.removeEventListener('local-db-update', load);
      window.removeEventListener('storage', load);
    };
  }, [load]);

  return matches;
}

export function useActiveMatch(matchId?: string) {
  const [match, setMatch] = useState<Match | null>(null);

  const load = useCallback(() => {
    if (!matchId) {
      setMatch(null);
      return;
    }
    const data = localStorage.getItem(KEYS.MATCHES);
    const allMatches: Match[] = data ? JSON.parse(data) : [];
    const found = allMatches.find(m => m.id === matchId);
    setMatch(found || null);
  }, [matchId]);

  useEffect(() => {
    load();
    window.addEventListener('local-db-update', load);
    window.addEventListener('storage', load);
    return () => {
      window.removeEventListener('local-db-update', load);
      window.removeEventListener('storage', load);
    };
  }, [load]);

  return match;
}

export function useVotes(matchId?: string) {
  const [votes, setVotes] = useState<Vote[]>([]);

  const load = useCallback(() => {
    if (!matchId) {
      setVotes([]);
      return;
    }
    const data = localStorage.getItem(KEYS.VOTES);
    const allVotes: Vote[] = data ? JSON.parse(data) : [];
    setVotes(allVotes.filter(v => v.matchId === matchId));
  }, [matchId]);

  useEffect(() => {
    load();
    window.addEventListener('local-db-update', load);
    window.addEventListener('storage', load);
    return () => {
      window.removeEventListener('local-db-update', load);
      window.removeEventListener('storage', load);
    };
  }, [load]);

  return votes;
}

// Global actions for localStorage
export const localDB = {
  updateSettings: (updates: Partial<AppSettings>) => {
    const data = localStorage.getItem(KEYS.SETTINGS);
    const current = data ? JSON.parse(data) : {};
    const updated = { ...current, ...updates };
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(updated));
    notifyStorageChange();
  },
  saveParticipant: (p: Participant) => {
    const data = localStorage.getItem(KEYS.PARTICIPANTS);
    const list = data ? JSON.parse(data) : [];
    const index = list.findIndex((item: Participant) => item.id === p.id);
    if (index >= 0) {
      list[index] = p;
    } else {
      list.push(p);
    }
    localStorage.setItem(KEYS.PARTICIPANTS, JSON.stringify(list));
    notifyStorageChange();
  },
  deleteParticipant: (id: string) => {
    const data = localStorage.getItem(KEYS.PARTICIPANTS);
    const list = data ? JSON.parse(data) : [];
    const filtered = list.filter((p: Participant) => p.id !== id);
    localStorage.setItem(KEYS.PARTICIPANTS, JSON.stringify(filtered));
    notifyStorageChange();
  },
  saveDynamic: (d: Dynamic) => {
    const data = localStorage.getItem(KEYS.DYNAMICS);
    const list = data ? JSON.parse(data) : [];
    const index = list.findIndex((item: Dynamic) => item.id === d.id);
    if (index >= 0) {
      list[index] = d;
    } else {
      list.push(d);
    }
    localStorage.setItem(KEYS.DYNAMICS, JSON.stringify(list));
    notifyStorageChange();
  },
  deleteDynamic: (id: string) => {
    const data = localStorage.getItem(KEYS.DYNAMICS);
    const list = data ? JSON.parse(data) : [];
    localStorage.setItem(KEYS.DYNAMICS, JSON.stringify(list.filter((d: any) => d.id !== id)));
    notifyStorageChange();
  },
  createRound: (round: any, matches: Match[]) => {
    // Save matches
    const mData = localStorage.getItem(KEYS.MATCHES);
    const mList = mData ? JSON.parse(mData) : [];
    mList.push(...matches);
    localStorage.setItem(KEYS.MATCHES, JSON.stringify(mList));
    
    // Save round
    const rData = localStorage.getItem(KEYS.ROUNDS);
    const rList = rData ? JSON.parse(rData) : [];
    rList.push(round);
    localStorage.setItem(KEYS.ROUNDS, JSON.stringify(rList));
    notifyStorageChange();
  },
  updateMatch: (id: string, updates: Partial<Match>) => {
    const data = localStorage.getItem(KEYS.MATCHES);
    const list = data ? JSON.parse(data) : [];
    const index = list.findIndex((m: Match) => m.id === id);
    if (index >= 0) {
      list[index] = { ...list[index], ...updates };
      localStorage.setItem(KEYS.MATCHES, JSON.stringify(list));
      notifyStorageChange();
    }
  },
  castVote: (vote: Vote) => {
    const data = localStorage.getItem(KEYS.VOTES);
    const list = data ? JSON.parse(data) : [];
    // Only one vote per voter per match
    const existing = list.find((v: Vote) => v.matchId === vote.matchId && v.voterId === vote.voterId);
    if (!existing) {
      list.push(vote);
      localStorage.setItem(KEYS.VOTES, JSON.stringify(list));
      notifyStorageChange();
    }
  },
  resetAll: () => {
    localStorage.removeItem(KEYS.PARTICIPANTS);
    localStorage.removeItem(KEYS.MATCHES);
    localStorage.removeItem(KEYS.VOTES);
    localStorage.removeItem(KEYS.ROUNDS);
    localDB.updateSettings({
      currentStatus: 'idle',
      registrationOpen: false,
      currentRoundId: undefined,
      activeMatchId: undefined,
    });
    notifyStorageChange();
  }
};
