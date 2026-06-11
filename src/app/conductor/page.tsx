
"use client";

import { useAppSettings, useParticipants, useDynamics, useMatches, useVotes, localDB } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Users, Play, Radio, CheckCircle, ChevronRight, Shuffle, XCircle, RefreshCw, UserPlus, Settings2, Edit, Save } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Participant, Match } from '@/lib/types';
import { useMemo, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export default function ConductorPage() {
  const settings = useAppSettings();
  const participants = useParticipants();
  const dynamics = useDynamics();
  const { toast } = useToast();

  const [manualA, setManualA] = useState<string>("");
  const [manualB, setManualB] = useState<string>("");
  const [manualDyn, setManualDyn] = useState<string>("");
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [tempLabel, setTempLabel] = useState<string>("");

  const activeMatchId = settings?.activeMatchId;
  const matches = useMatches(settings?.currentRoundId || undefined);
  const activeMatch = useMemo(() => matches.find(m => m.id === activeMatchId), [matches, activeMatchId]);
  const votes = useVotes(activeMatchId || undefined);

  // All participants are eligible for manual duels in this version
  const allParticipants = useMemo(() => 
    participants.filter(p => p.mode === 'participant'), 
  [participants]);

  const stats = {
    total: participants.length,
    competitors: participants.filter(p => p.mode === 'participant').length,
    voters: participants.filter(p => p.mode === 'voter').length,
    active: participants.filter(p => p.status !== 'eliminated').length,
    eliminated: participants.filter(p => p.status === 'eliminated').length,
  };

  const handleToggleRegistration = () => {
    if (!settings) return;
    localDB.updateSettings({ registrationOpen: !settings.registrationOpen });
  };

  const handleCreateManualMatch = async () => {
    if (!manualA || !manualB || !manualDyn) {
      toast({ title: "Selecciona participantes y dinámica", variant: "destructive" });
      return;
    }
    if (manualA === manualB) {
      toast({ title: "No puede competir contra sí mismo", variant: "destructive" });
      return;
    }

    const roundId = `manual-${Date.now()}`;
    const id = crypto.randomUUID();
    
    const match: Match = {
      id,
      roundId,
      participantAId: manualA,
      participantBId: manualB,
      dynamicId: manualDyn,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    try {
      await localDB.createRound({
        id: roundId,
        roundNumber: 0,
        status: 'active',
        matchIds: [id],
        createdAt: new Date().toISOString(),
      }, [match]);

      await localDB.updateSettings({ 
        currentRoundId: roundId, 
        activeMatchId: id,
        currentStatus: 'dueling'
      });

      setManualA("");
      setManualB("");
      setManualDyn("");
      toast({ title: "Duelo manual creado" });
    } catch (error) {
      toast({ title: "Error al crear duelo", variant: "destructive" });
    }
  };

  const handleSortRound = () => {
    if (dynamics.length === 0) {
      toast({ title: "Agrega dinámicas primero", variant: "destructive" });
      return;
    }
    
    const available = participants.filter(p => 
      (p.status !== 'eliminated') && p.mode === 'participant'
    );
    
    if (available.length < 2) {
      toast({ title: "No hay suficientes participantes activos", variant: "destructive" });
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
      }
    }

    localDB.createRound({
      id: roundId,
      roundNumber: 1,
      status: 'active',
      matchIds,
      createdAt: new Date().toISOString(),
    }, generatedMatches);

    localDB.updateSettings({ 
      currentRoundId: roundId, 
      activeMatchId: matchIds[0],
      currentStatus: 'dueling'
    });

    toast({ title: "Ronda sorteada" });
  };

  const handleStartMatch = () => {
    if (!activeMatch) return;
    localDB.updateMatch(activeMatch.id, { status: 'live' });
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
    
    const winner = participants.find(p => p.id === winnerId);
    const loser = participants.find(p => p.id === loserId);
    
    if (winner) localDB.saveParticipant({ ...winner, status: 'advanced' });
    if (loser) localDB.saveParticipant({ ...loser, status: 'eliminated' });
    
    toast({ title: "Resultado guardado" });
  };

  const handleNextMatch = () => {
    if (!settings?.currentRoundId) return;
    const currentIndex = matches.findIndex(m => m.id === activeMatchId);
    if (currentIndex < matches.length - 1) {
      localDB.updateSettings({ activeMatchId: matches[currentIndex + 1].id });
    } else {
      toast({ title: "¡Ronda completada!" });
    }
  };

  const handleSaveLabel = async (p: Participant) => {
    await localDB.saveParticipant({ ...p, label: tempLabel });
    setEditingLabelId(null);
    toast({ title: "Etiqueta actualizada" });
  };

  const handleRehabilitate = async (p: Participant) => {
    await localDB.saveParticipant({ ...p, status: 'available', label: 'Rehabilitado' });
    toast({ title: "Participante rehabilitado" });
  };

  const voteCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    votes.forEach(v => {
      counts[v.selectedParticipantId] = (counts[v.selectedParticipantId] || 0) + 1;
    });
    return counts;
  }, [votes]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 pb-32 scale-[0.92] origin-top">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-headline font-black text-primary uppercase tracking-tighter">
            {settings?.eventName || 'Retos Graduados'}
          </h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-[0.3em] flex items-center gap-2">
            Panel del Conductor <Badge variant="outline" className="text-[9px] border-primary/20">Modo Manual</Badge>
          </p>
        </div>
        <div className="flex gap-2">
           <Button variant={settings?.registrationOpen ? "destructive" : "default"} onClick={handleToggleRegistration} className="rounded-xl h-12 font-bold px-6 shadow-lg">
              {settings?.registrationOpen ? "Cerrar Registro" : "Abrir Registro"}
           </Button>
           <Button variant="outline" onClick={() => localDB.resetAll()} className="rounded-xl h-12 font-bold">
              Reiniciar
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Object.entries(stats).map(([label, val]) => (
          <Card key={label} className="bg-muted/20 border-none shadow-sm">
            <CardContent className="p-3 text-center">
              <p className="text-[9px] uppercase font-bold opacity-40 tracking-widest">{label}</p>
              <p className="text-2xl font-black text-primary">{val}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <Card className="border-2 border-primary/50 overflow-hidden shadow-2xl">
             <CardHeader className="bg-primary/10 border-b border-primary/20 p-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-headline font-black uppercase text-xl flex items-center gap-2">
                    <Play className="w-5 h-5 text-primary" /> Control de Duelo
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={handleSortRound} className="rounded-lg h-9">
                    <Shuffle className="w-4 h-4 mr-2" /> Sorteo Automático
                  </Button>
                </div>
             </CardHeader>
             <CardContent className="p-6">
                {!activeMatch ? (
                   <div className="text-center py-16 space-y-4">
                      <Trophy className="w-16 h-16 opacity-20 mx-auto" />
                      <p className="text-muted-foreground font-medium uppercase tracking-widest text-sm">Arma un duelo manual para comenzar</p>
                   </div>
                ) : (
                   <div className="space-y-8 animate-in fade-in zoom-in duration-300">
                      <div className="flex justify-between items-center gap-6">
                         <div className="flex-1 text-center space-y-4">
                            <div className={`w-28 h-28 rounded-full border-4 overflow-hidden mx-auto shadow-xl ${activeMatch.winnerId === activeMatch.participantAId ? 'border-green-500 scale-110' : 'border-primary'}`}>
                               <img src={participants.find(p => p.id === activeMatch.participantAId)?.photoUrl} className="w-full h-full object-cover" alt="A" />
                            </div>
                            <div>
                               <h3 className="font-black text-xl truncate uppercase">{participants.find(p => p.id === activeMatch.participantAId)?.name}</h3>
                               <Badge variant="outline" className="text-[9px] mt-1">{participants.find(p => p.id === activeMatch.participantAId)?.label || 'Activo'}</Badge>
                               <div className="text-4xl font-black text-primary mt-2">{voteCounts[activeMatch.participantAId] || 0}</div>
                            </div>
                            {activeMatch.status === 'completed' && !activeMatch.winnerId && (
                              <Button variant="secondary" onClick={() => handleConfirmWinner(activeMatch.participantAId)} className="w-full font-bold">Ganador</Button>
                            )}
                         </div>

                         <div className="text-5xl font-black italic opacity-10">VS</div>

                         <div className="flex-1 text-center space-y-4">
                            <div className={`w-28 h-28 rounded-full border-4 overflow-hidden mx-auto shadow-xl ${activeMatch.winnerId === activeMatch.participantBId ? 'border-green-500 scale-110' : 'border-primary'}`}>
                               <img src={participants.find(p => p.id === activeMatch.participantBId)?.photoUrl} className="w-full h-full object-cover" alt="B" />
                            </div>
                            <div>
                               <h3 className="font-black text-xl truncate uppercase">{participants.find(p => p.id === activeMatch.participantBId)?.name}</h3>
                               <Badge variant="outline" className="text-[9px] mt-1">{participants.find(p => p.id === activeMatch.participantBId)?.label || 'Activo'}</Badge>
                               <div className="text-4xl font-black text-primary mt-2">{voteCounts[activeMatch.participantBId] || 0}</div>
                            </div>
                            {activeMatch.status === 'completed' && !activeMatch.winnerId && (
                              <Button variant="secondary" onClick={() => handleConfirmWinner(activeMatch.participantBId)} className="w-full font-bold">Ganador</Button>
                            )}
                         </div>
                      </div>

                      <div className="bg-muted/40 p-5 rounded-2xl text-center border-2 border-dashed border-primary/20">
                         <h4 className="font-black text-primary mb-1 text-lg uppercase">{dynamics.find(d => d.id === activeMatch.dynamicId)?.name}</h4>
                         <p className="text-xs opacity-70 italic">{dynamics.find(d => d.id === activeMatch.dynamicId)?.instructions}</p>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                         <Button onClick={handleStartMatch} disabled={activeMatch.status !== 'pending'} className="h-14 rounded-xl font-bold">Iniciar</Button>
                         <Button onClick={handleOpenVoting} disabled={activeMatch.status !== 'live'} className="h-14 rounded-xl font-bold">Votar</Button>
                         <Button variant="outline" onClick={handleCloseVoting} disabled={activeMatch.status !== 'voting'} className="h-14 rounded-xl font-bold">Cerrar</Button>
                         <Button variant="secondary" onClick={handleNextMatch} disabled={activeMatch.status !== 'completed' || !activeMatch.winnerId} className="h-14 rounded-xl font-bold">Próximo</Button>
                      </div>
                   </div>
                )}
             </CardContent>
          </Card>

          <Card className="bg-muted/10 border-2 border-dashed border-primary/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-black uppercase flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-primary" /> Crear Duelo Manual
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold opacity-50">Participante A</Label>
                  <Select value={manualA} onValueChange={setManualA}>
                    <SelectTrigger className="bg-background rounded-xl">
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allParticipants.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name} ({p.label || p.status})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold opacity-50">Participante B</Label>
                  <Select value={manualB} onValueChange={setManualB}>
                    <SelectTrigger className="bg-background rounded-xl">
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allParticipants.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name} ({p.label || p.status})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold opacity-50">Dinámica</Label>
                  <Select value={manualDyn} onValueChange={setManualDyn}>
                    <SelectTrigger className="bg-background rounded-xl">
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {dynamics.map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleCreateManualMatch} className="w-full h-12 rounded-xl font-black bg-primary text-black hover:bg-primary/80">
                <UserPlus className="w-5 h-5 mr-2" /> Lanzar Duelo
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-6">
           <Card className="shadow-xl border-none h-full max-h-[900px] flex flex-col overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/5">
                <CardTitle className="text-base font-black uppercase">Participantes ({participants.length})</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => window.location.reload()}><RefreshCw className="w-4 h-4"/></Button>
              </CardHeader>
              <CardContent className="p-0 overflow-auto flex-1">
                <div className="divide-y">
                   {participants.map(p => (
                      <div key={p.id} className="p-3 flex items-center justify-between hover:bg-primary/5 transition-colors">
                        <div className="flex items-center gap-3">
                           <div className={`w-10 h-10 rounded-full overflow-hidden border-2 ${p.status === 'eliminated' ? 'border-destructive/30 grayscale' : 'border-primary/50'}`}>
                              <img src={p.photoUrl} className="w-full h-full object-cover" alt="" />
                           </div>
                           <div className="overflow-hidden">
                              <p className="font-black text-xs truncate w-32 uppercase leading-none mb-1">{p.name}</p>
                              <div className="flex flex-wrap items-center gap-1">
                                {editingLabelId === p.id ? (
                                  <div className="flex gap-1 items-center">
                                    <Input 
                                      className="h-6 text-[10px] w-20 px-1" 
                                      value={tempLabel} 
                                      onChange={(e) => setTempLabel(e.target.value)}
                                      onKeyDown={(e) => e.key === 'Enter' && handleSaveLabel(p)}
                                    />
                                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleSaveLabel(p)}>
                                      <Save className="w-3 h-3 text-green-500" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    <Badge variant="outline" className={`text-[8px] px-1 h-4 ${p.status === 'eliminated' ? 'text-destructive' : 'text-primary'}`}>{p.label || p.status}</Badge>
                                    <Button size="icon" variant="ghost" className="h-4 w-4 opacity-30 hover:opacity-100" onClick={() => { setEditingLabelId(p.id); setTempLabel(p.label || ''); }}>
                                      <Edit className="w-2 h-2" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                           </div>
                        </div>
                        <div className="flex gap-1">
                           {p.status === 'eliminated' && (
                             <Button size="icon" variant="ghost" className="h-7 w-7 text-green-500" onClick={() => handleRehabilitate(p)}>
                               <RefreshCw className="w-3 h-3" />
                             </Button>
                           )}
                           <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" onClick={() => localDB.saveParticipant({ ...p, mode: p.mode === 'participant' ? 'voter' : 'participant' })}>
                             <Shuffle className="w-3 h-3" />
                           </Button>
                           <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => localDB.deleteParticipant(p.id)}>
                             <XCircle className="w-3 h-3" />
                           </Button>
                        </div>
                      </div>
                   ))}
                </div>
              </CardContent>
              <div className="p-2 border-t text-[8px] uppercase font-bold opacity-20 text-center">
                Software By Huki
              </div>
           </Card>
        </div>
      </div>
    </div>
  );
}
