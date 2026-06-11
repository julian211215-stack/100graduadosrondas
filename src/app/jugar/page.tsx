
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useAppSettings, localDB, useParticipants, useActiveMatch } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Camera, CheckCircle2, Trophy, Users, RefreshCw, AlertCircle, LogOut } from 'lucide-react';
import { Participant, Vote } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase';
import { signInAnonymously } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';

const STORAGE_KEY = 'retos_registered_user_id';

export default function PlayPage() {
  const settings = useAppSettings();
  const participants = useParticipants();
  const { toast } = useToast();
  
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  const [regData, setRegData] = useState({
    name: '',
    generationId: '',
    mode: 'participant' as 'participant' | 'voter',
  });
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [votedMatchId, setVotedMatchId] = useState<string | null>(null);

  const activeMatch = useActiveMatch(settings?.activeMatchId || undefined);

  // Load initial ID from storage
  useEffect(() => {
    const savedId = localStorage.getItem(STORAGE_KEY);
    if (savedId) {
      setCurrentId(savedId);
    } else {
      setLoading(false);
    }
  }, []);

  // Sync participant with Firestore based on currentId
  useEffect(() => {
    if (!currentId) {
      setParticipant(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = onSnapshot(doc(db, 'participants', currentId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setParticipant({ id: snap.id, ...data } as Participant);
      } else {
        localStorage.removeItem(STORAGE_KEY);
        setParticipant(null);
        setCurrentId(null);
      }
      setLoading(false);
    }, (err) => {
      console.error("Error syncing participant:", err);
      setLoading(false);
    });

    return unsub;
  }, [currentId]);

  // Derived Match Info with safety
  const matchInfo = useMemo(() => {
    if (!activeMatch || !participants.length || !participant) return null;
    
    const pA = participants.find(p => p.id === activeMatch.participantAId);
    const pB = participants.find(p => p.id === activeMatch.participantBId);
    
    if (!pA || !pB) return null;

    let role: 'spectator' | 'competitor' = 'spectator';
    let opponent: Participant | null = null;

    if (participant.id === pA.id) {
      role = 'competitor';
      opponent = pB;
    } else if (participant.id === pB.id) {
      role = 'competitor';
      opponent = pA;
    }

    return { activeMatch, pA, pB, role, opponent };
  }, [activeMatch, participants, participant]);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 300;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file);
        setPhotoBase64(compressed);
      } catch (err) {
        toast({ title: "Error al procesar imagen", variant: "destructive" });
      }
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploading) return;
    if (!regData.name || !regData.generationId) {
      toast({ title: "Completa todos los campos", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      let uid = crypto.randomUUID();
      try {
        const userCred = await signInAnonymously(auth);
        uid = userCred.user.uid;
      } catch (authErr) {
        console.warn("Auth fallback used");
      }

      const pData: Participant = {
        id: uid,
        name: regData.name.trim(),
        generationId: regData.generationId.trim(),
        photoUrl: photoBase64 || `https://picsum.photos/seed/${uid}/200`,
        mode: regData.mode,
        status: regData.mode === 'participant' ? 'available' : 'waiting',
        label: 'Activo',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await localDB.saveParticipant(pData);
      localStorage.setItem(STORAGE_KEY, uid);
      setCurrentId(uid); // This triggers the useEffect to show the personal screen
      toast({ title: "¡Bienvenido al evento!" });
    } catch (err: any) {
      console.error("Error al registrarse:", err);
      toast({ 
        title: "Error en el registro", 
        description: err.code + " - " + err.message, 
        variant: "destructive" 
      });
    } finally {
      setUploading(false);
    }
  };

  const handleVote = async (selectedId: string) => {
    if (!activeMatch || !participant) return;
    try {
      const vote: Vote = {
        id: crypto.randomUUID(),
        matchId: activeMatch.id,
        voterId: participant.id,
        selectedParticipantId: selectedId,
        createdAt: new Date().toISOString()
      };
      await localDB.castVote(vote);
      setVotedMatchId(activeMatch.id);
      toast({ title: "Voto enviado correctamente" });
    } catch (err) {
      console.error("Error al votar:", err);
    }
  };

  const handleClearSession = () => {
    if (confirm("¿Quieres limpiar tu sesión actual? Podrás registrarte de nuevo.")) {
      localStorage.removeItem(STORAGE_KEY);
      setParticipant(null);
      setCurrentId(null);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="text-center space-y-4">
        <RefreshCw className="w-10 h-10 animate-spin text-primary mx-auto" />
        <p className="font-black text-primary uppercase tracking-widest text-xs">Cargando Perfil...</p>
      </div>
    </div>
  );

  if (!participant) {
    if (settings && !settings.registrationOpen) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
          <div className="p-8 bg-card rounded-[2rem] border-2 border-dashed border-primary/20 space-y-4 shadow-xl">
             <Users className="w-16 h-16 text-muted-foreground mx-auto opacity-30" />
             <h2 className="text-2xl font-black uppercase tracking-tighter">Registro Cerrado</h2>
             <p className="text-muted-foreground text-sm uppercase tracking-widest max-w-[200px] mx-auto">Espera instrucciones del conductor para iniciar.</p>
             <Button variant="ghost" size="sm" onClick={() => window.location.reload()} className="text-[10px]"><RefreshCw className="w-3 h-3 mr-2" /> Actualizar</Button>
          </div>
        </div>
      );
    }

    return (
      <div className="p-6 max-w-md mx-auto space-y-8 animate-in fade-in duration-500">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-black font-headline text-primary uppercase tracking-tighter">Regístrate</h1>
          <p className="text-muted-foreground text-xs uppercase tracking-[0.3em]">100 Graduados Dijeron</p>
        </div>

        <Card className="border-2 border-primary/20 shadow-2xl overflow-hidden rounded-[2rem]">
          <CardContent className="pt-8 space-y-6">
            <form onSubmit={handleRegister} className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold opacity-50 ml-1">Nombre Completo</Label>
                <Input 
                  className="rounded-xl h-12 bg-muted/30 border-none"
                  value={regData.name} 
                  onChange={e => setRegData({...regData, name: e.target.value})} 
                  placeholder="Ej. Julián Domínguez" 
                  disabled={uploading}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold opacity-50 ml-1">Generación</Label>
                <Input 
                  className="rounded-xl h-12 bg-muted/30 border-none"
                  value={regData.generationId} 
                  onChange={e => setRegData({...regData, generationId: e.target.value})} 
                  placeholder="Ej. G120" 
                  disabled={uploading}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold opacity-50 ml-1">Tu Foto</Label>
                <div className="flex items-center gap-4 bg-muted/20 p-4 rounded-2xl">
                  <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-primary/30 shrink-0 shadow-lg">
                    {photoBase64 ? (
                      <img src={photoBase64} className="w-full h-full object-cover" alt="Profile" />
                    ) : (
                      <Camera className="w-8 h-8 opacity-20" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Input type="file" accept="image/*" className="hidden" id="cam-input" onChange={handleFileChange} />
                    <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('cam-input')?.click()} disabled={uploading} className="rounded-lg h-9 w-full">
                      <Camera className="w-4 h-4 mr-2" /> {photoBase64 ? 'Cambiar' : 'Capturar'}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] uppercase font-bold opacity-50 ml-1">Modalidad</Label>
                <RadioGroup value={regData.mode} onValueChange={(v: any) => setRegData({...regData, mode: v})} className="grid grid-cols-1 gap-2">
                  <div className={`flex items-center space-x-2 border-2 p-3 rounded-2xl cursor-pointer transition-all ${regData.mode === 'participant' ? 'border-primary bg-primary/10' : 'border-transparent bg-muted/30'}`}>
                    <RadioGroupItem value="participant" id="m-p" />
                    <Label htmlFor="m-p" className="cursor-pointer font-bold uppercase text-xs">Participar y Votar</Label>
                  </div>
                  <div className={`flex items-center space-x-2 border-2 p-3 rounded-2xl cursor-pointer transition-all ${regData.mode === 'voter' ? 'border-primary bg-primary/10' : 'border-transparent bg-muted/30'}`}>
                    <RadioGroupItem value="voter" id="m-v" />
                    <Label htmlFor="m-v" className="cursor-pointer font-bold uppercase text-xs">Solo Votar</Label>
                  </div>
                </RadioGroup>
              </div>

              <Button type="submit" className="w-full h-14 rounded-2xl text-lg font-black uppercase tracking-widest shadow-xl shadow-primary/20" disabled={uploading}>
                {uploading ? 'Registrando...' : 'Entrar al Evento'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-md mx-auto space-y-6 animate-in fade-in duration-500 pb-20">
      <Card className="bg-primary/5 border-primary/20 shadow-xl overflow-hidden rounded-[2.5rem]">
        <CardContent className="p-6 flex items-center gap-4">
          <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-primary/40 shrink-0 shadow-xl">
            <img src={participant.photoUrl || `https://picsum.photos/seed/${participant.id}/200`} className="w-full h-full object-cover" alt={participant.name} />
          </div>
          <div className="overflow-hidden space-y-1">
            <h3 className="font-black text-xl leading-tight truncate uppercase tracking-tighter">{participant.name}</h3>
            <p className="text-[10px] font-bold uppercase opacity-50 tracking-widest">Gen: {participant.generationId} • {participant.mode === 'participant' ? 'Competidor' : 'Votante'}</p>
            <div className="flex gap-2 items-center">
               <span className="bg-primary text-black text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                 {participant.label || 'Activo'}
               </span>
               <button onClick={() => window.location.reload()} className="p-1 hover:bg-primary/20 rounded-full transition-colors">
                  <RefreshCw className="w-3 h-3 text-primary" />
               </button>
               <button onClick={handleClearSession} className="p-1 hover:bg-destructive/20 rounded-full transition-colors ml-auto">
                  <LogOut className="w-3 h-3 text-destructive" />
               </button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {matchInfo?.activeMatch?.status === 'live' && matchInfo?.role === 'competitor' && (
           <Card className="border-secondary border-4 bg-secondary/10 overflow-hidden animate-pulse shadow-2xl rounded-[2.5rem]">
             <div className="bg-secondary p-4 text-center">
               <h2 className="text-white font-black text-2xl uppercase italic flex items-center justify-center gap-3">
                 <Trophy className="w-6 h-6" /> ¡TU TURNO!
               </h2>
             </div>
             <CardContent className="p-8 space-y-6 text-center">
               <div className="flex justify-center gap-6 items-center">
                 <div className="text-center space-y-2">
                   <div className="w-24 h-24 rounded-full border-4 border-white overflow-hidden mx-auto shadow-2xl ring-4 ring-secondary/30">
                      <img src={participant.photoUrl} className="w-full h-full object-cover" alt="Yo" />
                   </div>
                   <p className="text-[10px] font-black uppercase tracking-widest text-secondary">TÚ</p>
                 </div>
                 <div className="text-4xl font-black italic opacity-20">VS</div>
                 <div className="text-center space-y-2">
                   <div className="w-24 h-24 rounded-full border-4 border-white/50 overflow-hidden mx-auto shadow-xl">
                      <img src={matchInfo.opponent?.photoUrl || `https://picsum.photos/seed/opp/200`} className="w-full h-full object-cover" alt="Opp" />
                   </div>
                   <p className="text-[10px] font-black uppercase tracking-widest opacity-50 truncate w-24">{matchInfo.opponent?.name}</p>
                 </div>
               </div>
               <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl border-2 border-secondary/20">
                  <p className="text-[10px] font-black text-secondary uppercase tracking-widest mb-1">RETO ACTUAL</p>
                  <p className="text-sm font-bold leading-tight">Sigue las instrucciones del conductor</p>
               </div>
             </CardContent>
           </Card>
        )}

        {matchInfo?.activeMatch?.status === 'voting' && (
           <Card className="border-primary border-4 shadow-2xl rounded-[3rem] overflow-hidden bg-card/50 backdrop-blur-xl">
             <CardHeader className="text-center pb-0 bg-primary/10 py-6">
               <CardTitle className="text-primary font-black uppercase text-2xl tracking-tighter">¿Quién lo hizo mejor?</CardTitle>
               <p className="text-[10px] font-bold opacity-50 uppercase tracking-[0.3em]">Tu decisión cuenta</p>
             </CardHeader>
             <CardContent className="p-8">
                {votedMatchId === matchInfo.activeMatch.id ? (
                  <div className="text-center py-12 space-y-4 animate-in zoom-in duration-500">
                    <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-green-500/30">
                      <CheckCircle2 className="w-12 h-12 text-white" />
                    </div>
                    <h3 className="text-2xl font-black uppercase tracking-tighter">¡Voto Registrado!</h3>
                    <p className="opacity-50 text-xs font-bold uppercase tracking-widest">Espera los resultados</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-6">
                    <button onClick={() => handleVote(matchInfo.pA.id)} className="group flex flex-col items-center gap-4 p-5 rounded-[2rem] border-4 border-transparent hover:border-primary bg-muted/30 transition-all hover:scale-105 active:scale-95 shadow-lg">
                       <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white group-hover:border-primary shadow-xl">
                         <img src={matchInfo.pA.photoUrl} className="w-full h-full object-cover" alt="A" />
                       </div>
                       <p className="font-black text-center leading-none uppercase text-[10px] tracking-tighter h-8 flex items-center">{matchInfo.pA.name}</p>
                    </button>
                    <button onClick={() => handleVote(matchInfo.pB.id)} className="group flex flex-col items-center gap-4 p-5 rounded-[2rem] border-4 border-transparent hover:border-primary bg-muted/30 transition-all hover:scale-105 active:scale-95 shadow-lg">
                       <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white group-hover:border-primary shadow-xl">
                         <img src={matchInfo.pB.photoUrl} className="w-full h-full object-cover" alt="B" />
                       </div>
                       <p className="font-black text-center leading-none uppercase text-[10px] tracking-tighter h-8 flex items-center">{matchInfo.pB.name}</p>
                    </button>
                  </div>
                )}
             </CardContent>
           </Card>
        )}

        {(!matchInfo || 
          matchInfo.activeMatch?.status === 'pending' || 
          matchInfo.activeMatch?.status === 'completed' || 
          (matchInfo.activeMatch?.status === 'live' && matchInfo.role === 'spectator') ||
          (matchInfo.activeMatch?.status === 'voting' && votedMatchId === matchInfo.activeMatch.id)) && (
           <div className="text-center py-16 space-y-8 animate-in slide-in-from-bottom duration-1000">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 animate-pulse"></div>
                <Users className="w-24 h-24 text-primary mx-auto opacity-40 relative" />
              </div>
              <div className="space-y-3">
                <h2 className="text-3xl font-black uppercase tracking-tighter leading-none">
                  {participant.label || 'Todo en Orden'}
                </h2>
                <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.4em] max-w-[250px] mx-auto opacity-60">
                  Espera las indicaciones del conductor en pantalla
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => window.location.reload()} className="rounded-full text-[9px] font-black uppercase tracking-widest opacity-30 hover:opacity-100">
                 <RefreshCw className="w-3 h-3 mr-2" /> Forzar Actualización
              </Button>
           </div>
        )}
      </div>

      <div className="fixed bottom-6 left-0 right-0 text-[10px] uppercase font-black opacity-10 text-center tracking-[0.5em] select-none pointer-events-none">
        Software By Huki
      </div>
    </div>
  );
}
