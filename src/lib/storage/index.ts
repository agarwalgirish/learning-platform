import type { StorageProvider } from './types'
import { LocalStorageProvider } from './local'

export type { StorageProvider } from './types'

let _storage: StorageProvider | null = null

export function getStorage(): StorageProvider {
  if (_storage) return _storage

  const provider = process.env.STORAGE_PROVIDER ?? 'local'
  switch (provider) {
    // S3 and Azure Blob implementations can be wired here
    case 'local':
    default:
      _storage = new LocalStorageProvider()
  }
  return _storage
}
