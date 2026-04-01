import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  const [manualOrgId, setManualOrgId] = useState<string | null>(null);
  const [adminWorkspaceOrg, setAdminWorkspaceOrg] = useState<Organization | null>(null);

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
