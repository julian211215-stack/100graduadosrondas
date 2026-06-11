
"use client";

import { useEffect, useState } from 'react';
import { 
  doc, 
  onSnapshot, 
  collection, 
  query, 
  orderBy, 
  where,
  setDoc,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { AppSettings, Dynamic, Participant, Match, Round, Vote } from './types';

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    return onSnapshot(doc(db, 'settings', 'config'), (doc) => {
      if (doc.exists()) {
        setSettings(doc.data() as AppSettings);
      } else {
        // Initial config
        const initial: AppSettings = {
          eventName: 'Retos Graduados IDEHA',
          finalistsCount: 2,
          registrationOpen: false,
          currentStatus: 'idle',
        };
        setDoc(doc.ref, initial);
      }
    });
  }, []);

  return settings;
}

export function useDynamics() {
  const [dynamics, setDynamics] = useState<Dynamic[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'dynamics'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      setDynamics(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Dynamic)));
    });
  }, []);

  return dynamics;
}

export function useParticipants() {
  const [participants, setParticipants] = useState<Participant[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'participants'), orderBy('createdAt', 'asc'));
    return onSnapshot(q, (snapshot) => {
      setParticipants(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Participant)));
    });
  }, []);

  return participants;
}

export function useMatches(roundId?: string) {
  const [matches, setMatches] = useState<Match[]>([]);

  useEffect(() => {
    if (!roundId) return;
    const q = query(collection(db, 'matches'), where('roundId', '==', roundId));
    return onSnapshot(q, (snapshot) => {
      setMatches(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Match)));
    });
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
    return onSnapshot(doc(db, 'matches', matchId), (doc) => {
      if (doc.exists()) {
        setMatch({ id: doc.id, ...doc.data() } as Match);
      }
    });
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
    const q = query(collection(db, 'votes'), where('matchId', '==', matchId));
    return onSnapshot(q, (snapshot) => {
      setVotes(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Vote)));
    });
  }, [matchId]);

  return votes;
}
