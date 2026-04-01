import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';

interface Organization {
  id: string;
  name: string;
  slug: string | null;
  status: string;
  is_internal: boolean;
  tax_mode: string;
  created_at: string;
}

interface Membership {
  id: string;
  organization_id: string;
  role: string;
  organizations: Organization;
}

interface WorkspaceContextType {
  /** All organizations the current user belongs to */
  memberships: Membership[];
  /** The currently active organization (auto-selected or manually chosen) */
  activeOrganization: Organization | null;
  /** The active organization's ID (shortcut) */
  activeOrganizationId: string | null;
  /** The user's role within the active organization */
  workspaceRole: string | null;
  /** Whether an admin has manually entered a workspace context */
  isAdminWorkspaceMode: boolean;
  /** Set the active organization by ID */
  setActiveOrganizationId: (id: string | null) => void;
  /** Admin enters a workspace context (different from impersonation) */
  enterWorkspace: (org: Organization) => void;
  /** Admin leaves workspace context */
  exitWorkspace: () => void;
  /** Loading state */
  isLoading: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const queryClient = useQueryClient();
  const [manualOrgId, setManualOrgId] = useState<string | null>(null);
  const [adminWorkspaceOrg, setAdminWorkspaceOrg] = useState<Organization | null>(null);
  const [autoProvisioning, setAutoProvisioning] = useState(false);

  // Fetch all memberships for the current user
  const { data: memberships = [], isLoading } = useQuery({
    queryKey: ['user-memberships', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_memberships')
        .select('id, organization_id, role, organizations(*)')
        .eq('user_id', user!.id);
      if (error) throw error;
      return (data ?? []) as unknown as Membership[];
    },
    enabled: !!user,
  });

  // Auto-provision: if user has no membership but has business_settings, create org + membership
  useEffect(() => {
    if (!user || isLoading || memberships.length > 0 || autoProvisioning || isAdmin) return;
    const provision = async () => {
      setAutoProvisioning(true);
      try {
        const { data: settings } = await supabase
          .from('business_settings')
          .select('business_name, small_business_regulation')
          .eq('user_id', user.id)
          .maybeSingle();
        if (!settings) return;

        const name = settings.business_name || 'Mein Geschäft';
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const taxMode = settings.small_business_regulation ? 'kleinunternehmer' : 'standard';

        const { data: newOrg, error: orgErr } = await supabase
          .from('organizations')
          .insert({ name, slug, owner_user_id: user.id, tax_mode: taxMode })
          .select('id')
          .single();
        if (orgErr) throw orgErr;

        await supabase
          .from('organization_memberships')
          .insert({ organization_id: newOrg.id, user_id: user.id, role: 'owner' });

        queryClient.invalidateQueries({ queryKey: ['user-memberships', user.id] });
      } catch (e) {
        console.error('Auto-provision failed:', e);
      } finally {
        setAutoProvisioning(false);
      }
    };
    provision();
  }, [user, isLoading, memberships.length, autoProvisioning, isAdmin, queryClient]);

  // Determine the active organization
  const resolved = useMemo(() => {
    // Admin workspace mode takes priority
    if (isAdmin && adminWorkspaceOrg) {
      return {
        org: adminWorkspaceOrg,
        role: 'admin' as string,
        isAdminMode: true,
      };
    }

    // Manual selection
    if (manualOrgId) {
      const m = memberships.find((m) => m.organization_id === manualOrgId);
      if (m) return { org: m.organizations, role: m.role, isAdminMode: false };
    }

    // Auto-select first membership (single-business model)
    if (memberships.length >= 1) {
      return {
        org: memberships[0].organizations,
        role: memberships[0].role,
        isAdminMode: false,
      };
    }

    return { org: null, role: null, isAdminMode: false };
  }, [memberships, manualOrgId, adminWorkspaceOrg, isAdmin]);

  // Clear admin workspace when user changes
  useEffect(() => {
    setAdminWorkspaceOrg(null);
    setManualOrgId(null);
  }, [user?.id]);

  const enterWorkspace = (org: Organization) => {
    setAdminWorkspaceOrg(org);
  };

  const exitWorkspace = () => {
    setAdminWorkspaceOrg(null);
  };

  return (
    <WorkspaceContext.Provider
      value={{
        memberships,
        activeOrganization: resolved.org,
        activeOrganizationId: resolved.org?.id ?? null,
        workspaceRole: resolved.role,
        isAdminWorkspaceMode: resolved.isAdminMode,
        setActiveOrganizationId: setManualOrgId,
        enterWorkspace,
        exitWorkspace,
        isLoading,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return context;
};
