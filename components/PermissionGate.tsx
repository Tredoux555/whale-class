// =====================================================
// WHALE PLATFORM - PERMISSION GATE COMPONENT
// =====================================================
// Location: components/PermissionGate.tsx
// Purpose: Conditionally render content based on permissions
// =====================================================

'use client';

import { useEffect, useState } from 'react';
import type { FeatureKey, PermissionLevel } from '@/lib/permissions/roles';

interface PermissionGateProps {
  featureKey: FeatureKey;
  permissionLevel?: PermissionLevel;
  fallback?: React.ReactNode;
  loadingFallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * PermissionGate Component
 * 
 * Wraps content that should only be visible to users with specific permissions.
 * Checks permission on mount and re-checks if dependencies change.
 * 
 * Usage:
 * <PermissionGate featureKey="curriculum_viewer" permissionLevel="view">
 *   <CurriculumViewer />
 * </PermissionGate>
 */
export function PermissionGate({
  featureKey,
  permissionLevel = 'view',
  fallback = null,
  loadingFallback = <div className="animate-pulse">Checking permissions...</div>,
  children,
}: PermissionGateProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkPermission() {
      setIsLoading(true);
      
      try {
        const response = await fetch('/api/permissions/check', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            featureKey,
            permissionLevel,
          }),
        });

        if (!response.ok) {
          setHasPermission(false);
          return;
        }

        const data = await response.json();
        setHasPermission(data.hasAccess);
      } catch (error) {
        console.error('Permission check failed:', error);
        setHasPermission(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkPermission();
  }, [featureKey, permissionLevel]);

  if (isLoading) {
    return <>{loadingFallback}</>;
  }

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Hook to check permission in component logic
 */
export function usePermission(featureKey: FeatureKey, permissionLevel: PermissionLevel = 'view') {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkPermission() {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch('/api/permissions/check', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            featureKey,
            permissionLevel,
          }),
        });

        if (!response.ok) {
          throw new Error('Permission check failed');
        }

        const data = await response.json();
        setHasPermission(data.hasAccess);
      } catch (err) {
        console.error('Permission check failed:', err);
        setError(err instanceof Error ? err.message : 'Permission check failed');
        setHasPermission(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkPermission();
  }, [featureKey, permissionLevel]);

  return { hasPermission, isLoading, error };
}

/**
 * Hook to get all user permissions
 */
export function useUserPermissions() {
  const [permissions, setPermissions] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPermissions() {
      setIsLoading(true);
      setError(null);
      
      try {
        // Get the current session from Supabase client
        const supabase = createSupabaseClient();
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
          throw new Error('Not authenticated');
        }

        // Pass the access token in the Authorization header
        const response = await fetch('/api/permissions/get-user-permissions', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to fetch permissions');
        }

        const data = await response.json();
        setPermissions(data);
      } catch (err) {
        console.error('Failed to fetch permissions:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch permissions');
      } finally {
        setIsLoading(false);
      }
    }

    fetchPermissions();
  }, []);

  return { permissions, isLoading, error };
}

/**
 * Simple permission badge component
 */
interface PermissionBadgeProps {
  featureKey: FeatureKey;
  permissionLevel?: PermissionLevel;
  className?: string;
}

export function PermissionBadge({
  featureKey,
  permissionLevel = 'view',
  className = '',
}: PermissionBadgeProps) {
  const { hasPermission, isLoading } = usePermission(featureKey, permissionLevel);

  if (isLoading) {
    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs rounded ${className}`}>
        <span className="animate-pulse">...</span>
      </span>
    );
  }

  if (hasPermission) {
    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs rounded bg-green-100 text-green-800 ${className}`}>
        ✓ Allowed
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center px-2 py-1 text-xs rounded bg-red-100 text-red-800 ${className}`}>
      ✗ Denied
    </span>
  );
}

/**
 * Feature access list component
 */
interface FeatureAccessListProps {
  className?: string;
}

export function FeatureAccessList({ className = '' }: FeatureAccessListProps) {
  const { permissions, isLoading, error } = useUserPermissions();

  if (isLoading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-4 bg-gray-200 rounded mb-2"></div>
        <div className="h-4 bg-gray-200 rounded mb-2"></div>
        <div className="h-4 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-red-600 ${className}`}>
        Error loading permissions: {error}
      </div>
    );
  }

  if (!permissions || permissions.features.length === 0) {
    return (
      <div className={`text-gray-500 ${className}`}>
        No features available
      </div>
    );
  }

  return (
    <div className={className}>
      <ul className="space-y-2">
        {permissions.features.map((feature: any) => (
          <li key={feature.feature_key} className="flex items-center justify-between">
            <span className="font-medium">{feature.feature_name}</span>
            <div className="flex gap-1">
              {feature.permissions.view && (
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">View</span>
              )}
              {feature.permissions.edit && (
                <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">Edit</span>
              )}
              {feature.permissions.create && (
                <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded">Create</span>
              )}
              {feature.permissions.delete && (
                <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded">Delete</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

