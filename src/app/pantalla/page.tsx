
"use client";

import { useAppSettings, useParticipants, useActiveMatch, useVotes } from '@/lib/store';
import { useDynamics } from '@/lib/store';
import { Trophy, Users, QrCode } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { Participant, Dynamic } from '@/lib/types';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function PublicScreen() {
  const settings = useAppSettings();
  const participants = useParticipants();
  const activeMatch = useActiveMatch(settings?.activeMatchId || undefined);
  const dynamics = useDynamics();
  const votes = useVotes(settings?.activeMatchId || undefined);

  const [participantA, setParticipantA] = useState<Participant | null>(null);
  const [participantB, setParticipantB] = useState<Participant | null>(null);
  const [activeDynamic, setActiveDynamic] = useState<Dynamic | null>(null);

  useEffect(() => {
    const fetchParticipants = async () => {
      if (activeMatch) {
        const aSnap = await getDocs(query(collection(db, 'participants'), where('id', '==', activeMatch.participantAId)));
        if (!aSnap.empty) setParticipantA(aSnap.docs[0].data() as Participant);
        
        const bSnap = await getDocs(query(collection(db, 'participants'), where('id', '==', activeMatch.participantBId)));
        if (!bSnap.empty) setParticipantB(bSnap.docs[0].data() as Participant);

        const dSnap = await getDocs(query(collection(db, 'dynamics'), where('id', '==', activeMatch.dynamicId)));
        if (!dSnap.empty) setActiveDynamic(dSnap.docs[0].data() as Dynamic);
      }
    };
    fetchParticipants();
  }, [activeMatch]);

  const finalists = useMemo(() => participants.filter(p => p.status === 'finalist'), [participants]);

  // Scene Controller
  if (!settings) return <div className="bg-background min-h-screen flex items-center justify-center">Cargando...</div>;

  return (
    <div className="bg-background text-foreground min-h-screen flex flex-col items-center justify-center p-12 overflow-hidden aspect-16-9">
      
      {/* Welcome / Registration Open */}
      {(settings.currentStatus === 'idle' || settings.currentStatus === 'registration') && (
        <div className="text-center space-y-12 max-w-5xl">
          <div className="space-y-4">
            <h1 className="text-7xl font-black font-headline text-primary uppercase tracking-tighter drop-shadow-2xl">
              100 Graduados Dijeron
            </h1>
            <h2 className="text-4xl font-medium tracking-[0.2em] opacity-80 uppercase italic">
              Retos IDEHA México
            </h2>
          </div>

          <div className="flex justify-center items-center gap-16 mt-12 bg-card p-12 rounded-[3rem] border-4 border-primary shadow-[0_0_50px_rgba(212,175,55,0.2)]">
            <div className="space-y-6">
              <div className="bg-white p-4 rounded-3xl inline-block">
                <QrCode className="w-48 h-48 text-black" />
              </div>
              <p className="text-2xl font-bold uppercase tracking-widest text-primary">Escanea para Entrar</p>
            </div>
            <div className="text-left space-y-6">
              <div className="flex items-center gap-4">
                <Users className="w-12 h-12 text-primary" />
                <div>
                  <p className="text-5xl font-black">{participants.length}</p>
                  <p className="text-xl uppercase font-bold opacity-50">Registrados</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 max-w-sm">
                 {participants.slice(-6).map(p => (
                   <div key={p.id} className="w-16 h-16 rounded-full border-2 border-primary overflow-hidden animate-in zoom-in-0 duration-500">
                     <img src={p.photoUrl} className="w-full h-full object-cover" alt="" />
                   </div>
                 ))}
                 {participants.length > 6 && <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center font-bold">+{participants.length - 6}</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Duel / Sorting / Live */}
      {(settings.currentStatus === 'sorting' || settings.currentStatus === 'dueling') && activeMatch && participantA && participantB && activeDynamic && (
        <div className="w-full max-w-7xl h-full flex flex-col justify-between items-center text-center py-10">
          <div className="bg-primary px-8 py-2 rounded-full text-black font-black uppercase text-xl tracking-tighter">
            DUELO EN VIVO
          </div>

          <div className="w-full flex justify-around items-center gap-8 py-10">
            {/* Participant A */}
            <div className="flex flex-col items-center space-y-6 flex-1">
              <div className={`w-80 h-80 rounded-full border-8 overflow-hidden shadow-2xl transition-all duration-700 ${activeMatch.winnerId === participantA.id ? 'border-green-500 scale-110 shadow-green-500/40' : 'border-primary'}`}>
                <img src={participantA.photoUrl} className="w-full h-full object-cover" alt="A" />
              </div>
              <div>
                <h3 className="text-5xl font-black font-headline tracking-tighter uppercase">{participantA.name}</h3>
                <p className="text-2xl opacity-60 uppercase font-medium tracking-widest mt-2">{participantA.generationId}</p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-4">
              <div className="text-9xl font-black italic opacity-10 leading-none">VS</div>
              {activeMatch.status === 'voting' && (
                <div className="bg-secondary px-8 py-4 rounded-3xl text-white font-black text-3xl animate-pulse shadow-2xl">
                  VOTACIÓN ABIERTA
                  <div className="text-sm font-medium mt-1 opacity-80">{votes.length} Votos Recibidos</div>
                </div>
              )}
            </div>

            {/* Participant B */}
            <div className="flex flex-col items-center space-y-6 flex-1">
              <div className={`w-80 h-80 rounded-full border-8 overflow-hidden shadow-2xl transition-all duration-700 ${activeMatch.winnerId === participantB.id ? 'border-green-500 scale-110 shadow-green-500/40' : 'border-primary'}`}>
                <img src={participantB.photoUrl} className="w-full h-full object-cover" alt="B" />
              </div>
              <div>
                <h3 className="text-5xl font-black font-headline tracking-tighter uppercase">{participantB.name}</h3>
                <p className="text-2xl opacity-60 uppercase font-medium tracking-widest mt-2">{participantB.generationId}</p>
              </div>
            </div>
          </div>

          <div className="bg-card w-full p-10 rounded-[3rem] border-4 border-primary/20 space-y-4">
            <h2 className="text-6xl font-black font-headline text-primary tracking-tighter uppercase">{activeDynamic.name}</h2>
            <p className="text-3xl font-medium max-w-5xl mx-auto leading-relaxed opacity-80">{activeDynamic.instructions}</p>
            {activeDynamic.durationSeconds && (
              <div className="inline-block mt-4 bg-primary text-black px-6 py-2 rounded-full font-black text-2xl">
                {activeDynamic.durationSeconds} SEGUNDOS
              </div>
            )}
          </div>
        </div>
      )}

      {/* Finished / Finalists */}
      {settings.currentStatus === 'finished' && (
        <div className="text-center space-y-16">
          <div className="space-y-4">
            <Trophy className="w-32 h-32 text-primary mx-auto animate-bounce" />
            <h1 className="text-8xl font-black font-headline text-primary uppercase tracking-tighter">¡Tenemos Finalistas!</h1>
          </div>
          
          <div className="flex justify-center gap-12">
            {finalists.map((f, idx) => (
              <div key={f.id} className="flex flex-col items-center space-y-6 animate-in slide-in-from-bottom duration-1000" style={{ animationDelay: `${idx * 200}ms` }}>
                <div className="w-72 h-72 rounded-full border-8 border-primary overflow-hidden shadow-[0_0_60px_rgba(212,175,55,0.4)]">
                   <img src={f.photoUrl} className="w-full h-full object-cover" alt="" />
                </div>
                <div>
                   <h3 className="text-4xl font-black uppercase tracking-tighter">{f.name}</h3>
                   <p className="text-xl opacity-60 font-bold tracking-widest uppercase">{f.generationId}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-2xl font-medium tracking-[0.3em] opacity-40 italic uppercase">
            La gran final se decidirá a continuación
          </div>
        </div>
      )}
    </div>
  );
}
