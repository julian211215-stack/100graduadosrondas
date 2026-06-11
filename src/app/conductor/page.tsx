
"use client";

import { useAppSettings, useParticipants, useDynamics, useMatches, useVotes, localDB } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Users, Play, Radio, CheckCircle, ChevronRight, Shuffle, XCircle, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Participant, Match } from '@/lib/types';
import { useMemo } from 'react';

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

  const handleToggleRegistration = () => {
    if (!settings) return;
    localDB.updateSettings({ registrationOpen: !settings.registrationOpen });
  };

  const handleSortRound = () => {
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
    const matchIds: string[] = [];
    const generatedMatches: Match[] = [];

    for (let i = 0; i < shuffled.length; i += 2) {
      if (shuffled[i + 1]) {
        const id = crypto.randomUUID();
        const dynamicId = dynamics[Math.floor(Math.random() * dynamics.length)].id;
        
        const match: Match = {
          id,
          roundId,
          participantAId: shuffled[i].id,
          participantBId: shuffled[i + 1].id,
          dynamicId,
          status: 'pending',
          createdAt: new Date().toISOString(),
        };

        generatedMatches.push(match);
        matchIds.push(id);
      } else {
        // The one with "bye" advances automatically
        localDB.saveParticipant({ ...shuffled[i], status: 'advanced' });
      }
    }

    const round = {
      id: roundId,
      roundNumber: (settings?.currentRoundId ? 2 : 1),
      status: 'active',
      matchIds,
      createdAt: new Date().toISOString(),
    };

    localDB.createRound(round, generatedMatches);
    localDB.updateSettings({ 
      currentRoundId: roundId, 
      activeMatchId: matchIds[0],
      currentStatus: 'sorting'
    });

    toast({ title: "Ronda sorteada con éxito (Local)" });
  };

  const handleStartMatch = () => {
    if (!activeMatch) return;
    localDB.updateMatch(activeMatch.id, { status: 'live' });
    localDB.saveParticipant({ ...participants.find(p => p.id === activeMatch.participantAId)!, status: 'competing' });
    localDB.saveParticipant({ ...participants.find(p => p.id === activeMatch.participantBId)!, status: 'competing' });
    localDB.updateSettings({ currentStatus: 'dueling' });
  };

  const handleOpenVoting = () => {
    if (!activeMatch) return;
    localDB.updateMatch(activeMatch.id, { status: 'voting' });
  };

  const handleCloseVoting = () => {
    if (!activeMatch) return;
    localDB.updateMatch(activeMatch.id, { status: 'completed' });
  };

  const handleConfirmWinner = (winnerId: string) => {
    if (!activeMatch) return;
    const loserId = winnerId === activeMatch.participantAId ? activeMatch.participantBId : activeMatch.participantAId;
    
    localDB.updateMatch(activeMatch.id, { winnerId, loserId, status: 'completed', completedAt: new Date().toISOString() });
    localDB.saveParticipant({ ...participants.find(p => p.id === winnerId)!, status: 'advanced' });
    localDB.saveParticipant({ ...participants.find(p => p.id === loserId)!, status: 'eliminated' });
    
    // Check finalists
    const remaining = participants.filter(p => (p.status === 'advanced' || p.status === 'available') && p.mode === 'participant' && p.id !== loserId);
    if (remaining.length <= (settings?.finalistsCount || 2)) {
      remaining.forEach(r => localDB.saveParticipant({ ...r, status: 'finalist' }));
      localDB.updateSettings({ currentStatus: 'finished' });
    }

    toast({ title: "Ganador confirmado localmente" });
  };

  const handleNextMatch = () => {
    if (!settings?.currentRoundId) return;
    const currentIndex = matches.findIndex(m => m.id === activeMatchId);
    if (currentIndex < matches.length - 1) {
      localDB.updateSettings({ activeMatchId: matches[currentIndex + 1].id });
    } else {
      toast({ title: "¡Todos los duelos de esta ronda terminados!" });
    }
  };

  const handleDeleteParticipant = (id: string) => {
    if (!confirm("¿Borrar este registro?")) return;
    localDB.deleteParticipant(id);
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
          <h1 className="text-4xl font-headline font-black text-primary uppercase tracking-tighter shadow-sm">
            {settings?.eventName || 'Retos Graduados'}
          </h1>
          <p className="text-muted-foreground font-medium uppercase text-xs tracking-widest flex items-center gap-2">
            Panel del Conductor (Modo Local) 
            <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => window.location.reload()}><RefreshCw className="w-3 h-3"/></Button>
          </p>
        </div>
        <div className="flex gap-2">
           <Button variant={settings?.registrationOpen ? "destructive" : "default"} onClick={handleToggleRegistration} className="rounded-xl h-12 font-bold px-6 shadow-md">
              {settings?.registrationOpen ? <XCircle className="w-5 h-5 mr-2" /> : <CheckCircle className="w-5 h-5 mr-2" />}
              {settings?.registrationOpen ? "Cerrar Registro" : "Abrir Registro"}
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(stats).map(([label, val]) => (
          <Card key={label} className="bg-muted/30 border-none shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-[10px] uppercase font-bold opacity-50 tracking-wider">{label}</p>
              <p className="text-3xl font-black text-primary">{val}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-2 border-primary overflow-hidden shadow-2xl">
             <CardHeader className="bg-primary p-4 text-black flex flex-row items-center justify-between">
                <CardTitle className="font-headline font-black uppercase italic tracking-tight">Control de Duelos</CardTitle>
                <Button variant="ghost" size="icon" onClick={handleSortRound} className="text-black hover:bg-black/10">
                   <Shuffle className="w-5 h-5" />
                </Button>
             </CardHeader>
             <CardContent className="p-6">
                {!activeMatch ? (
                   <div className="text-center py-20 space-y-6">
                      <Shuffle className="w-20 h-20 opacity-10 mx-auto animate-pulse" />
                      <p className="text-muted-foreground font-medium">No hay una ronda activa en este dispositivo.</p>
                      <Button size="lg" onClick={handleSortRound} className="rounded-xl h-16 px-10 text-xl font-black shadow-lg">
                        Sortear Nueva Ronda
                      </Button>
                   </div>
                ) : (
                   <div className="space-y-8">
                      <div className="flex justify-between items-center gap-4">
                         {/* Participant A */}
                         <div className="flex-1 text-center space-y-4">
                            <div className="w-24 h-24 rounded-full border-4 border-primary overflow-hidden mx-auto shadow-md">
                               <img src={participants.find(p => p.id === activeMatch.participantAId)?.photoUrl} className="w-full h-full object-cover" alt="A" />
                            </div>
                            <div>
                               <h3 className="font-bold text-lg leading-tight">{participants.find(p => p.id === activeMatch.participantAId)?.name}</h3>
                               <div className="text-3xl font-black text-primary mt-1">{voteCounts[activeMatch.participantAId] || 0}</div>
                            </div>
                            {activeMatch.status === 'completed' && !activeMatch.winnerId && (
                              <Button variant="secondary" onClick={() => handleConfirmWinner(activeMatch.participantAId)}>Ganador</Button>
                            )}
                            {activeMatch.winnerId === activeMatch.participantAId && <Badge className="bg-green-500 text-white p-2">¡GANADOR!</Badge>}
                         </div>

                         <div className="flex flex-col items-center gap-4">
                            <div className="text-4xl font-black italic opacity-20">VS</div>
                            <Badge variant="outline" className="uppercase font-bold">{activeMatch.status}</Badge>
                         </div>

                         {/* Participant B */}
                         <div className="flex-1 text-center space-y-4">
                            <div className="w-24 h-24 rounded-full border-4 border-primary overflow-hidden mx-auto shadow-md">
                               <img src={participants.find(p => p.id === activeMatch.participantBId)?.photoUrl} className="w-full h-full object-cover" alt="B" />
                            </div>
                            <div>
                               <h3 className="font-bold text-lg leading-tight">{participants.find(p => p.id === activeMatch.participantBId)?.name}</h3>
                               <div className="text-3xl font-black text-primary mt-1">{voteCounts[activeMatch.participantBId] || 0}</div>
                            </div>
                            {activeMatch.status === 'completed' && !activeMatch.winnerId && (
                              <Button variant="secondary" onClick={() => handleConfirmWinner(activeMatch.participantBId)}>Ganador</Button>
                            )}
                            {activeMatch.winnerId === activeMatch.participantBId && <Badge className="bg-green-500 text-white p-2">¡GANADOR!</Badge>}
                         </div>
                      </div>

                      <div className="bg-muted/50 p-6 rounded-2xl text-center shadow-inner border">
                         <h4 className="font-black text-primary mb-2 text-xl tracking-tight">{dynamics.find(d => d.id === activeMatch.dynamicId)?.name}</h4>
                         <p className="text-sm opacity-80 italic">{dynamics.find(d => d.id === activeMatch.dynamicId)?.instructions}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                         <Button onClick={handleStartMatch} disabled={activeMatch.status !== 'pending'} className="h-16 text-lg rounded-xl font-bold">
                            <Play className="w-5 h-5 mr-2" /> Iniciar
                         </Button>
                         <Button onClick={handleOpenVoting} disabled={activeMatch.status !== 'live'} className="h-16 text-lg rounded-xl font-bold">
                            <Radio className="w-5 h-5 mr-2" /> Votar
                         </Button>
                         <Button variant="outline" onClick={handleCloseVoting} disabled={activeMatch.status !== 'voting'} className="h-16 text-lg rounded-xl font-bold">
                            <CheckCircle className="w-5 h-5 mr-2" /> Cerrar
                         </Button>
                         <Button variant="secondary" onClick={handleNextMatch} disabled={activeMatch.status !== 'completed' || !activeMatch.winnerId} className="h-16 text-lg rounded-xl font-bold">
                            Siguiente <ChevronRight className="w-5 h-5 ml-2" />
                         </Button>
                      </div>
                   </div>
                )}
             </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
           <Card className="shadow-lg border-none">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-headline font-bold">Asistentes ({participants.length})</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => window.location.reload()}><RefreshCw className="w-4 h-4"/></Button>
              </CardHeader>
              <CardContent className="p-0 max-h-[600px] overflow-auto">
                <div className="divide-y border-t">
                   {participants.map(p => (
                      <div key={p.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3">
                           <div className="w-12 h-12 rounded-full overflow-hidden border shadow-sm">
                              <img src={p.photoUrl} className="w-full h-full object-cover" alt="" />
                           </div>
                           <div className="overflow-hidden">
                              <p className="font-bold text-sm truncate w-32">{p.name}</p>
                              <p className="text-[10px] opacity-50 uppercase tracking-wider">{p.generationId} • {p.mode}</p>
                           </div>
                        </div>
                        <div className="flex gap-1">
                           <Button size="icon" variant="ghost" className="h-8 w-8 text-primary" onClick={() => localDB.saveParticipant({ ...p, mode: p.mode === 'participant' ? 'voter' : 'participant' })}>
                             <Shuffle className="w-3 h-3" />
                           </Button>
                           <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDeleteParticipant(p.id)}>
                             <XCircle className="w-3 h-3" />
                           </Button>
                        </div>
                      </div>
                   ))}
                   {participants.length === 0 && (
                     <div className="p-10 text-center opacity-30 text-sm italic">Nadie registrado aún</div>
                   )}
                </div>
              </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}
