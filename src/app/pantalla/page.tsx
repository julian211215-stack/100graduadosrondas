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
    <div className="bg-background text-foreground min-h-screen flex flex-col items-center justify-center p-12 overflow-hidden aspect-16-9 relative">
      
      {/* Update Button */}
      <div className="absolute top-4 right-4 z-50">
        <Button variant="ghost" size="icon" onClick={() => window.location.reload()} className="opacity-20 hover:opacity-100">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Welcome / Registration Open */}
      {(settings.currentStatus === 'idle' || settings.currentStatus === 'registration') && (
        <div className="text-center space-y-12 max-w-5xl animate-in fade-in duration-1000">
          <div className="space-y-4">
            <h1 className="text-8xl font-black font-headline text-primary uppercase tracking-tighter drop-shadow-2xl">
              100 Graduados Dijeron
            </h1>
            <h2 className="text-4xl font-medium tracking-[0.2em] opacity-80 uppercase italic">
              Retos IDEHA México
            </h2>
          </div>

          <div className="flex justify-center items-center gap-16 mt-12 bg-card p-12 rounded-[3rem] border-4 border-primary shadow-[0_0_50px_rgba(212,175,55,0.2)]">
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-3xl inline-block shadow-lg">
                <QRCodeSVG 
                  value="https://100graduados.vercel.app/jugar" 
                  size={192} 
                  level="H" 
                  marginSize={0}
                />
              </div>
              <p className="text-2xl font-bold uppercase tracking-widest text-primary">Escanea para Registrarte</p>
            </div>
            <div className="text-left space-y-8">
              <div className="flex items-center gap-6">
                <div className="p-4 bg-primary rounded-2xl text-black">
                   <Users className="w-12 h-12" />
                </div>
                <div>
                  <p className="text-7xl font-black tracking-tighter">{participants.length}</p>
                  <p className="text-xl uppercase font-bold opacity-50 tracking-widest">Registrados</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 max-w-md">
                 {participants.slice(-8).map((p, idx) => (
                   <div key={p.id} className="w-20 h-20 rounded-full border-4 border-primary overflow-hidden animate-in zoom-in-0 shadow-lg" style={{ animationDelay: `${idx * 100}ms` }}>
                     <img src={p.photoUrl} className="w-full h-full object-cover" alt="" />
                   </div>
                 ))}
                 {participants.length > 8 && <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center font-black text-2xl">+{participants.length - 8}</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Duel / Sorting / Live */}
      {(settings.currentStatus === 'sorting' || settings.currentStatus === 'dueling') && activeMatch && participantA && participantB && activeDynamic && (
        <div className="w-full max-w-7xl h-full flex flex-col justify-between items-center text-center py-10 animate-in slide-in-from-bottom duration-700">
          <div className="bg-primary px-10 py-3 rounded-full text-black font-black uppercase text-2xl tracking-tighter shadow-lg">
            DUELO EN VIVO
          </div>

          <div className="w-full flex justify-around items-center gap-8 py-10">
            {/* Participant A */}
            <div className="flex flex-col items-center space-y-8 flex-1">
              <div className={`w-96 h-96 rounded-full border-[12px] overflow-hidden shadow-2xl transition-all duration-700 ${activeMatch.winnerId === participantA.id ? 'border-green-500 scale-110 shadow-green-500/50' : 'border-primary'}`}>
                <img src={participantA.photoUrl} className="w-full h-full object-cover" alt="A" />
              </div>
              <div>
                <h3 className="text-6xl font-black font-headline tracking-tighter uppercase drop-shadow-md">{participantA.name}</h3>
                <p className="text-3xl opacity-60 uppercase font-medium tracking-widest mt-2">{participantA.generationId}</p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-6">
              <div className="text-[12rem] font-black italic opacity-10 leading-none select-none">VS</div>
              {activeMatch.status === 'voting' && (
                <div className="bg-secondary px-10 py-6 rounded-[2rem] text-white font-black text-4xl animate-pulse shadow-2xl border-4 border-white/20">
                  VOTACIÓN ABIERTA
                  <div className="text-lg font-medium mt-1 opacity-80 uppercase tracking-widest">{votes.length} Votos Recibidos</div>
                </div>
              )}
            </div>

            {/* Participant B */}
            <div className="flex flex-col items-center space-y-8 flex-1">
              <div className={`w-96 h-96 rounded-full border-[12px] overflow-hidden shadow-2xl transition-all duration-700 ${activeMatch.winnerId === participantB.id ? 'border-green-500 scale-110 shadow-green-500/50' : 'border-primary'}`}>
                <img src={participantB.photoUrl} className="w-full h-full object-cover" alt="B" />
              </div>
              <div>
                <h3 className="text-6xl font-black font-headline tracking-tighter uppercase drop-shadow-md">{participantB.name}</h3>
                <p className="text-3xl opacity-60 uppercase font-medium tracking-widest mt-2">{participantB.generationId}</p>
              </div>
            </div>
          </div>

          <div className="bg-card w-full p-12 rounded-[4rem] border-4 border-primary/20 space-y-6 shadow-2xl">
            <h2 className="text-7xl font-black font-headline text-primary tracking-tighter uppercase">{activeDynamic.name}</h2>
            <p className="text-4xl font-medium max-w-5xl mx-auto leading-relaxed opacity-90">{activeDynamic.instructions}</p>
            {activeDynamic.durationSeconds && (
              <div className="inline-block mt-6 bg-primary text-black px-10 py-4 rounded-full font-black text-3xl shadow-lg">
                {activeDynamic.durationSeconds} SEGUNDOS
              </div>
            )}
          </div>
        </div>
      )}

      {/* Finished / Finalists */}
      {settings.currentStatus === 'finished' && (
        <div className="text-center space-y-16 animate-in zoom-in duration-1000">
          <div className="space-y-6">
            <div className="relative inline-block">
               <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full"></div>
               <Trophy className="w-48 h-48 text-primary mx-auto animate-bounce relative" />
            </div>
            <h1 className="text-9xl font-black font-headline text-primary uppercase tracking-tighter drop-shadow-2xl">¡Tenemos Finalistas!</h1>
          </div>
          
          <div className="flex justify-center gap-16">
            {finalists.map((f, idx) => (
              <div key={f.id} className="flex flex-col items-center space-y-8 animate-in slide-in-from-bottom duration-1000" style={{ animationDelay: `${idx * 200}ms` }}>
                <div className="w-80 h-80 rounded-full border-[10px] border-primary overflow-hidden shadow-[0_0_80px_rgba(212,175,55,0.5)]">
                   <img src={f.photoUrl} className="w-full h-full object-cover" alt="" />
                </div>
                <div>
                   <h3 className="text-5xl font-black uppercase tracking-tighter">{f.name}</h3>
                   <p className="text-2xl opacity-60 font-bold tracking-[0.3em] uppercase mt-1">{f.generationId}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-3xl font-medium tracking-[0.5em] opacity-40 italic uppercase pt-10">
            La gran final se decidirá a continuación
          </div>
        </div>
      )}
    </div>
  );
}