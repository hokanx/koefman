import { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, Receipt, Settings, LogOut, Inbox, FileStack, MoreHorizontal, Sun, Moon, RepeatIcon, ScrollText } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

const AppLayout = () => {
  const { t } = useLanguage();
  const { signOut, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  const { data: newLeadsCount = 0 } = useQuery({
    queryKey: ['new-leads-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('intake_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', user!.id)
        .eq('status', 'new');
      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const primaryNavItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: t.nav.dashboard },
    { to: '/customers', icon: Users, label: t.nav.customers },
    { to: '/offers', icon: FileText, label: t.nav.offers },
    { to: '/invoices', icon: Receipt, label: t.nav.invoices },
  ];

  const secondaryNavItems = [
    { to: '/leads', icon: Inbox, label: t.nav.leads, badge: newLeadsCount },
    { to: '/contracts', icon: ScrollText, label: (t as any).contracts?.title || 'Contracts', badge: 0 },
    { to: '/recurring-invoices', icon: RepeatIcon, label: (t as any).recurring?.title || 'Recurring', badge: 0 },
    { to: '/templates', icon: FileStack, label: t.nav.templates, badge: 0 },
    { to: '/settings', icon: Settings, label: t.nav.settings, badge: 0 },
  ];

  const allNavItems = [...primaryNavItems, ...secondaryNavItems];

  const isSecondaryActive = secondaryNavItems.some((item) => location.pathname.startsWith(item.to));

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top header */}
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-border bg-card px-4">
        <div className="flex items-center gap-2">
          <img src="/logo-koefman.jpeg" alt="KÖFMAN" className="h-8 w-auto" />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground"
            title={t.settings.appearance}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
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
            {allNavItems.map((item) => (
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
                {'badge' in item && (item as any).badge > 0 && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                    {(item as any).badge}
                  </span>
                )}
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

      {/* Mobile bottom nav — 5 items: 4 primary + Mehr */}
      <nav className="fixed inset-x-0 bottom-0 z-50 flex border-t border-border bg-card md:hidden">
        {primaryNavItems.map((item) => (
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
        <button
          onClick={() => setMoreOpen(true)}
          className={cn(
            'relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
            isSecondaryActive ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          <div className="relative">
            <MoreHorizontal className="h-5 w-5" />
            {newLeadsCount > 0 && (
              <span className="absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                {newLeadsCount}
              </span>
            )}
          </div>
          {t.nav.more}
        </button>
      </nav>

      {/* "Mehr" sheet */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-8">
          <SheetHeader>
            <SheetTitle>{t.nav.more}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 flex flex-col gap-1">
            {secondaryNavItems.map((item) => (
              <button
                key={item.to}
                onClick={() => {
                  setMoreOpen(false);
                  navigate(item.to);
                }}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors text-start',
                  location.pathname.startsWith(item.to)
                    ? 'bg-primary/10 text-primary'
                    : 'text-foreground hover:bg-accent'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
                {item.badge > 0 && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}

            {/* Theme toggle in Mehr */}
            <button
              onClick={toggleTheme}
              className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent text-start"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              {theme === 'dark' ? t.nav.lightMode : t.nav.darkMode}
            </button>

            <div className="my-2 border-t border-border" />

            <button
              onClick={() => {
                setMoreOpen(false);
                handleSignOut();
              }}
              className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 text-start"
            >
              <LogOut className="h-5 w-5" />
              {t.nav.logout}
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default AppLayout;
