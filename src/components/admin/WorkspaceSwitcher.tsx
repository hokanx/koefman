import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Building2, X, ChevronDown } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const WorkspaceSwitcher = () => {
  const { activeOrganization, isAdminWorkspaceMode, enterWorkspace, exitWorkspace } = useWorkspace();
  const [open, setOpen] = useState(false);

  const { data: organizations = [] } = useQuery({
    queryKey: ['all-organizations-switcher'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('status', 'active')
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
  });

  if (isAdminWorkspaceMode && activeOrganization) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-sm">
        <Building2 className="h-3.5 w-3.5 text-primary" />
        <span className="font-medium text-primary">{activeOrganization.name}</span>
        <button
          onClick={exitWorkspace}
          className="ml-1 rounded p-0.5 text-primary/60 hover:text-primary"
          title="Geschäft verlassen"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5 rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground" title="Geschäft wählen">
          <Building2 className="h-4 w-4" />
          <ChevronDown className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-2">
        <p className="px-2 pb-2 text-xs font-medium text-muted-foreground">Workspace betreten</p>
        <div className="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
          {organizations.map((org) => (
            <button
              key={org.id}
              onClick={() => {
                enterWorkspace(org);
                setOpen(false);
              }}
              className={cn(
                'flex items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-accent',
                org.is_internal && 'text-muted-foreground'
              )}
            >
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{org.name}</span>
              {org.is_internal && (
                <span className="ml-auto shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium">intern</span>
              )}
            </button>
          ))}
          {organizations.length === 0 && (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground">Keine Organisationen</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default WorkspaceSwitcher;
