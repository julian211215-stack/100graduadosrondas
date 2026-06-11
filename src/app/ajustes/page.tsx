
"use client";

import { useState, useEffect } from 'react';
import { useAppSettings, useDynamics, localDB } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Edit2, Database, RefreshCw, Sparkles, AlertCircle } from 'lucide-react';
import { Dynamic } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export default function SettingsPage() {
  const settings = useAppSettings();
  const dynamics = useDynamics();
  const { toast } = useToast();
  
  // Local state for forms to avoid unnecessary Firestore writes on every keystroke
  const [localSettings, setLocalSettings] = useState({
    eventName: '',
    finalistsCount: 2
  });
  
  const [newDynamic, setNewDynamic] = useState<Partial<Dynamic>>({});
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Sync local state when Firestore settings load
  useEffect(() => {
    if (settings) {
      setLocalSettings({
        eventName: settings.eventName,
        finalistsCount: settings.finalistsCount
      });
    }
  }, [settings]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setIsSaving(true);
    try {
      await localDB.updateSettings({
        eventName: localSettings.eventName,
        finalistsCount: localSettings.finalistsCount
      });
      toast({ title: "Configuración guardada en la nube" });
    } catch (error: any) {
      toast({ 
        title: "Error al guardar configuración", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDynamic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDynamic.name || !newDynamic.instructions) {
      toast({ title: "Nombre e instrucciones son obligatorios", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const dynamicToSave: Dynamic = {
        id: isEditing || crypto.randomUUID(),
        name: newDynamic.name,
        instructions: newDynamic.instructions,
        durationSeconds: newDynamic.durationSeconds ?? null,
        votingCriteria: newDynamic.votingCriteria ?? "",
        active: true,
        createdAt: newDynamic.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await localDB.saveDynamic(dynamicToSave);
      setIsEditing(null);
      setNewDynamic({});
      toast({ title: isEditing ? "Dinámica actualizada" : "Dinámica guardada" });
    } catch (error: any) {
      console.error("Error al guardar dinámica:", error);
      toast({ 
        title: "Error al guardar dinámica", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadDemo = async () => {
    setIsSaving(true);
    const demos: Partial<Dynamic>[] = [
      { name: "La actuación más víctima", instructions: "El participante debe actuar como si hubiera perdido algo valiosísimo de forma exagerada.", durationSeconds: 60 },
      { name: "Canto sin aire", instructions: "Cantar un fragmento de una canción famosa aguantando la respiración lo más posible.", durationSeconds: 45 },
      { name: "Explicación en 30s", instructions: "Explicar un tema complejo (ej. física cuántica) como si fuera un niño de 5 años.", durationSeconds: 30 }
    ];

    try {
      for (const demo of demos) {
        await localDB.saveDynamic({
          id: crypto.randomUUID(),
          name: demo.name!,
          instructions: demo.instructions!,
          durationSeconds: demo.durationSeconds!,
          votingCriteria: "Creatividad y desempeño",
          active: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        } as Dynamic);
      }
      toast({ title: "Dinámicas demo cargadas en la nube" });
    } catch (error: any) {
      toast({ title: "Error al cargar demo", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDynamic = async (id: string) => {
    if (!confirm("¿Eliminar esta dinámica de la base de datos en la nube?")) return;
    try {
      await localDB.deleteDynamic(id);
      toast({ title: "Dinámica eliminada" });
    } catch (error: any) {
      toast({ title: "Error al eliminar dinámica", description: error.message, variant: "destructive" });
    }
  };

  const handleClearEvent = async () => {
    if (!confirm("¿Seguro que quieres reiniciar el estado del evento? Esto afectará a todos los dispositivos conectados en tiempo real.")) return;
    try {
      await localDB.resetAll();
      toast({ title: "Estado del evento reiniciado" });
    } catch (error: any) {
      toast({ title: "Error al reiniciar", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 pb-20">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary">Ajustes del Evento</h1>
          <p className="text-muted-foreground text-sm">Gestiona la configuración y las dinámicas en tiempo real en la nube.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="outline" onClick={handleLoadDemo} disabled={isSaving} className="flex-1">
            <Sparkles className="w-4 h-4 mr-2" /> Cargar Demo
          </Button>
          <Button variant="destructive" onClick={handleClearEvent} disabled={isSaving} className="flex-1">
            <RefreshCw className="w-4 h-4 mr-2" /> Reiniciar
          </Button>
        </div>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Configuración General</CardTitle>
        </CardHeader>
        <CardContent>
          {settings ? (
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre del Evento</Label>
                <Input 
                  value={localSettings.eventName} 
                  onChange={e => setLocalSettings({ ...localSettings, eventName: e.target.value })} 
                />
              </div>
              <div className="space-y-2">
                <Label>Cantidad de Finalistas (2 o 3)</Label>
                <Input 
                  type="number" 
                  min="2" 
                  max="3" 
                  value={localSettings.finalistsCount} 
                  onChange={e => setLocalSettings({ ...localSettings, finalistsCount: parseInt(e.target.value) || 2 })} 
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSaving}>
                {isSaving ? "Guardando..." : "Guardar Configuración"}
              </Button>
            </form>
          ) : (
            <div className="p-4 text-center opacity-50 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" /> Conectando con Firestore...
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-md">
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
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Duración (segundos, opcional)</Label>
              <Input 
                type="number"
                value={newDynamic.durationSeconds === null || newDynamic.durationSeconds === undefined ? "" : newDynamic.durationSeconds} 
                onChange={e => setNewDynamic({ ...newDynamic, durationSeconds: e.target.value ? parseInt(e.target.value) : null })} 
                placeholder="Sin tiempo límite"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Instrucciones del Reto</Label>
              <Input 
                value={newDynamic.instructions || ''} 
                onChange={e => setNewDynamic({ ...newDynamic, instructions: e.target.value })} 
                placeholder="¿Qué deben hacer los participantes?"
                required
              />
            </div>
            <Button type="submit" className="md:col-span-2 h-12 text-lg font-bold" disabled={isSaving}>
              {isSaving ? "Guardando..." : (isEditing ? 'Actualizar' : 'Agregar') + " Dinámica"}
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
          <Database className="w-5 h-5 text-primary" /> Lista de Dinámicas en la Nube ({dynamics.length})
        </h2>
        {dynamics.length === 0 ? (
          <div className="text-center p-12 bg-muted/20 rounded-xl border-2 border-dashed border-muted">
            <AlertCircle className="w-10 h-10 mx-auto opacity-20 mb-2" />
            <p className="opacity-50 italic">No hay dinámicas en la base de datos de la nube.</p>
            <Button variant="link" onClick={handleLoadDemo} className="mt-2">Cargar ejemplos ahora</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {dynamics.map(d => (
              <Card key={d.id} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="font-bold text-lg text-primary">{d.name}</h3>
                    <p className="text-sm opacity-80">{d.instructions}</p>
                    {d.durationSeconds && (
                      <span className="inline-block bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full uppercase mt-1">
                        {d.durationSeconds} seg
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="icon" variant="ghost" onClick={() => { setIsEditing(d.id); setNewDynamic(d); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeleteDynamic(d.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
