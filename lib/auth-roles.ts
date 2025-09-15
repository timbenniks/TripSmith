import { User } from '@supabase/supabase-js';

/**
 * User roles for the TripSmith application
 */
export type UserRole = 'admin' | 'user';

/**
 * User metadata interface for type safety
 */
export interface UserMetadata {
  role?: UserRole;
  full_name?: string;
  avatar_url?: string;
}

/**
 * Extended user type with proper metadata typing
 */
export interface TripSmithUser extends User {
  user_metadata: UserMetadata;
}

/**
 * Get user role from Supabase user metadata
 */
export function getUserRole(user: User | null): UserRole {
  if (!user) return 'user';

  const role = user.user_metadata?.role as UserRole;
  return role || 'user';
}

/**
 * Check if user has admin role
 */
export function isAdmin(user: User | null): boolean {
  return getUserRole(user) === 'admin';
}

/**
 * Check if user has specific role
 */
export function hasRole(user: User | null, role: UserRole): boolean {
  return getUserRole(user) === role;
}

// Note: Admin assignment should be handled via Supabase user_metadata (role: 'admin').

/**
 * Server-side utility to set user role in metadata
 * This would typically be called during user creation or admin management
 */
export function buildUserMetadata(email: string, existingMetadata?: Record<string, any>): UserMetadata {
  // Preserve existing role if present; otherwise default to 'user'.
  const role = (existingMetadata?.role as UserRole | undefined) ?? 'user';
  return { ...existingMetadata, role };
}

/**
 * Role-based permissions
 */
export const ROLE_PERMISSIONS = {
  admin: [
    'view_admin_dashboard',
    'manage_users',
    'view_analytics',
    'manage_system',
    'view_all_trips',
    'delete_any_trip',
  ],
  user: [
    'create_trips',
    'edit_own_trips',
    'share_trips',
    'export_trips',
  ],
} as const;

/**
 * Check if user has specific permission
 */
export function hasPermission(
  user: User | null,
  permission: string
): boolean {
  const role = getUserRole(user);
  const permissions = ROLE_PERMISSIONS[role] || [];
  return (permissions as readonly string[]).includes(permission);
}

/**
 * React hook for role-based access control
 */
export function useRoleAccess(user: User | null) {
  const role = getUserRole(user);

  return {
    role,
    isAdmin: role === 'admin',
    isUser: role === 'user',
    hasPermission: (permission: string) => hasPermission(user, permission),
    canViewAdminDashboard: hasPermission(user, 'view_admin_dashboard'),
    canManageUsers: hasPermission(user, 'manage_users'),
    canViewAnalytics: hasPermission(user, 'view_analytics'),
  };
}
