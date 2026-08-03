import { useState } from 'react';
import { Bell, X, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDateDE } from '@/lib/utils';
import type { Tables } from '@/integrations/supabase/types';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

type NotificationRow = Tables<'notifications'>;

const NotificationBell = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const unreadCount = notifications.filter((n: NotificationRow) => !n.read).length;

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('notifications').update({ read: true }).eq('id', id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const unreadIds = notifications.filter((n: NotificationRow) => !n.read).map((n: NotificationRow) => n.id);
      if (unreadIds.length > 0) {
        await supabase.from('notifications').update({ read: true }).in('id', unreadIds);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
            {unreadCount}
          </span>
        )}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-sm">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle>Benachrichtigungen</SheetTitle>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllRead.mutate()}
                  className="text-xs text-primary hover:underline"
                >
                  Alle gelesen
                </button>
              )}
            </div>
          </SheetHeader>

          <div className="mt-4 space-y-2 overflow-y-auto max-h-[calc(100vh-8rem)]">
            {notifications.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Keine Benachrichtigungen</p>
            ) : (
              notifications.map((n: NotificationRow) => (
                <div
                  key={n.id}
                  className={`rounded-lg border p-3 text-sm transition ${
                    n.read ? 'border-border bg-card' : 'border-primary/20 bg-primary/5'
                  }`}
                >
                  <p className="text-foreground">{n.message}</p>
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">{formatDateDE(n.created_at)}</span>
                    {!n.read && (
                      <button
                        onClick={() => markReadMutation.mutate(n.id)}
                        className="flex items-center gap-1 text-[10px] text-primary hover:underline"
                      >
                        <Check className="h-3 w-3" /> Gelesen
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default NotificationBell;
