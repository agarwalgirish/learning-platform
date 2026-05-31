export interface StorageProvider {
  upload(fileName: string, buffer: Buffer, mimeType: string): Promise<string>
  download(storagePath: string): Promise<Buffer>
  delete(storagePath: string): Promise<void>
  getUrl(storagePath: string): string
}
