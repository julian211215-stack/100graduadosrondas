
"use client";

import { useAppSettings, useParticipants, useDynamics, useMatches, useVotes } from '@/lib/store';
import { db } from '@/lib/firebase';
import { doc, updateDoc, collection, setDoc, deleteDoc, writeBatch, query, where, getDocs, addDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Users, Play, Radio, CheckCircle, ChevronRight, Shuffle, AlertCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Participant, Dynamic, Match, Round } from '@/lib/types';
import { useState, useMemo } from 'react';

export default function ConductorPage() {
  const settings = useAppSettings();
  const participants = useParticipants();
  const dynamics = useDynamics();
  const { toast } = useToast();

  const activeMatchId = settings?.activeMatchId;
  const matches = useMatches(settings?.currentRoundId || undefined);
  const activeMatch = useMemo(() => matches.find(m => m.id === activeMatchId), [matches, activeMatchId]);
  const votes = useVotes(activeMatchId || undefined);

  const stats = {
    total: participants.length,
    competitors: participants.filter(p => p.mode === 'participant').length,
    voters: participants.filter(p => p.mode === 'voter').length,
    active: participants.filter(p => p.status === 'available' || p.status === 'competing' || p.status === 'advanced').length,
    eliminated: participants.filter(p => p.status === 'eliminated').length,
    finalists: participants.filter(p => p.status === 'finalist').length,
  };

  const handleToggleRegistration = async () => {
    if (!settings) return;
    await updateDoc(doc(db, 'settings', 'config'), { registrationOpen: !settings.registrationOpen });
  };

  const handleSortRound = async () => {
    if (dynamics.length === 0) {
      toast({ title: "Agrega dinámicas en ajustes primero", variant: "destructive" });
      return;
    }
    
    const available = participants.filter(p => (p.status === 'available' || p.status === 'advanced' || p.status === 'waiting') && p.mode === 'participant');
    
    if (available.length < 2) {
      toast({ title: "No hay suficientes participantes para un sorteo", variant: "destructive" });
      return;
    }

    const shuffled = [...available].sort(() => Math.random() - 0.5);
    const roundId = `round-${Date.now()}`;
    const batch = writeBatch(db);

    const matchIds: string[] = [];
    let byeParticipantId = undefined;

    for (let i = 0; i < shuffled.length; i += 2) {
      if (shuffled[i + 1]) {
        const matchRef = doc(collection(db, 'matches'));
        const dynamicId = dynamics[Math.floor(Math.random() * dynamics.length)].id;
        
        const match: Match = {
          id: matchRef.id,
          roundId,
          participantAId: shuffled[i].id,
          participantBId: shuffled[i + 1].id,
          dynamicId,
          status: 'pending',
          createdAt: new Date().toISOString(),
        };

        batch.set(matchRef, match);
        matchIds.push(matchRef.id);
      } else {
        byeParticipantId = shuffled[i].id;
        // The one with "bye" advances automatically
        batch.update(doc(db, 'participants', shuffled[i].id), { status: 'advanced' });
      }
    }

    batch.set(doc(db, 'rounds', roundId), {
      id: roundId,
      roundNumber: (settings?.currentRoundId ? 2 : 1), // Simplified
      status: 'active',
      matchIds,
      byeParticipantId,
      createdAt: new Date().toISOString(),
    });

    batch.update(doc(db, 'settings', 'config'), { 
      currentRoundId: roundId, 
      activeMatchId: matchIds[0],
      currentStatus: 'sorting'
    });

    await batch.commit();
    toast({ title: "Ronda sorteada con éxito" });
  };

  const handleStartMatch = async () => {
    if (!activeMatch) return;
    const batch = writeBatch(db);
    batch.update(doc(db, 'matches', activeMatch.id), { status: 'live' });
    batch.update(doc(db, 'participants', activeMatch.participantAId), { status: 'competing' });
    batch.update(doc(db, 'participants', activeMatch.participantBId), { status: 'competing' });
    batch.update(doc(db, 'settings', 'config'), { currentStatus: 'dueling' });
    await batch.commit();
  };

  const handleOpenVoting = async () => {
    if (!activeMatch) return;
    await updateDoc(doc(db, 'matches', activeMatch.id), { status: 'voting' });
  };

  const handleCloseVoting = async () => {
    if (!activeMatch) return;
    await updateDoc(doc(db, 'matches', activeMatch.id), { status: 'completed' });
  };

  const handleConfirmWinner = async (winnerId: string) => {
    if (!activeMatch) return;
    const loserId = winnerId === activeMatch.participantAId ? activeMatch.participantBId : activeMatch.participantAId;
    
    const batch = writeBatch(db);
    batch.update(doc(db, 'matches', activeMatch.id), { winnerId, loserId, status: 'completed', completedAt: new Date().toISOString() });
    batch.update(doc(db, 'participants', winnerId), { status: 'advanced' });
    batch.update(doc(db, 'participants', loserId), { status: 'eliminated' });
    
    // Check if we reached the final
    const remaining = participants.filter(p => (p.status === 'advanced' || p.status === 'available') && p.mode === 'participant' && p.id !== loserId);
    if (remaining.length <= (settings?.finalistsCount || 2)) {
      remaining.forEach(r => batch.update(doc(db, 'participants', r.id), { status: 'finalist' }));
      batch.update(doc(db, 'settings', 'config'), { currentStatus: 'finished' });
    }

    await batch.commit();
    toast({ title: "Ganador confirmado" });
  };

  const handleNextMatch = async () => {
    if (!settings?.currentRoundId) return;
    const currentIndex = matches.findIndex(m => m.id === activeMatchId);
    if (currentIndex < matches.length - 1) {
      await updateDoc(doc(db, 'settings', 'config'), { activeMatchId: matches[currentIndex + 1].id });
    } else {
      toast({ title: "¡Todos los duelos de esta ronda terminados!" });
    }
  };

  const handleUpdateParticipant = async (id: string, updates: Partial<Participant>) => {
    await updateDoc(doc(db, 'participants', id), updates);
  };

  const handleDeleteParticipant = async (id: string) => {
    if (!confirm("¿Borrar este registro?")) return;
    await deleteDoc(doc(db, 'participants', id));
  };

  const voteCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    votes.forEach(v => {
      counts[v.selectedParticipantId] = (counts[v.selectedParticipantId] || 0) + 1;
    });
    return counts;
  }, [votes]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8 pb-32">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-headline font-black text-primary uppercase tracking-tighter">
            {settings?.eventName || 'Retos Graduados'}
          </h1>
          <p className="text-muted-foreground font-medium uppercase text-xs tracking-widest">Panel del Conductor</p>
        </div>
        <div className="flex gap-2">
           <Button variant={settings?.registrationOpen ? "destructive" : "default"} onClick={handleToggleRegistration} className="rounded-xl h-12 font-bold px-6">
              {settings?.registrationOpen ? <XCircle className="w-5 h-5 mr-2" /> : <CheckCircle className="w-5 h-5 mr-2" />}
              {settings?.registrationOpen ? "Cerrar Registro" : "Abrir Registro"}
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-muted/30">
          <CardContent className="p-4 text-center">
            <p className="text-xs uppercase font-bold opacity-50">Registrados</p>
            <p className="text-3xl font-black">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-4 text-center">
            <p className="text-xs uppercase font-bold opacity-50">Participantes</p>
            <p className="text-3xl font-black text-primary">{stats.competitors}</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-4 text-center">
            <p className="text-xs uppercase font-bold opacity-50">Activos</p>
            <p className="text-3xl font-black text-green-500">{stats.active}</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-4 text-center">
            <p className="text-xs uppercase font-bold opacity-50">Finalistas</p>
            <p className="text-3xl font-black text-amber-500">{stats.finalists}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-2 border-primary overflow-hidden">
             <CardHeader className="bg-primary p-4 text-black flex flex-row items-center justify-between">
                <CardTitle className="font-headline font-black uppercase italic">Control de Duelos</CardTitle>
                <Shuffle className="w-6 h-6 cursor-pointer" onClick={handleSortRound} />
             </CardHeader>
             <CardContent className="p-6">
                {!activeMatch ? (
                   <div className="text-center py-10 space-y-4">
                      <Shuffle className="w-16 h-16 opacity-20 mx-auto" />
                      <p className="text-muted-foreground">No hay una ronda activa. Haz clic en el botón para sortear.</p>
                      <Button size="lg" onClick={handleSortRound} className="rounded-xl h-16 px-10 text-xl">
                        Sortear Nueva Ronda
                      </Button>
                   </div>
                ) : (
                   <div className="space-y-8">
                      <div className="flex justify-between items-center gap-4">
                         {/* Participant A */}
                         <div className="flex-1 text-center space-y-2">
                            <div className="w-24 h-24 rounded-full border-4 border-primary overflow-hidden mx-auto">
                               <img src={participants.find(p => p.id === activeMatch.participantAId)?.photoUrl} className="w-full h-full object-cover" alt="A" />
                            </div>
                            <h3 className="font-bold text-lg">{participants.find(p => p.id === activeMatch.participantAId)?.name}</h3>
                            <div className="text-2xl font-black text-primary">{voteCounts[activeMatch.participantAId] || 0}</div>
                            {activeMatch.status === 'completed' && !activeMatch.winnerId && (
                              <Button onClick={() => handleConfirmWinner(activeMatch.participantAId)}>Ganador</Button>
                            )}
                            {activeMatch.winnerId === activeMatch.participantAId && <Badge className="bg-green-500">GANADOR</Badge>}
                         </div>

                         <div className="flex flex-col items-center gap-2">
                            <div className="text-4xl font-black italic opacity-20">VS</div>
                            <Badge variant="outline">{activeMatch.status.toUpperCase()}</Badge>
                         </div>

                         {/* Participant B */}
                         <div className="flex-1 text-center space-y-2">
                            <div className="w-24 h-24 rounded-full border-4 border-primary overflow-hidden mx-auto">
                               <img src={participants.find(p => p.id === activeMatch.participantBId)?.photoUrl} className="w-full h-full object-cover" alt="B" />
                            </div>
                            <h3 className="font-bold text-lg">{participants.find(p => p.id === activeMatch.participantBId)?.name}</h3>
                            <div className="text-2xl font-black text-primary">{voteCounts[activeMatch.participantBId] || 0}</div>
                            {activeMatch.status === 'completed' && !activeMatch.winnerId && (
                              <Button onClick={() => handleConfirmWinner(activeMatch.participantBId)}>Ganador</Button>
                            )}
                            {activeMatch.winnerId === activeMatch.participantBId && <Badge className="bg-green-500">GANADOR</Badge>}
                         </div>
                      </div>

                      <div className="bg-muted/50 p-4 rounded-xl text-center">
                         <h4 className="font-bold text-primary mb-1">{dynamics.find(d => d.id === activeMatch.dynamicId)?.name}</h4>
                         <p className="text-sm opacity-80">{dynamics.find(d => d.id === activeMatch.dynamicId)?.instructions}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                         <Button onClick={handleStartMatch} disabled={activeMatch.status !== 'pending'} className="h-16 text-lg rounded-xl">
                            <Play className="w-5 h-5 mr-2" /> Iniciar Duelo
                         </Button>
                         <Button onClick={handleOpenVoting} disabled={activeMatch.status !== 'live'} className="h-16 text-lg rounded-xl">
                            <Radio className="w-5 h-5 mr-2" /> Abrir Votación
                         </Button>
                         <Button variant="outline" onClick={handleCloseVoting} disabled={activeMatch.status !== 'voting'} className="h-16 text-lg rounded-xl">
                            <CheckCircle className="w-5 h-5 mr-2" /> Cerrar Votación
                         </Button>
                         <Button variant="secondary" onClick={handleNextMatch} disabled={activeMatch.status !== 'completed'} className="h-16 text-lg rounded-xl">
                            Siguiente Duelo <ChevronRight className="w-5 h-5 ml-2" />
                         </Button>
                      </div>
                   </div>
                )}
             </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
           <Card>
              <CardHeader>
                <CardTitle className="text-lg font-headline font-bold">Asistentes ({participants.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0 max-h-[600px] overflow-auto">
                <div className="divide-y">
                   {participants.map(p => (
                      <div key={p.id} className="p-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-full overflow-hidden border">
                              <img src={p.photoUrl} className="w-full h-full object-cover" alt="" />
                           </div>
                           <div className="overflow-hidden">
                              <p className="font-bold text-sm truncate w-32">{p.name}</p>
                              <p className="text-[10px] opacity-50">{p.generationId} • {p.mode === 'participant' ? 'Competidor' : 'Votante'}</p>
                           </div>
                        </div>
                        <div className="flex gap-1">
                           <Button size="icon" variant="ghost" className="h-8 w-8 text-primary" onClick={() => handleUpdateParticipant(p.id, { mode: p.mode === 'participant' ? 'voter' : 'participant' })}>
                             <Shuffle className="w-3 h-3" />
                           </Button>
                           <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDeleteParticipant(p.id)}>
                             <XCircle className="w-3 h-3" />
                           </Button>
                        </div>
                      </div>
                   ))}
                </div>
              </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}
