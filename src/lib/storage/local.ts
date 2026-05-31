import fs from 'fs/promises'
import path from 'path'
import type { StorageProvider } from './types'

export class LocalStorageProvider implements StorageProvider {
  private uploadDir: string

  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads')
  }

  async upload(fileName: string, buffer: Buffer, _mimeType: string): Promise<string> {
    await fs.mkdir(this.uploadDir, { recursive: true })
    const filePath = path.join(this.uploadDir, fileName)
    await fs.writeFile(filePath, buffer)
    return filePath
  }

  async download(storagePath: string): Promise<Buffer> {
    return fs.readFile(storagePath)
  }

  async delete(storagePath: string): Promise<void> {
    try {
      await fs.unlink(storagePath)
    } catch {
      // File may already be gone
    }
  }

  getUrl(storagePath: string): string {
    return `/api/files/${path.basename(storagePath)}`
  }
}
