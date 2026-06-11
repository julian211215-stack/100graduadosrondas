
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Trophy } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <div className="mb-8 p-6 bg-card rounded-3xl border-4 border-primary shadow-2xl">
        <Trophy className="w-20 h-20 text-primary mx-auto mb-4" />
        <h1 className="text-4xl md:text-6xl font-headline font-bold text-primary mb-2">100 Graduados Dijeron</h1>
        <h2 className="text-2xl md:text-3xl font-headline font-medium text-foreground">Retos IDEHA</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-md">
        <Button asChild size="lg" className="rounded-2xl h-16 text-xl">
          <Link href="/jugar">Registrarse para Jugar</Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="rounded-2xl h-16 text-xl">
          <Link href="/pantalla">Ver Pantalla Pública</Link>
        </Button>
      </div>
      
      <div className="mt-12 opacity-50 text-sm">
        <Link href="/conductor" className="underline hover:text-primary transition-colors">Panel del Conductor</Link>
        <span className="mx-2">|</span>
        <Link href="/ajustes" className="underline hover:text-primary transition-colors">Ajustes</Link>
      </div>
    </div>
  );
}
