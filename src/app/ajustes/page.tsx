
"use client";

import { useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, setDoc, deleteDoc, addDoc, collection, writeBatch, getDocs, query } from 'firebase/firestore';
import { useAppSettings, useDynamics } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Edit2, Plus, RefreshCw, Database } from 'lucide-react';
import { Dynamic } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export default function SettingsPage() {
  const settings = useAppSettings();
  const dynamics = useDynamics();
  const { toast } = useToast();
  const [newDynamic, setNewDynamic] = useState<Partial<Dynamic>>({});
  const [isEditing, setIsEditing] = useState<string | null>(null);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    await setDoc(doc(db, 'settings', 'config'), settings);
    toast({ title: "Ajustes guardados" });
  };

  const handleSaveDynamic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDynamic.name || !newDynamic.instructions) {
      toast({ title: "Nombre e instrucciones son obligatorios", variant: "destructive" });
      return;
    }

    const data = {
      ...newDynamic,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (isEditing) {
      await setDoc(doc(db, 'dynamics', isEditing), data);
      setIsEditing(null);
    } else {
      await addDoc(collection(db, 'dynamics'), data);
    }
    
    setNewDynamic({});
    toast({ title: "Dinámica guardada" });
  };

  const handleDeleteDynamic = async (id: string) => {
    await deleteDoc(doc(db, 'dynamics', id));
    toast({ title: "Dinámica eliminada" });
  };

  const handleClearEvent = async () => {
    if (!confirm("¿Seguro que quieres reiniciar TODO el evento? Esto borrará registros, rondas y votos.")) return;
    
    const batch = writeBatch(db);
    const collectionsToClear = ['participants', 'rounds', 'matches', 'votes'];
    
    for (const col of collectionsToClear) {
      const q = query(collection(db, col));
      const snap = await getDocs(q);
      snap.forEach(d => batch.delete(d.ref));
    }

    batch.update(doc(db, 'settings', 'config'), {
      currentStatus: 'idle',
      registrationOpen: false,
      currentRoundId: null,
      currentMatchId: null,
      activeMatchId: null,
    });

    await batch.commit();
    toast({ title: "Evento reiniciado completamente" });
  };

  const handleLoadDemo = async () => {
    const batch = writeBatch(db);
    
    // Demo Dynamics
    const demoDynamics = [
      { name: "La actuación más víctima", instructions: "Debes actuar una situación cotidiana exagerando el victimismo al máximo." },
      { name: "Explica IDEHA en otro idioma", instructions: "Explica qué es IDEHA usando un idioma inventado o sonidos, pero que se entienda la esencia." },
      { name: "Enrolamiento imposible", instructions: "Convence a tu oponente de comprar algo absurdo (ej. aire embotellado)." },
      { name: "El peor pretexto", instructions: "Da la excusa más creativa e increíble para llegar tarde a tu propia boda." },
      { name: "Trainer por un minuto", instructions: "Da una charla motivacional intensa de 1 minuto sobre la importancia de saber amarrarse las agujetas." },
      { name: "Película IDEHA", instructions: "Resume un entrenamiento de IDEHA como si fuera una película de acción de Michael Bay." },
      { name: "Feedback absurdo", instructions: "Dale feedback a tu oponente sobre su forma de parpadear." },
      { name: "Comercial exagerado", instructions: "Vende a tu oponente como si fuera un producto milagro de televisión nocturna." },
      { name: "Compromiso vs supervivencia", instructions: "Debes elegir entre salvar a un perrito o cumplir tu palabra de llegar temprano, con argumentos dramáticos." },
      { name: "Traducción emocional", instructions: "Tu oponente dirá una frase neutra y tú debes traducirla al 'lenguaje de la furia' o 'lenguaje del amor extremo'." },
    ];

    demoDynamics.forEach(d => {
      const ref = doc(collection(db, 'dynamics'));
      batch.set(ref, { ...d, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    });

    // Demo Participants
    for (let i = 1; i <= 12; i++) {
      const ref = doc(collection(db, 'participants'));
      batch.set(ref, {
        name: `Persona Demo ${i}`,
        generationId: `G${100 + i}`,
        photoUrl: `https://picsum.photos/seed/${i}/200`,
        mode: i <= 8 ? 'participant' : 'voter',
        status: 'available',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    await batch.commit();
    toast({ title: "Datos demo cargados" });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-headline font-bold text-primary">Ajustes del Evento</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleLoadDemo}><Database className="w-4 h-4 mr-2" /> Cargar Demo</Button>
          <Button variant="destructive" onClick={handleClearEvent}><RefreshCw className="w-4 h-4 mr-2" /> Reiniciar</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuración General</CardTitle>
        </CardHeader>
        <CardContent>
          {settings && (
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre del Evento</Label>
                <Input 
                  value={settings.eventName} 
                  onChange={e => setDoc(doc(db, 'settings', 'config'), { ...settings, eventName: e.target.value })} 
                />
              </div>
              <div className="space-y-2">
                <Label>Cantidad de Finalistas (2 o 3)</Label>
                <Input 
                  type="number" 
                  min="2" 
                  max="3" 
                  value={settings.finalistsCount} 
                  onChange={e => setDoc(doc(db, 'settings', 'config'), { ...settings, finalistsCount: parseInt(e.target.value) })} 
                />
              </div>
              <Button type="submit" className="w-full">Guardar Configuración</Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? 'Editar Dinámica' : 'Nueva Dinámica'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveDynamic} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombre de la dinámica</Label>
              <Input 
                value={newDynamic.name || ''} 
                onChange={e => setNewDynamic({ ...newDynamic, name: e.target.value })} 
                placeholder="Ej. La actuación más víctima"
              />
            </div>
            <div className="space-y-2">
              <Label>Duración opcional (segundos)</Label>
              <Input 
                type="number"
                value={newDynamic.durationSeconds || ''} 
                onChange={e => setNewDynamic({ ...newDynamic, durationSeconds: parseInt(e.target.value) })} 
                placeholder="60"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Instrucciones</Label>
              <Input 
                value={newDynamic.instructions || ''} 
                onChange={e => setNewDynamic({ ...newDynamic, instructions: e.target.value })} 
                placeholder="Explica qué deben hacer los participantes..."
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Criterio sugerido opcional</Label>
              <Input 
                value={newDynamic.votingCriteria || ''} 
                onChange={e => setNewDynamic({ ...newDynamic, votingCriteria: e.target.value })} 
                placeholder="Ej. El que sea más dramático"
              />
            </div>
            <Button type="submit" className="md:col-span-2">
              {isEditing ? 'Actualizar' : 'Agregar'} Dinámica
            </Button>
            {isEditing && (
              <Button type="button" variant="ghost" className="md:col-span-2" onClick={() => { setIsEditing(null); setNewDynamic({}); }}>
                Cancelar Edición
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-xl font-headline font-semibold flex items-center gap-2">
          <Database className="w-5 h-5" /> Lista de Dinámicas ({dynamics.length})
        </h2>
        <div className="grid grid-cols-1 gap-4">
          {dynamics.map(d => (
            <Card key={d.id} className="overflow-hidden">
              <div className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="font-bold text-lg text-primary">{d.name}</h3>
                  <p className="text-sm opacity-80">{d.instructions}</p>
                  {d.durationSeconds && <span className="text-xs bg-muted px-2 py-0.5 rounded-full mr-2">{d.durationSeconds}s</span>}
                  {d.votingCriteria && <span className="text-xs italic opacity-60">Crit: {d.votingCriteria}</span>}
                </div>
                <div className="flex gap-2">
                  <Button size="icon" variant="ghost" onClick={() => { setIsEditing(d.id); setNewDynamic(d); }}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDeleteDynamic(d.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
