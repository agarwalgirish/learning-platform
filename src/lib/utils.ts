import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

export function formatDate(date: Date | string | null): string {
  if (!date) return 'N/A'
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

export function getProficiencyColor(level: string): string {
  const colors: Record<string, string> = {
    BEGINNER: 'text-blue-700 bg-blue-100',
    INTERMEDIATE: 'text-yellow-700 bg-yellow-100',
    ADVANCED: 'text-orange-700 bg-orange-100',
    PROFICIENT: 'text-green-700 bg-green-100',
  }
  return colors[level] ?? 'text-gray-700 bg-gray-100'
}

export function getDifficultyColor(level: string): string {
  const colors: Record<string, string> = {
    BEGINNER: 'text-green-700 bg-green-100',
    INTERMEDIATE: 'text-yellow-700 bg-yellow-100',
    ADVANCED: 'text-orange-700 bg-orange-100',
    EXPERT: 'text-red-700 bg-red-100',
  }
  return colors[level] ?? 'text-gray-700 bg-gray-100'
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
