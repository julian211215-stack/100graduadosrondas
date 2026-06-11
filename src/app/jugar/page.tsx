
"use client";

import { useState, useEffect } from 'react';
import { db, auth, storage } from '@/lib/firebase';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAppSettings, useActiveMatch } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Camera, CheckCircle2, Trophy, Users, AlertCircle } from 'lucide-react';
import { Participant, Dynamic } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export default function PlayPage() {
  const settings = useAppSettings();
  const { toast } = useToast();
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [regData, setRegData] = useState({
    name: '',
    generationId: '',
    mode: 'participant' as 'participant' | 'voter',
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [votedMatchId, setVotedMatchId] = useState<string | null>(null);

  const activeMatch = useActiveMatch(settings?.activeMatchId || undefined);
  const [opponent, setOpponent] = useState<Participant | null>(null);
  const [participantA, setParticipantA] = useState<Participant | null>(null);
  const [participantB, setParticipantB] = useState<Participant | null>(null);
  const [activeDynamic, setActiveDynamic] = useState<Dynamic | null>(null);

  useEffect(() => {
    // Check local storage first for immediate feedback
    const localUid = localStorage.getItem('ideha_registered_uid');
    
    const checkRegistration = async (uid: string) => {
      try {
        const docRef = doc(db, 'participants', uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setParticipant(docSnap.data() as Participant);
          
          // Setup real-time listener
          onSnapshot(docRef, (snap) => {
            if (snap.exists()) setParticipant(snap.data() as Participant);
          });
        }
      } catch (err) {
        console.error("Error verificando registro persistente:", err);
      }
    };

    if (localUid) {
      checkRegistration(localUid);
    }

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        await checkRegistration(u.uid);
      }
      setLoading(false);
    });
    
    // Safety timeout for loading
    const timer = setTimeout(() => setLoading(false), 3000);

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const fetchMatchData = async () => {
      if (activeMatch) {
        try {
          const dSnap = await getDoc(doc(db, 'dynamics', activeMatch.dynamicId));
          if (dSnap.exists()) setActiveDynamic({ id: dSnap.id, ...dSnap.data() } as Dynamic);

          const aSnap = await getDoc(doc(db, 'participants', activeMatch.participantAId));
          if (aSnap.exists()) setParticipantA({ id: aSnap.id, ...aSnap.data() } as Participant);
          
          const bSnap = await getDoc(doc(db, 'participants', activeMatch.participantBId));
          if (bSnap.exists()) setParticipantB({ id: bSnap.id, ...bSnap.data() } as Participant);

          if (participant) {
             if (activeMatch.participantAId === participant.id) {
               setOpponent(participantB);
             } else if (activeMatch.participantBId === participant.id) {
               setOpponent(participantA);
             }
          }
        } catch (err) {
          console.error("Error cargando datos del duelo:", err);
        }
      }
    };
    fetchMatchData();
  }, [activeMatch, participant, participantA, participantB]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!regData.name || !regData.generationId) {
      toast({ title: "Nombre y generación son obligatorios", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      // 1. Auth with Fallback
      let uid = "";
      try {
        const userCredential = await signInAnonymously(auth);
        uid = userCredential.user.uid;
      } catch (authError: any) {
        console.error("Error completo al registrarse (Auth): falló signInAnonymously, usando fallback local.", authError);
        // Fallback UID if Auth fails (for dev/testing)
        uid = localStorage.getItem('ideha_registered_uid') || `local-${Math.random().toString(36).substr(2, 9)}`;
      }

      let photoUrl = `https://picsum.photos/seed/${uid}/200`;

      // 2. Storage
      if (photo) {
        try {
          const photoRef = ref(storage, `photos/${uid}`);
          await uploadBytes(photoRef, photo);
          photoUrl = await getDownloadURL(photoRef);
        } catch (storageError: any) {
          console.error("Error completo al registrarse (Storage):", storageError);
          setErrorMessage("No se pudo subir la fotografía. Se usará un avatar temporal.");
          // Don't block registration if storage fails
        }
      }

      // 3. Firestore
      const pData: Participant = {
        id: uid,
        name: regData.name,
        generationId: regData.generationId,
        photoUrl,
        mode: regData.mode,
        status: regData.mode === 'participant' ? 'available' : 'waiting',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      try {
        await setDoc(doc(db, 'participants', uid), pData);
        setParticipant(pData);
        localStorage.setItem('ideha_registered_uid', uid);
        toast({ title: "¡Registro exitoso!" });
      } catch (dbError: any) {
        console.error("Error completo al registrarse (Firestore):", dbError);
        setErrorMessage("No se pudo guardar el registro en la base de datos.");
        throw dbError;
      }

    } catch (err: any) {
      console.error("Error completo al registrarse:", err);
      if (!errorMessage) {
        setErrorMessage("No se pudo completar el registro. Revisa la consola o configuración de Firebase.");
      }
    } finally {
      setUploading(false);
    }
  };

  const handleVote = async (selectedParticipantId: string) => {
    toast({ title: "Voto registrado (Simulación)" });
    setVotedMatchId(activeMatch?.id || null);
  };

  if (loading) return <div className="p-10 text-center text-primary font-bold">Cargando perfil...</div>;

  if (!participant) {
    if (!settings?.registrationOpen) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
          <Users className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold">El registro aún no está abierto</h2>
          <p className="text-muted-foreground mt-2">Espera las instrucciones del conductor.</p>
        </div>
      );
    }

    return (
      <div className="p-6 max-w-md mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-headline font-bold text-primary">Regístrate</h1>
          <p className="text-muted-foreground">Únete a la dinámica IDEHA</p>
        </div>

        {errorMessage && (
          <div className="bg-destructive/10 border border-destructive p-4 rounded-xl text-destructive text-sm font-medium flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{errorMessage}</p>
          </div>
        )}

        <Card className="border-2 border-primary/20">
          <CardContent className="pt-6">
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre Completo</Label>
                <Input value={regData.name} onChange={e => setRegData({...regData, name: e.target.value})} placeholder="Ej. Juan Pérez" />
              </div>
              <div className="space-y-2">
                <Label>Generación o ID</Label>
                <Input value={regData.generationId} onChange={e => setRegData({...regData, generationId: e.target.value})} placeholder="Ej. G120" />
              </div>
              
              <div className="space-y-2">
                <Label>Tu Foto</Label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-primary/50">
                    {photo ? (
                      <img src={URL.createObjectURL(photo)} className="w-full h-full object-cover" alt="Previsualización" />
                    ) : (
                      <Camera className="w-8 h-8 opacity-40" />
                    )}
                  </div>
                  <Input type="file" accept="image/*" capture="user" className="hidden" id="camera-input" onChange={e => setPhoto(e.target.files?.[0] || null)} />
                  <Button type="button" variant="outline" onClick={() => document.getElementById('camera-input')?.click()}>
                    <Camera className="w-4 h-4 mr-2" /> {photo ? 'Cambiar Foto' : 'Tomar Foto'}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Modalidad</Label>
                <RadioGroup value={regData.mode} onValueChange={(v: any) => setRegData({...regData, mode: v})} className="grid grid-cols-1 gap-2">
                  <div className="flex items-center space-x-2 border p-3 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="participant" id="mode-p" />
                    <Label htmlFor="mode-p" className="cursor-pointer">Quiero participar y votar</Label>
                  </div>
                  <div className="flex items-center space-x-2 border p-3 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="voter" id="mode-v" />
                    <Label htmlFor="mode-v" className="cursor-pointer">Solo quiero votar</Label>
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

  // Live Screen for Registered Users
  return (
    <div className="p-4 max-w-md mx-auto space-y-4 pb-20">
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary shrink-0">
            <img src={participant.photoUrl} className="w-full h-full object-cover" alt={participant.name} />
          </div>
          <div className="overflow-hidden">
            <h3 className="font-bold text-lg leading-tight truncate">{participant.name}</h3>
            <p className="text-xs opacity-60">Gen: {participant.generationId} • {participant.mode === 'participant' ? 'Competidor' : 'Espectador'}</p>
            <div className="mt-1">
               <span className="text-[10px] uppercase font-black bg-primary/20 text-primary px-2 py-0.5 rounded">
                 {participant.status === 'eliminated' ? 'Eliminado' : participant.status === 'finalist' ? 'Finalista' : participant.status === 'advanced' ? 'Avanzado' : 'Activo'}
               </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* States */}
      <div className="mt-4">
        {/* DUEL STATE */}
        {activeMatch && activeMatch.status === 'live' && participant.status === 'competing' && opponent && activeDynamic && (
           <Card className="border-secondary border-2 bg-secondary/10 overflow-hidden animate-pulse">
             <CardHeader className="bg-secondary p-4 text-center">
               <CardTitle className="text-white flex items-center justify-center gap-2">
                 <Trophy className="w-6 h-6" /> ¡TE TOCA COMPETIR!
               </CardTitle>
             </CardHeader>
             <CardContent className="p-6 space-y-4 text-center">
               <div className="flex justify-center gap-4 items-center">
                 <div className="text-center">
                   <div className="w-20 h-20 rounded-full border-4 border-white overflow-hidden mx-auto mb-2">
                      <img src={participant.photoUrl} className="w-full h-full object-cover" alt="Tu" />
                   </div>
                   <p className="text-xs font-bold">TÚ</p>
                 </div>
                 <div className="text-2xl font-black italic">VS</div>
                 <div className="text-center">
                   <div className="w-20 h-20 rounded-full border-4 border-white overflow-hidden mx-auto mb-2">
                      <img src={opponent.photoUrl} className="w-full h-full object-cover" alt="Oponente" />
                   </div>
                   <p className="text-xs font-bold truncate w-20">{opponent.name}</p>
                 </div>
               </div>
               <div className="pt-4 space-y-2">
                 <h2 className="text-2xl font-headline font-bold text-primary">{activeDynamic.name}</h2>
                 <p className="text-sm italic">{activeDynamic.instructions}</p>
               </div>
             </CardContent>
           </Card>
        )}

        {/* VOTING STATE */}
        {activeMatch && activeMatch.status === 'voting' && participantA && participantB && (
           <Card className="border-primary border-2">
             <CardHeader className="text-center pb-2">
               <CardTitle className="text-primary font-headline">¿Quién lo hizo mejor?</CardTitle>
               <CardDescription>Vota por el ganador de este duelo</CardDescription>
             </CardHeader>
             <CardContent className="p-6">
                {votedMatchId === activeMatch.id ? (
                  <div className="text-center py-10 space-y-4">
                    <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
                    <h3 className="text-xl font-bold">¡Voto registrado!</h3>
                    <p className="opacity-60">Tu decisión ha sido tomada. Espera los resultados.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => handleVote(participantA.id)} className="flex flex-col items-center gap-3 p-4 rounded-2xl border-2 border-transparent hover:border-primary bg-muted/30 transition-all">
                       <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white shadow-lg">
                         <img src={participantA.photoUrl} className="w-full h-full object-cover" alt="A" />
                       </div>
                       <p className="font-bold text-center leading-tight h-10 overflow-hidden">{participantA.name}</p>
                    </button>
                    <button onClick={() => handleVote(participantB.id)} className="flex flex-col items-center gap-3 p-4 rounded-2xl border-2 border-transparent hover:border-primary bg-muted/30 transition-all">
                       <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white shadow-lg">
                         <img src={participantB.photoUrl} className="w-full h-full object-cover" alt="B" />
                       </div>
                       <p className="font-bold text-center leading-tight h-10 overflow-hidden">{participantB.name}</p>
                    </button>
                  </div>
                )}
             </CardContent>
           </Card>
        )}

        {/* WAITING STATE */}
        {(!activeMatch || activeMatch.status === 'pending' || activeMatch.status === 'completed' || participant.status === 'waiting' || participant.status === 'available') && (
           <div className="text-center py-12 space-y-6">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full"></div>
                <Users className="w-20 h-20 text-primary relative" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">
                  {participant.status === 'eliminated' ? 'Sigues votando' : 
                   participant.status === 'finalist' ? '¡Eres finalista!' :
                   participant.status === 'advanced' ? '¡Avanzaste!' :
                   'Estás registrado'}
                </h2>
                <p className="text-muted-foreground">
                  {participant.status === 'eliminated' ? 'Tu participación terminó, pero tu voto sigue contando.' :
                   participant.status === 'finalist' ? 'Prepárate para la gran final.' :
                   'Espera las instrucciones del conductor para el siguiente duelo.'}
                </p>
              </div>
           </div>
        )}
      </div>
    </div>
  );
}
