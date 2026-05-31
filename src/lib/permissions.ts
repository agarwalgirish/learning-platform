import type { UserRole } from '@/types'

type Permission =
  | 'content:read'
  | 'content:write'
  | 'content:delete'
  | 'users:read'
  | 'users:write'
  | 'users:delete'
  | 'analytics:read'
  | 'settings:write'
  | 'learn:access'
  | 'audit:read'

const rolePermissions: Record<UserRole, Permission[]> = {
  ADMIN: [
    'content:read',
    'content:write',
    'content:delete',
    'users:read',
    'users:write',
    'users:delete',
    'analytics:read',
    'settings:write',
    'learn:access',
    'audit:read',
  ],
  INSTRUCTOR: [
    'content:read',
    'content:write',
    'users:read',
    'analytics:read',
    'learn:access',
  ],
  LEARNER: ['content:read', 'learn:access'],
}

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false
}

export function requireRole(userRole: UserRole, requiredRole: UserRole): boolean {
  const hierarchy: UserRole[] = ['LEARNER', 'INSTRUCTOR', 'ADMIN']
  return hierarchy.indexOf(userRole) >= hierarchy.indexOf(requiredRole)
}

export function isAdmin(role: UserRole): boolean {
  return role === 'ADMIN'
}

export function isInstructorOrAdmin(role: UserRole): boolean {
  return role === 'ADMIN' || role === 'INSTRUCTOR'
}
