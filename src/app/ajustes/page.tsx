"use client";

import { useState } from 'react';
import { useAppSettings, useDynamics, localDB } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Edit2, Database, RefreshCw, AlertCircle } from 'lucide-react';
import { Dynamic } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export default function SettingsPage() {
  const settings = useAppSettings();
  const dynamics = useDynamics();
  const { toast } = useToast();
  const [newDynamic, setNewDynamic] = useState<Partial<Dynamic>>({});
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setIsSaving(true);
    try {
      await localDB.updateSettings(settings);
      toast({ title: "Ajustes guardados" });
    } catch (error: any) {
      toast({ 
        title: "Error al guardar ajustes", 
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
        durationSeconds: newDynamic.durationSeconds || null,
        votingCriteria: newDynamic.votingCriteria || "",
        active: true,
        createdAt: newDynamic.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await localDB.saveDynamic(dynamicToSave);
      setIsEditing(null);
      setNewDynamic({});
      toast({ title: "Dinámica guardada" });
    } catch (error: any) {
      toast({ 
        title: "Error al guardar dinámica", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDynamic = async (id: string) => {
    if (!confirm("¿Eliminar dinámica?")) return;
    try {
      await localDB.deleteDynamic(id);
      toast({ title: "Dinámica eliminada" });
    } catch (error: any) {
      toast({ title: "Error al eliminar", description: error.message, variant: "destructive" });
    }
  };

  const handleClearEvent = async () => {
    if (!confirm("¿Seguro que quieres reiniciar el evento?")) return;
    try {
      await localDB.resetAll();
      toast({ title: "Evento reiniciado" });
    } catch (error: any) {
      toast({ title: "Error al reiniciar", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-headline font-bold text-primary">Ajustes del Evento</h1>
        <div className="flex gap-2">
          <Button variant="destructive" onClick={handleClearEvent} disabled={isSaving}>
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
                  value={settings.eventName} 
                  onChange={e => localDB.updateSettings({ eventName: e.target.value })} 
                />
              </div>
              <div className="space-y-2">
                <Label>Cantidad de Finalistas (2 o 3)</Label>
                <Input 
                  type="number" 
                  min="2" 
                  max="3" 
                  value={settings.finalistsCount} 
                  onChange={e => localDB.updateSettings({ finalistsCount: parseInt(e.target.value) || 2 })} 
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSaving}>
                {isSaving ? "Guardando..." : "Guardar Configuración"}
              </Button>
            </form>
          ) : (
            <div className="p-4 text-center opacity-50">Cargando ajustes...</div>
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
              <Label>Duración (segundos)</Label>
              <Input 
                type="number"
                value={newDynamic.durationSeconds === null ? "" : newDynamic.durationSeconds} 
                onChange={e => setNewDynamic({ ...newDynamic, durationSeconds: parseInt(e.target.value) || null })} 
                placeholder="Sin tiempo"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Instrucciones</Label>
              <Input 
                value={newDynamic.instructions || ''} 
                onChange={e => setNewDynamic({ ...newDynamic, instructions: e.target.value })} 
                placeholder="Explica qué deben hacer los participantes..."
                required
              />
            </div>
            <Button type="submit" className="md:col-span-2" disabled={isSaving}>
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
          <Database className="w-5 h-5" /> Dinámicas Guardadas ({dynamics.length})
        </h2>
        {dynamics.length === 0 ? (
          <div className="text-center p-10 bg-muted/20 rounded-xl italic opacity-50">
            No hay dinámicas creadas.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {dynamics.map(d => (
              <Card key={d.id} className="overflow-hidden shadow-sm">
                <div className="p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="font-bold text-lg text-primary">{d.name}</h3>
                    <p className="text-sm opacity-80">{d.instructions}</p>
                    {d.durationSeconds && <p className="text-xs font-bold uppercase opacity-50">{d.durationSeconds} segundos</p>}
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
        )}
      </div>
    </div>
  );
}
