
"use client";

import { useState, useEffect } from 'react';
import { useAppSettings, localDB, useParticipants, useActiveMatch } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Camera, CheckCircle2, Trophy, Users, AlertCircle, RefreshCw } from 'lucide-react';
import { Participant, Vote } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import { signInAnonymously } from 'firebase/auth';

export default function PlayPage() {
  const settings = useAppSettings();
  const participants = useParticipants();
  const { toast } = useToast();
  
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [regData, setRegData] = useState({
    name: '',
    generationId: '',
    mode: 'participant' as 'participant' | 'voter',
  });
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [votedMatchId, setVotedMatchId] = useState<string | null>(null);

  const activeMatch = useActiveMatch(settings?.activeMatchId || undefined);
  const [opponent, setOpponent] = useState<Participant | null>(null);
  const [participantA, setParticipantA] = useState<Participant | null>(null);
  const [participantB, setParticipantB] = useState<Participant | null>(null);

  useEffect(() => {
    const localUser = localStorage.getItem('retos_registered_user');
    if (localUser) {
      const parsed = JSON.parse(localUser);
      const exists = participants.find(p => p.id === parsed.id);
      if (exists) {
        setParticipant(exists);
      }
    }
    setLoading(false);
  }, [participants]);

  useEffect(() => {
    if (activeMatch) {
      const pA = participants.find(p => p.id === activeMatch.participantAId);
      const pB = participants.find(p => p.id === activeMatch.participantBId);
      
      if (pA) setParticipantA(pA);
      if (pB) setParticipantB(pB);

      if (participant) {
        if (activeMatch.participantAId === participant.id) {
          setOpponent(pB || null);
        } else if (activeMatch.participantBId === participant.id) {
          setOpponent(pA || null);
        }
      }
    }
  }, [activeMatch, participant, participants]);

  const compressImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 300;
        const MAX_HEIGHT = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.onerror = () => resolve(base64Str);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const result = reader.result as string;
        const compressed = await compressImage(result);
        setPhotoBase64(compressed);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!regData.name || !regData.generationId) {
      toast({ title: "Nombre y generación son obligatorios", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      let uid = crypto.randomUUID();
      try {
        const userCred = await signInAnonymously(auth);
        uid = userCred.user.uid;
      } catch (authError) {
        console.warn("Auth fallback used");
      }

      const photoToSave = photoBase64 || `https://picsum.photos/seed/${uid}/200`;

      const pData: Participant = {
        id: uid,
        name: regData.name.trim(),
        generationId: regData.generationId.trim(),
        photoUrl: photoToSave,
        mode: regData.mode,
        status: regData.mode === 'participant' ? 'available' : 'waiting',
        label: 'Registrado',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await localDB.saveParticipant(pData);
      localStorage.setItem('retos_registered_user', JSON.stringify(pData));
      setParticipant(pData);
      toast({ title: "¡Registro exitoso!" });
    } catch (err: any) {
      setErrorMessage(`Error: ${err.message || 'Error desconocido'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleVote = async (selectedParticipantId: string) => {
    if (!activeMatch || !participant) return;
    
    const vote: Vote = {
      id: crypto.randomUUID(),
      matchId: activeMatch.id,
      voterId: participant.id,
      selectedParticipantId,
      createdAt: new Date().toISOString()
    };

    try {
      await localDB.castVote(vote);
      setVotedMatchId(activeMatch.id);
      toast({ title: "Voto registrado" });
    } catch (err) {
      console.error("Error voting:", err);
    }
  };

  if (loading) return <div className="p-10 text-center text-primary font-bold">Cargando perfil...</div>;

  if (!participant) {
    if (!settings?.registrationOpen) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
          <Users className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold uppercase tracking-tighter">Registro cerrado</h2>
          <p className="text-muted-foreground mt-2">Espera instrucciones del conductor.</p>
        </div>
      );
    }

    return (
      <div className="p-6 max-w-md mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-headline font-bold text-primary uppercase">Regístrate</h1>
          <p className="text-muted-foreground">Únete al evento IDEHA México</p>
        </div>

        <Card className="border-2 border-primary/20 shadow-xl">
          <CardContent className="pt-6">
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre Completo</Label>
                <Input value={regData.name} onChange={e => setRegData({...regData, name: e.target.value})} placeholder="Ej. Juan Pérez" />
              </div>
              <div className="space-y-2">
                <Label>Generación</Label>
                <Input value={regData.generationId} onChange={e => setRegData({...regData, generationId: e.target.value})} placeholder="Ej. G120" />
              </div>
              
              <div className="space-y-2">
                <Label>Tu Foto</Label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-primary/50">
                    {photoBase64 ? (
                      <img src={photoBase64} className="w-full h-full object-cover" alt="Previsualización" />
                    ) : (
                      <Camera className="w-8 h-8 opacity-40" />
                    )}
                  </div>
                  <Input type="file" accept="image/*" className="hidden" id="camera-input" onChange={handleFileChange} />
                  <Button type="button" variant="outline" onClick={() => document.getElementById('camera-input')?.click()} disabled={uploading}>
                    <Camera className="w-4 h-4 mr-2" /> Capturar
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Modalidad</Label>
                <RadioGroup value={regData.mode} onValueChange={(v: any) => setRegData({...regData, mode: v})} className="grid grid-cols-1 gap-2">
                  <div className="flex items-center space-x-2 border p-3 rounded-lg cursor-pointer">
                    <RadioGroupItem value="participant" id="mode-p" />
                    <Label htmlFor="mode-p" className="cursor-pointer">Participar y votar</Label>
                  </div>
                  <div className="flex items-center space-x-2 border p-3 rounded-lg cursor-pointer">
                    <RadioGroupItem value="voter" id="mode-v" />
                    <Label htmlFor="mode-v" className="cursor-pointer">Solo votar</Label>
                  </div>
                </RadioGroup>
              </div>

              <Button type="submit" className="w-full h-12 rounded-xl text-lg font-bold" disabled={uploading}>
                {uploading ? 'Registrando...' : 'Entrar al Evento'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-md mx-auto space-y-4 pb-20">
      <Card className="bg-primary/5 border-primary/20 shadow-md">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary shrink-0 shadow-sm">
            <img src={participant.photoUrl} className="w-full h-full object-cover" alt={participant.name} />
          </div>
          <div className="overflow-hidden">
            <h3 className="font-bold text-lg leading-tight truncate uppercase">{participant.name}</h3>
            <p className="text-xs opacity-60">Gen: {participant.generationId} • {participant.mode === 'participant' ? 'Competidor' : 'Votante'}</p>
            <div className="mt-1 flex gap-2">
               <Badge className="text-[9px] uppercase font-black bg-primary/20 text-primary border-none">
                 {participant.label || participant.status}
               </Badge>
            </div>
          </div>
          <Button size="icon" variant="ghost" className="ml-auto" onClick={() => window.location.reload()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </CardContent>
      </Card>

      <div className="mt-4">
        {activeMatch && activeMatch.status === 'live' && (participant.id === activeMatch.participantAId || participant.id === activeMatch.participantBId) && opponent && (
           <Card className="border-secondary border-2 bg-secondary/10 overflow-hidden animate-pulse shadow-xl">
             <CardHeader className="bg-secondary p-4 text-center">
               <CardTitle className="text-white flex items-center justify-center gap-2">
                 <Trophy className="w-6 h-6" /> ¡TU TURNO!
               </CardTitle>
             </CardHeader>
             <CardContent className="p-6 space-y-4 text-center">
               <div className="flex justify-center gap-4 items-center">
                 <div className="text-center">
                   <div className="w-20 h-20 rounded-full border-4 border-white overflow-hidden mx-auto mb-2 shadow-md">
                      <img src={participant.photoUrl} className="w-full h-full object-cover" alt="Tu" />
                   </div>
                   <p className="text-xs font-bold uppercase">TÚ</p>
                 </div>
                 <div className="text-2xl font-black italic">VS</div>
                 <div className="text-center">
                   <div className="w-20 h-20 rounded-full border-4 border-white overflow-hidden mx-auto mb-2 shadow-md">
                      <img src={opponent.photoUrl} className="w-full h-full object-cover" alt="Oponente" />
                   </div>
                   <p className="text-xs font-bold truncate w-20 uppercase">{opponent.name}</p>
                 </div>
               </div>
             </CardContent>
           </Card>
        )}

        {activeMatch && activeMatch.status === 'voting' && participantA && participantB && (
           <Card className="border-primary border-2 shadow-2xl">
             <CardHeader className="text-center pb-2">
               <CardTitle className="text-primary font-headline uppercase">¿Quién lo hizo mejor?</CardTitle>
             </CardHeader>
             <CardContent className="p-6">
                {votedMatchId === activeMatch.id ? (
                  <div className="text-center py-10 space-y-4 animate-in fade-in zoom-in">
                    <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
                    <h3 className="text-xl font-bold uppercase">¡Voto registrado!</h3>
                    <p className="opacity-60 text-sm">Tu decisión ha sido enviada.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => handleVote(participantA.id)} className="flex flex-col items-center gap-3 p-4 rounded-2xl border-2 border-transparent hover:border-primary bg-muted/30 transition-all">
                       <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white shadow-lg">
                         <img src={participantA.photoUrl} className="w-full h-full object-cover" alt="A" />
                       </div>
                       <p className="font-bold text-center leading-tight uppercase text-xs">{participantA.name}</p>
                    </button>
                    <button onClick={() => handleVote(participantB.id)} className="flex flex-col items-center gap-3 p-4 rounded-2xl border-2 border-transparent hover:border-primary bg-muted/30 transition-all">
                       <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white shadow-lg">
                         <img src={participantB.photoUrl} className="w-full h-full object-cover" alt="B" />
                       </div>
                       <p className="font-bold text-center leading-tight uppercase text-xs">{participantB.name}</p>
                    </button>
                  </div>
                )}
             </CardContent>
           </Card>
        )}

        {(!activeMatch || activeMatch.status === 'pending' || activeMatch.status === 'completed' || (activeMatch.status === 'live' && participant.id !== activeMatch.participantAId && participant.id !== activeMatch.participantBId) || (activeMatch.status === 'voting' && votedMatchId === activeMatch.id)) && (
           <div className="text-center py-12 space-y-6">
              <Users className="w-16 h-16 text-primary mx-auto opacity-30" />
              <div className="space-y-2">
                <h2 className="text-2xl font-black uppercase tracking-tighter">
                  {participant.label || 'Estás registrado'}
                </h2>
                <p className="text-muted-foreground text-sm uppercase tracking-widest">
                  Espera instrucciones del conductor.
                </p>
              </div>
           </div>
        )}
      </div>
      <div className="text-[8px] uppercase font-bold opacity-10 text-center mt-8">
        Software By Huki
      </div>
    </div>
  );
}
