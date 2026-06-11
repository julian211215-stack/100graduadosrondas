
"use client";

import { useAppSettings, useParticipants, useActiveMatch, useVotes, useDynamics } from '@/lib/store';
import { Trophy, Users, RefreshCw } from 'lucide-react';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { QRCodeSVG } from 'qrcode.react';

export default function PublicScreen() {
  const settings = useAppSettings();
  const participants = useParticipants();
  const activeMatch = useActiveMatch(settings?.activeMatchId || undefined);
  const dynamics = useDynamics();
  const votes = useVotes(settings?.activeMatchId || undefined);

  const participantA = useMemo(() => participants.find(p => p.id === activeMatch?.participantAId), [participants, activeMatch]);
  const participantB = useMemo(() => participants.find(p => p.id === activeMatch?.participantBId), [participants, activeMatch]);
  const activeDynamic = useMemo(() => dynamics.find(d => d.id === activeMatch?.dynamicId), [dynamics, activeMatch]);

  const finalists = useMemo(() => participants.filter(p => p.status === 'finalist'), [participants]);

  if (!settings) return <div className="bg-background min-h-screen flex items-center justify-center">Cargando...</div>;

  return (
    <div className="bg-background text-foreground min-h-screen flex flex-col items-center justify-center p-8 md:p-12 overflow-hidden relative scale-[0.92] origin-center">
      
      {/* Absolute Header Overlay */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-10 opacity-30">
        <p className="text-xs font-black tracking-[0.5em] uppercase text-primary">IDEHA MÉXICO • RETOS GRADUADOS</p>
      </div>

      {/* Welcome / Registration Open */}
      {(settings.currentStatus === 'idle' || settings.currentStatus === 'registration') && (
        <div className="text-center space-y-10 max-w-6xl animate-in fade-in duration-1000">
          <div className="space-y-2">
            <h1 className="text-7xl md:text-9xl font-black font-headline text-primary uppercase tracking-tighter drop-shadow-[0_10px_30px_rgba(212,175,55,0.4)]">
              100 GRADUADOS
            </h1>
            <h2 className="text-3xl md:text-5xl font-medium tracking-[0.2em] opacity-80 uppercase italic text-white">
              DIJERON LOS RETOS
            </h2>
          </div>

          <div className="flex flex-col md:flex-row justify-center items-center gap-12 mt-8 bg-card/40 backdrop-blur-md p-10 md:p-16 rounded-[4rem] border-4 border-primary/30 shadow-2xl relative">
            <div className="absolute -top-6 -right-6 bg-primary text-black font-black px-6 py-2 rounded-full transform rotate-12 shadow-xl">
              ¡ABIERTOS!
            </div>
            
            <div className="space-y-6 flex flex-col items-center">
              <div className="bg-white p-6 rounded-[2rem] inline-block shadow-[0_0_40px_rgba(255,255,255,0.2)] transform transition-transform hover:scale-105 duration-500">
                <QRCodeSVG 
                  value="https://100graduados.vercel.app/jugar" 
                  size={200} 
                  level="H" 
                  marginSize={1}
                />
              </div>
              <p className="text-2xl font-black uppercase tracking-widest text-primary animate-pulse">Escanea para Registrarte</p>
            </div>

            <div className="h-40 w-1 bg-primary/20 hidden md:block" />

            <div className="text-left space-y-6">
              <div className="flex items-center gap-6">
                <div className="p-5 bg-primary rounded-3xl text-black shadow-lg">
                   <Users className="w-10 h-10" />
                </div>
                <div>
                  <p className="text-7xl font-black tracking-tighter leading-none">{participants.length}</p>
                  <p className="text-lg uppercase font-bold opacity-50 tracking-[0.2em]">Registrados</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 max-w-md justify-start">
                 {participants.slice(-7).map((p, idx) => (
                   <div key={p.id} className="w-14 h-14 rounded-full border-4 border-primary/40 overflow-hidden animate-in zoom-in-0 shadow-lg" style={{ animationDelay: `${idx * 100}ms` }}>
                     <img src={p.photoUrl} className="w-full h-full object-cover" alt="" />
                   </div>
                 ))}
                 {participants.length > 7 && (
                   <div className="w-14 h-14 rounded-full bg-primary/20 border-2 border-primary/30 flex items-center justify-center font-black text-lg">
                     +{participants.length - 7}
                   </div>
                 )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Duel / Sorting / Live */}
      {(settings.currentStatus === 'sorting' || settings.currentStatus === 'dueling') && activeMatch && participantA && participantB && activeDynamic && (
        <div className="w-full max-w-[90vw] h-full flex flex-col justify-between items-center text-center py-6 animate-in slide-in-from-bottom duration-700">
          <div className="bg-primary px-12 py-3 rounded-full text-black font-black uppercase text-3xl tracking-tighter shadow-[0_0_40px_rgba(212,175,55,0.3)] mb-4">
            DUELO EN VIVO
          </div>

          <div className="w-full flex justify-between items-center gap-4 py-4 relative">
            {/* Participant A */}
            <div className="flex flex-col items-center space-y-6 flex-1">
              <div className={`w-72 h-72 md:w-80 md:h-80 rounded-full border-[10px] overflow-hidden shadow-[0_10px_50px_rgba(0,0,0,0.5)] transition-all duration-700 ${activeMatch.winnerId === participantA.id ? 'border-green-500 scale-110 shadow-green-500/40' : 'border-primary'}`}>
                <img src={participantA.photoUrl} className="w-full h-full object-cover" alt="A" />
              </div>
              <div className="max-w-[300px]">
                <h3 className="text-4xl md:text-5xl font-black font-headline tracking-tighter uppercase drop-shadow-lg truncate">{participantA.name}</h3>
                <p className="text-xl md:text-2xl opacity-60 uppercase font-bold tracking-[0.3em] mt-1 text-primary">{participantA.generationId}</p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-4 z-10 shrink-0">
              <div className="text-8xl md:text-[10rem] font-black italic opacity-10 leading-none select-none select-none">VS</div>
              {activeMatch.status === 'voting' && (
                <div className="bg-secondary px-8 py-5 rounded-[2rem] text-white font-black text-3xl animate-pulse shadow-[0_0_50px_rgba(255,122,0,0.4)] border-4 border-white/20 whitespace-nowrap">
                  VOTACIÓN ABIERTA
                  <div className="text-sm font-bold mt-1 opacity-80 uppercase tracking-widest">{votes.length} Votos</div>
                </div>
              )}
            </div>

            {/* Participant B */}
            <div className="flex flex-col items-center space-y-6 flex-1">
              <div className={`w-72 h-72 md:w-80 md:h-80 rounded-full border-[10px] overflow-hidden shadow-[0_10px_50px_rgba(0,0,0,0.5)] transition-all duration-700 ${activeMatch.winnerId === participantB.id ? 'border-green-500 scale-110 shadow-green-500/40' : 'border-primary'}`}>
                <img src={participantB.photoUrl} className="w-full h-full object-cover" alt="B" />
              </div>
              <div className="max-w-[300px]">
                <h3 className="text-4xl md:text-5xl font-black font-headline tracking-tighter uppercase drop-shadow-lg truncate">{participantB.name}</h3>
                <p className="text-xl md:text-2xl opacity-60 uppercase font-bold tracking-[0.3em] mt-1 text-primary">{participantB.generationId}</p>
              </div>
            </div>
          </div>

          <div className="bg-card/60 backdrop-blur-sm w-full p-10 rounded-[3rem] border-4 border-primary/20 space-y-4 shadow-2xl mt-4">
            <h2 className="text-5xl md:text-6xl font-black font-headline text-primary tracking-tighter uppercase mb-2">{activeDynamic.name}</h2>
            <p className="text-2xl md:text-3xl font-medium max-w-4xl mx-auto leading-tight opacity-90">{activeDynamic.instructions}</p>
            {activeDynamic.durationSeconds && (
              <div className="inline-block mt-4 bg-primary text-black px-8 py-2 rounded-full font-black text-2xl shadow-lg">
                {activeDynamic.durationSeconds} SEGUNDOS
              </div>
            )}
          </div>
        </div>
      )}

      {/* Finished / Finalists */}
      {settings.currentStatus === 'finished' && (
        <div className="text-center space-y-12 animate-in zoom-in duration-1000 max-w-7xl">
          <div className="space-y-4">
            <div className="relative inline-block mb-4">
               <div className="absolute inset-0 bg-primary/20 blur-[80px] rounded-full animate-pulse"></div>
               <Trophy className="w-32 h-32 text-primary mx-auto animate-bounce relative drop-shadow-[0_0_30px_rgba(212,175,55,0.8)]" />
            </div>
            <h1 className="text-7xl md:text-8xl font-black font-headline text-primary uppercase tracking-tighter drop-shadow-2xl">¡Tenemos Finalistas!</h1>
          </div>
          
          <div className="flex flex-wrap justify-center gap-8 md:gap-16">
            {finalists.map((f, idx) => (
              <div key={f.id} className="flex flex-col items-center space-y-6 animate-in slide-in-from-bottom duration-1000" style={{ animationDelay: `${idx * 200}ms` }}>
                <div className="w-56 h-56 md:w-64 md:h-64 rounded-full border-[8px] border-primary overflow-hidden shadow-[0_0_60px_rgba(212,175,55,0.4)]">
                   <img src={f.photoUrl} className="w-full h-full object-cover" alt="" />
                </div>
                <div>
                   <h3 className="text-4xl font-black uppercase tracking-tighter">{f.name}</h3>
                   <p className="text-xl opacity-60 font-bold tracking-[0.2em] uppercase mt-1 text-primary">{f.generationId}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-2xl font-medium tracking-[0.4em] opacity-40 italic uppercase pt-6 animate-pulse">
            Preparando la Gran Final...
          </div>
        </div>
      )}
    </div>
  );
}

