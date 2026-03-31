import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, UserPlus, Trash2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Inhaber',
  manager: 'Manager',
  staff: 'Mitarbeiter',
};

const AdminOrganizationDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState('staff');
  const [removeMemberId, setRemoveMemberId] = useState<string | null>(null);

  const { data: org, isLoading } = useQuery({
    queryKey: ['admin-organization', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: members } = useQuery({
    queryKey: ['admin-org-members', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_memberships')
        .select('*')
        .eq('organization_id', id!)
        .order('created_at');
      if (error) throw error;

      // Fetch emails from profiles
      const userIds = data.map((m) => m.user_id);
      if (userIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', userIds);

      const emailMap: Record<string, string> = {};
      profiles?.forEach((p) => { if (p.email) emailMap[p.id] = p.email; });

      return data.map((m) => ({ ...m, email: emailMap[m.user_id] || '–' }));
    },
    enabled: !!id,
  });

  const addMemberMutation = useMutation({
    mutationFn: async () => {
      // Find user by email in profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', memberEmail.trim().toLowerCase())
        .maybeSingle();
      if (profileError) throw profileError;
      if (!profile) throw new Error('Benutzer nicht gefunden');

      const { error } = await supabase.from('organization_memberships').insert({
        organization_id: id!,
        user_id: profile.id,
        role: memberRole,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-org-members', id] });
      setAddMemberOpen(false);
      setMemberEmail('');
      setMemberRole('staff');
      toast.success('Mitglied hinzugefügt');
    },
    onError: (err: Error) => toast.error(err.message || 'Fehler'),
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (membershipId: string) => {
      const { error } = await supabase
        .from('organization_memberships')
        .delete()
        .eq('id', membershipId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-org-members', id] });
      setRemoveMemberId(null);
      toast.success('Mitglied entfernt');
    },
  });

  const toggleStatus = useMutation({
    mutationFn: async () => {
      const newStatus = org?.status === 'active' ? 'inactive' : 'active';
      const { error } = await supabase
        .from('organizations')
        .update({ status: newStatus })
        .eq('id', id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-organization', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-organizations'] });
      toast.success('Status aktualisiert');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!org) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Organisation nicht gefunden.</p>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/admin/organizations')} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-foreground">{org.name}</h2>
            {org.is_internal && (
              <Badge variant="outline" className="text-xs">
                <ShieldCheck className="mr-1 h-3 w-3" />
                Intern
              </Badge>
            )}
          </div>
          {org.slug && <p className="text-xs text-muted-foreground">/{org.slug}</p>}
        </div>
        <Button
          variant={org.status === 'active' ? 'outline' : 'default'}
          size="sm"
          onClick={() => toggleStatus.mutate()}
        >
          {org.status === 'active' ? 'Deaktivieren' : 'Aktivieren'}
        </Button>
      </div>

      {/* Details */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-2">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Status:</span>{' '}
            <Badge variant={org.status === 'active' ? 'default' : 'secondary'}>
              {org.status === 'active' ? 'Aktiv' : 'Inaktiv'}
            </Badge>
          </div>
          <div>
            <span className="text-muted-foreground">Typ:</span>{' '}
            {org.is_internal ? 'Intern (Test)' : 'Kunde'}
          </div>
        </div>
        {org.notes && (
          <p className="text-sm text-muted-foreground">{org.notes}</p>
        )}
      </div>

      {/* Members */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Mitglieder</h3>
          <Button size="sm" variant="outline" onClick={() => setAddMemberOpen(true)}>
            <UserPlus className="mr-1.5 h-4 w-4" />
            Hinzufügen
          </Button>
        </div>

        {members?.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Keine Mitglieder zugewiesen.
          </p>
        )}

        {members?.map((m) => (
          <div key={m.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">{m.email}</p>
              <p className="text-xs text-muted-foreground">{ROLE_LABELS[m.role] || m.role}</p>
            </div>
            <button
              onClick={() => setRemoveMemberId(m.id)}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Add member dialog */}
      <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mitglied hinzufügen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="mb-1 block text-sm font-medium">E-Mail</label>
              <Input
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                placeholder="user@example.com"
                type="email"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Rolle</label>
              <Select value={memberRole} onValueChange={setMemberRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Inhaber</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="staff">Mitarbeiter</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMemberOpen(false)}>Abbrechen</Button>
            <Button
              onClick={() => addMemberMutation.mutate()}
              disabled={!memberEmail.trim() || addMemberMutation.isPending}
            >
              Hinzufügen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove confirmation */}
      <AlertDialog open={!!removeMemberId} onOpenChange={() => setRemoveMemberId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mitglied entfernen?</AlertDialogTitle>
            <AlertDialogDescription>
              Das Mitglied verliert den Zugang zu dieser Organisation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removeMemberId && removeMemberMutation.mutate(removeMemberId)}
            >
              Entfernen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminOrganizationDetail;
