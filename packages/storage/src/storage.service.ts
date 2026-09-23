import { createHmac, timingSafeEqual } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { copyFile, mkdir, rm, stat } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';

export interface LocalStorageConfig {
  /** Absolute directory files are read from/written to. Must be the same path on every process that shares this storage. */
  rootDir: string;
  /** Base URL of the API's `/files/raw` endpoint - only needed to generate signed download URLs. */
  publicBaseUrl?: string;
  /** HMAC secret for signing download URLs - only needed to generate or verify them. */
  signingSecret?: string;
}

export class StorageService {
  constructor(private readonly config: LocalStorageConfig) {}

  private resolvePath(key: string): string {
    const root = path.resolve(this.config.rootDir);
    const resolved = path.resolve(root, key);
    if (resolved !== root && !resolved.startsWith(root + path.sep)) {
      throw new Error(`Invalid storage key: ${key}`);
    }
    return resolved;
  }

  /** Copies a local file into storage and returns its size in bytes. */
  async uploadFile(key: string, filePath: string, _contentType: string): Promise<number> {
    const dest = this.resolvePath(key);
    await mkdir(path.dirname(dest), { recursive: true });
    await copyFile(filePath, dest);
    return (await stat(dest)).size;
  }

  /** Copies a stored object to a local file - used to re-fetch previously uploaded media, e.g. to bundle it into a ZIP. */
  async downloadFile(key: string, destPath: string): Promise<void> {
    await pipeline(createReadStream(this.resolvePath(key)), createWriteStream(destPath));
  }

  /** Files never expire, so the signed URL doesn't either - the signature alone gates access. */
  getSignedDownloadUrl(key: string): Promise<string> {
    if (!this.config.publicBaseUrl || !this.config.signingSecret) {
      throw new Error(
        'Local storage is not configured with a publicBaseUrl/signingSecret to sign URLs',
      );
    }
    const signature = this.sign(key, this.config.signingSecret);
    const url = new URL(this.config.publicBaseUrl);
    url.searchParams.set('key', key);
    url.searchParams.set('signature', signature);
    return Promise.resolve(url.toString());
  }

  /** Verifies a `/files/raw` request's query params against the HMAC this service would have signed. */
  verifySignedRequest(key: string, signature: string): boolean {
    if (!this.config.signingSecret) return false;
    const expected = Buffer.from(this.sign(key, this.config.signingSecret));
    const actual = Buffer.from(signature);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }

  /** Resolves a storage key to its absolute path on disk - for streaming a verified download. */
  resolveFilePath(key: string): string {
    return this.resolvePath(key);
  }

  private sign(key: string, secret: string): string {
    return createHmac('sha256', secret).update(key).digest('hex');
  }

  async deleteObject(key: string): Promise<void> {
    await rm(this.resolvePath(key), { force: true });
  }

  async deleteObjects(keys: string[]): Promise<void> {
    await Promise.all(keys.map((key) => this.deleteObject(key)));
  }
}
