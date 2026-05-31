export type UserRole = 'ADMIN' | 'INSTRUCTOR' | 'LEARNER'

export interface AuthUser {
  id: string
  email: string
  name: string | null
  image: string | null
  role: UserRole
  organizationId: string
  organizationSlug: string
}
