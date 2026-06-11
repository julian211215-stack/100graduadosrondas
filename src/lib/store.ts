"use client";

import { useEffect, useState } from 'react';
import { db } from './firebase';
import { 
  doc, 
  collection, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  getDoc,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import { AppSettings, Dynamic, Participant, Match, Vote } from './types';

// Storage Keys for local identity
const LOCAL_USER_KEY = 'retos_registered_user';

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    const docRef = doc(db, 'settings', 'config');
    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data() as AppSettings);
      } else {
        const initial: AppSettings = {
          eventName: 'Retos Graduados IDEHA',
          finalistsCount: 2,
          registrationOpen: false,
          currentStatus: 'idle',
        };
        setDoc(docRef, initial);
        setSettings(initial);
      }
    }, (error) => {
      console.error("Error listening to settings:", error);
    });
    return unsub;
  }, []);

  return settings;
}

export function useDynamics() {
  const [dynamics, setDynamics] = useState<Dynamic[]>([]);

  useEffect(() => {
    const colRef = collection(db, 'dynamics');
    const unsub = onSnapshot(colRef, (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Dynamic));
      setDynamics(list.sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1)));
    });
    return unsub;
  }, []);

  return dynamics;
}

export function useParticipants() {
  const [participants, setParticipants] = useState<Participant[]>([]);

  useEffect(() => {
    const colRef = collection(db, 'participants');
    const unsub = onSnapshot(colRef, (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Participant));
      setParticipants(list.sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1)));
    });
    return unsub;
  }, []);

  return participants;
}

export function useMatches(roundId?: string) {
  const [matches, setMatches] = useState<Match[]>([]);

  useEffect(() => {
    const colRef = collection(db, 'matches');
    const q = roundId ? query(colRef, where('roundId', '==', roundId)) : colRef;
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match));
      setMatches(list);
    });
    return unsub;
  }, [roundId]);

  return matches;
}

export function useActiveMatch(matchId?: string) {
  const [match, setMatch] = useState<Match | null>(null);

  useEffect(() => {
    if (!matchId) {
      setMatch(null);
      return;
    }
    const docRef = doc(db, 'matches', matchId);
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        setMatch({ id: snap.id, ...snap.data() } as Match);
      } else {
        setMatch(null);
      }
    });
    return unsub;
  }, [matchId]);

  return match;
}

export function useVotes(matchId?: string) {
  const [votes, setVotes] = useState<Vote[]>([]);

  useEffect(() => {
    if (!matchId) {
      setVotes([]);
      return;
    }
    const colRef = collection(db, 'votes');
    const q = query(colRef, where('matchId', '==', matchId));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vote));
      setVotes(list);
    });
    return unsub;
  }, [matchId]);

  return votes;
}

// Data Actions (Firestore)
export const localDB = {
  updateSettings: async (updates: Partial<AppSettings>) => {
    const docRef = doc(db, 'settings', 'config');
    await updateDoc(docRef, updates);
  },
  saveParticipant: async (p: Participant) => {
    const docRef = doc(db, 'participants', p.id);
    await setDoc(docRef, { ...p, updatedAt: new Date().toISOString() }, { merge: true });
  },
  deleteParticipant: async (id: string) => {
    await deleteDoc(doc(db, 'participants', id));
  },
  saveDynamic: async (d: Dynamic) => {
    const docRef = doc(db, 'dynamics', d.id);
    await setDoc(docRef, { ...d, updatedAt: new Date().toISOString() }, { merge: true });
  },
  deleteDynamic: async (id: string) => {
    await deleteDoc(doc(db, 'dynamics', id));
  },
  createRound: async (round: any, matches: Match[]) => {
    const batch = writeBatch(db);
    
    // Save round
    const roundRef = doc(db, 'rounds', round.id);
    batch.set(roundRef, round);
    
    // Save matches
    matches.forEach(m => {
      const matchRef = doc(db, 'matches', m.id);
      batch.set(matchRef, m);
    });
    
    await batch.commit();
  },
  updateMatch: async (id: string, updates: Partial<Match>) => {
    const docRef = doc(db, 'matches', id);
    await updateDoc(docRef, updates);
  },
  castVote: async (vote: Vote) => {
    // Basic check for double voting could be done here or in rules
    const docRef = doc(db, 'votes', `${vote.matchId}_${vote.voterId}`);
    await setDoc(docRef, vote);
  },
  resetAll: async () => {
    // Caution: Destructive. For a prototype we reset settings and could clear collections if needed
    // But usually just resetting settings status is enough to restart flow
    await localDB.updateSettings({
      currentStatus: 'idle',
      registrationOpen: false,
      currentRoundId: "",
      activeMatchId: "",
    });
    // For a deep reset, you'd need to delete docs in collections, which Firestore batch handles up to 500
  }
};
