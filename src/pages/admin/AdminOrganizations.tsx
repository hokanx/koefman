import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, ShieldCheck, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const AdminOrganizations = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [isInternal, setIsInternal] = useState(false);

  const { data: orgs, isLoading } = useQuery({
    queryKey: ['admin-organizations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: memberCounts } = useQuery({
    queryKey: ['admin-org-member-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_memberships')
        .select('organization_id');
      if (error) throw error;
      const counts: Record<string, number> = {};
      data?.forEach((m) => {
        counts[m.organization_id] = (counts[m.organization_id] || 0) + 1;
      });
      return counts;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const slug = newName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const { error } = await supabase.from('organizations').insert({
        name: newName,
        slug,
        is_internal: isInternal,
        created_by_admin_id: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-organizations'] });
      setCreateOpen(false);
      setNewName('');
      setIsInternal(false);
      toast.success('Organisation erstellt');
    },
    onError: () => toast.error('Fehler beim Erstellen'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Organisationen</h2>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Neue Organisation
        </Button>
      </div>

      <div className="space-y-3">
        {orgs?.map((org) => (
          <button
            key={org.id}
            onClick={() => navigate(`/admin/organizations/${org.id}`)}
            className="w-full rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-accent/50"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-foreground">{org.name}</span>
                  {org.is_internal && (
                    <Badge variant="outline" className="text-xs">
                      <ShieldCheck className="mr-1 h-3 w-3" />
                      Intern
                    </Badge>
                  )}
                </div>
                {org.slug && (
                  <p className="text-xs text-muted-foreground">/{org.slug}</p>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{memberCounts?.[org.id] || 0} Mitglieder</span>
                <Badge variant={org.status === 'active' ? 'default' : 'secondary'}>
                  {org.status === 'active' ? 'Aktiv' : 'Inaktiv'}
                </Badge>
                <ExternalLink className="h-3.5 w-3.5" />
              </div>
            </div>
          </button>
        ))}

        {orgs?.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Keine Organisationen vorhanden.
          </p>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neue Organisation erstellen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Name</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="z.B. Mustermann GmbH"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isInternal}
                onChange={(e) => setIsInternal(e.target.checked)}
                className="rounded border-border"
              />
              Interne Test-Organisation
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!newName.trim() || createMutation.isPending}
            >
              Erstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminOrganizations;
