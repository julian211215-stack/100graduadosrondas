
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
  writeBatch
} from 'firebase/firestore';
import { AppSettings, Dynamic, Participant, Match, Vote } from './types';

/**
 * Sanitizes data for Firestore by removing undefined values.
 * Firestore does not support undefined; it must be null or omitted.
 */
function sanitize(data: any) {
  const clean: any = {};
  Object.keys(data).forEach(key => {
    if (data[key] === undefined) {
      clean[key] = null;
    } else {
      clean[key] = data[key];
    }
  });
  return clean;
}

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    const docRef = doc(db, 'settings', 'main');
    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSettings({
          eventName: data.eventName || 'Retos Graduados IDEHA',
          finalistsCount: data.finalistsCount || 2,
          registrationOpen: !!data.registrationOpen,
          currentStatus: data.currentStatus || 'idle',
          currentRoundId: data.currentRoundId || "",
          activeMatchId: data.activeMatchId || "",
        } as AppSettings);
      } else {
        const initial: AppSettings = {
          eventName: 'Retos Graduados IDEHA',
          finalistsCount: 2,
          registrationOpen: false,
          currentStatus: 'idle',
        };
        setDoc(docRef, initial).catch(e => console.error("Error creating settings:", e));
        setSettings(initial);
      }
    }, (error) => {
      console.error("Error al cargar configuración:", error);
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
      const list = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as any))
        .filter(d => d.name && d.instructions)
        .map(d => ({
          id: d.id,
          name: d.name,
          instructions: d.instructions,
          durationSeconds: d.durationSeconds ?? null,
          votingCriteria: d.votingCriteria ?? "",
          active: d.active !== false,
          createdAt: d.createdAt || new Date().toISOString(),
          updatedAt: d.updatedAt || new Date().toISOString(),
        } as Dynamic));
      
      setDynamics(list.sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1)));
    }, (error) => {
      console.error("Error al cargar dinámicas:", error);
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
      const list = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as any))
        .filter(p => p.name && p.generationId)
        .map(p => ({
          ...p,
          status: p.status || 'waiting',
          mode: p.mode || 'voter',
          createdAt: p.createdAt || new Date().toISOString()
        } as Participant));
      
      setParticipants(list.sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1)));
    }, (error) => {
      console.error("Error al cargar registros:", error);
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
    }, (error) => {
      console.error("Error al cargar duelos:", error);
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
    }, (error) => {
      console.error("Error al cargar duelo activo:", error);
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
    }, (error) => {
      console.error("Error al cargar votos:", error);
    });
    return unsub;
  }, [matchId]);

  return votes;
}

// Data Actions (Firestore)
export const localDB = {
  updateSettings: async (updates: Partial<AppSettings>) => {
    try {
      const docRef = doc(db, 'settings', 'main');
      await setDoc(docRef, sanitize({ ...updates, updatedAt: new Date().toISOString() }), { merge: true });
    } catch (error: any) {
      console.error("Error al guardar configuración:", error);
      throw error;
    }
  },
  saveParticipant: async (p: Participant) => {
    try {
      const docRef = doc(db, 'participants', p.id);
      await setDoc(docRef, sanitize({ ...p, updatedAt: new Date().toISOString() }), { merge: true });
    } catch (error: any) {
      console.error("Error al guardar registro:", error);
      throw error;
    }
  },
  deleteParticipant: async (id: string) => {
    try {
      await deleteDoc(doc(db, 'participants', id));
    } catch (error: any) {
      console.error("Error al eliminar registro:", error);
      throw error;
    }
  },
  saveDynamic: async (d: Dynamic) => {
    try {
      const docRef = doc(db, 'dynamics', d.id);
      await setDoc(docRef, sanitize({ ...d, updatedAt: new Date().toISOString() }), { merge: true });
    } catch (error: any) {
      console.error("Error al guardar dinámica:", error);
      throw error;
    }
  },
  deleteDynamic: async (id: string) => {
    try {
      await deleteDoc(doc(db, 'dynamics', id));
    } catch (error: any) {
      console.error("Error al eliminar dinámica:", error);
      throw error;
    }
  },
  createRound: async (round: any, matches: Match[]) => {
    try {
      const batch = writeBatch(db);
      const roundRef = doc(db, 'rounds', round.id);
      batch.set(roundRef, sanitize(round));
      matches.forEach(m => {
        const matchRef = doc(db, 'matches', m.id);
        batch.set(matchRef, sanitize(m));
      });
      await batch.commit();
    } catch (error: any) {
      console.error("Error al crear ronda:", error);
      throw error;
    }
  },
  updateMatch: async (id: string, updates: Partial<Match>) => {
    try {
      const docRef = doc(db, 'matches', id);
      await updateDoc(docRef, sanitize(updates));
    } catch (error: any) {
      console.error("Error al actualizar duelo:", error);
      throw error;
    }
  },
  castVote: async (vote: Vote) => {
    try {
      const docRef = doc(db, 'votes', `${vote.matchId}_${vote.voterId}`);
      await setDoc(docRef, sanitize(vote));
    } catch (error: any) {
      console.error("Error al votar:", error);
      throw error;
    }
  },
  resetAll: async () => {
    try {
      if(!confirm("¿Deseas reiniciar todo el estado del evento (Ajustes, Rondas y Votos)? Los participantes permanecerán.")) return;
      await localDB.updateSettings({
        currentStatus: 'idle',
        registrationOpen: false,
        currentRoundId: "",
        activeMatchId: "",
      });
    } catch (error: any) {
      console.error("Error al reiniciar evento:", error);
      throw error;
    }
  }
};
