import { Clock, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const PendingActivation = () => {
  const { signOut } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-warning/10">
          <Clock className="h-10 w-10 text-warning" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Registrierung erfolgreich</h1>
          <p className="text-muted-foreground">
            Ihr Konto wartet auf Freischaltung.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 text-left space-y-3">
          <p className="text-sm text-muted-foreground">
            Vielen Dank für Ihre Registrierung. Ihr Konto wird in Kürze von einem Administrator freigeschaltet.
          </p>
          <p className="text-sm text-muted-foreground">
            Sie erhalten Zugriff, sobald Ihr Konto aktiviert wurde. Bei Fragen wenden Sie sich bitte an den Support.
          </p>
        </div>

        <button
          onClick={signOut}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Abmelden
        </button>
      </div>
    </div>
  );
};

export default PendingActivation;
