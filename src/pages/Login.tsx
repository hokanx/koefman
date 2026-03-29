import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import BrandMark from '@/components/shared/BrandMark';


const Login = () => {
  const { t } = useLanguage();
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!email) { setError(t.auth.emailRequired); return; }
    if (!password) { setError(t.auth.passwordRequired); return; }

    setLoading(true);
    if (isSignup) {
      const { error } = await signUp(email, password);
      if (error) setError(error);
      else setMessage('Bitte bestätigen Sie Ihre E-Mail-Adresse, um fortzufahren.');
    } else {
      const { error } = await signIn(email, password);
      if (error) setError(t.auth.loginError);
      else navigate('/dashboard');
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <BrandMark variant="wordmark" size="lg" align="center" />
          <p className="mt-3 text-sm text-muted-foreground">{t.auth.subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">
            {isSignup ? t.auth.signup : t.auth.login}
          </h2>
          <p className="text-xs text-muted-foreground -mt-2">Willkommen bei KÖFMAN – Ihr digitales Büromanagement.</p>

          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}
          {message && (
            <div className="rounded-lg bg-success/10 p-3 text-sm text-success">{message}</div>
          )}

          <div>
            <label className="mb-1 block text-sm text-muted-foreground">{t.auth.email}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">{t.auth.password}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              autoComplete={isSignup ? 'new-password' : 'current-password'}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? t.common.loading : isSignup ? t.auth.signupButton : t.auth.loginButton}
          </button>

          <p className="text-center text-sm text-muted-foreground">
            {isSignup ? t.auth.hasAccount : t.auth.noAccount}{' '}
            <button
              type="button"
              onClick={() => { setIsSignup(!isSignup); setError(''); setMessage(''); }}
              className="font-medium text-primary hover:underline"
            >
              {isSignup ? t.auth.login : t.auth.signup}
            </button>
          </p>
        </form>

        <div className="rounded-xl border border-border bg-card p-5 text-center space-y-3">
          <p className="text-sm font-medium text-foreground">Neu bei KÖFMAN?</p>
          <p className="text-xs text-muted-foreground">Digitales Büromanagement mit persönlicher Betreuung – einfach, strukturiert und zeitsparend.</p>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => navigate('/landing')}
              className="w-full rounded-lg border border-border py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Mehr erfahren
            </button>
            <button
              type="button"
              onClick={() => navigate('/intake/public')}
              className="w-full rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Jetzt starten
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
