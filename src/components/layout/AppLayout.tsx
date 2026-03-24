import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, Receipt, Settings, LogOut, Inbox } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import LanguageSwitcher from './LanguageSwitcher';
import { cn } from '@/lib/utils';

const AppLayout = () => {
  const { t } = useLanguage();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: t.nav.dashboard },
    { to: '/customers', icon: Users, label: t.nav.customers },
    { to: '/offers', icon: FileText, label: t.nav.offers },
    { to: '/invoices', icon: Receipt, label: t.nav.invoices },
    { to: '/leads', icon: Inbox, label: t.nav.leads },
    { to: '/settings', icon: Settings, label: t.nav.settings },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top header */}
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-border bg-card px-4">
        <h1 className="text-lg font-bold tracking-tight text-primary">KÖFMAN</h1>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <button
            onClick={handleSignOut}
            className="hidden rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground md:flex"
            title={t.nav.logout}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden w-56 flex-col border-e border-border bg-card md:flex">
          <nav className="flex flex-1 flex-col gap-1 p-3">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="border-t border-border p-3">
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              {t.nav.logout}
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto pb-20 md:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-50 flex border-t border-border bg-card md:hidden">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default AppLayout;
