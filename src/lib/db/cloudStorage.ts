import { Redis } from '@upstash/redis';
import { StudentData, UserRecord } from './index';

export class CloudStorage {
  private static client: Redis | null = null;

  public static isConfigured(): boolean {
    const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
    const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
    return Boolean(url && token);
  }

  public static getClient(): Redis | null {
    if (!this.isConfigured()) return null;
    if (!this.client) {
      try {
        let url = process.env.UPSTASH_REDIS_REST_URL!.trim();
        let token = process.env.UPSTASH_REDIS_REST_TOKEN!.trim();

        // 自动清洗可能被误贴的双引号、单引号或前缀
        url = url.replace(/^UPSTASH_REDIS_REST_URL\s*=\s*/i, '').replace(/^["']|["']$/g, '').trim();
        token = token
          .replace(/^UPSTASH_REDIS_REST_TOKEN\s*=\s*/i, '')
          .replace(/^["']|["']$/g, '')
          .replace(/^Bearer\s+/i, '')
          .trim();

        this.client = new Redis({ url, token });
      } catch (err) {
        console.warn('[CloudStorage] Initialize Upstash client failed:', err);
        return null;
      }
    }
    return this.client;
  }

  public static async checkConnection(): Promise<{
    configured: boolean;
    connected: boolean;
    latencyMs?: number;
    error?: string;
  }> {
    if (!this.isConfigured()) {
      return { configured: false, connected: false };
    }

    const client = this.getClient();
    if (!client) {
      return { configured: true, connected: false, error: 'Client initialization failed' };
    }

    try {
      const t0 = Date.now();
      const pong = await client.ping();
      const latencyMs = Date.now() - t0;
      return {
        configured: true,
        connected: pong === 'PONG' || pong === 'pong' || !!pong,
        latencyMs,
      };
    } catch (err: any) {
      return { configured: true, connected: false, error: err?.message || 'Ping failed' };
    }
  }

  public static async getStudent(studentId: string): Promise<StudentData | null> {
    const client = this.getClient();
    if (!client) return null;
    try {
      const data = await client.get<StudentData>(`wq:student:${studentId}`);
      return data || null;
    } catch (err) {
      console.warn(`[CloudStorage] getStudent(${studentId}) failed:`, err);
      return null;
    }
  }

  public static async saveStudent(studentId: string, data: StudentData): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;
    try {
      await client.set(`wq:student:${studentId}`, data);
      return true;
    } catch (err) {
      console.warn(`[CloudStorage] saveStudent(${studentId}) failed:`, err);
      return false;
    }
  }

  public static async getUsers(): Promise<Record<string, UserRecord> | null> {
    const client = this.getClient();
    if (!client) return null;
    try {
      const users = await client.get<Record<string, UserRecord>>('wq:users');
      return users || null;
    } catch (err) {
      console.warn('[CloudStorage] getUsers failed:', err);
      return null;
    }
  }

  public static async saveUsers(users: Record<string, UserRecord>): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;
    try {
      await client.set('wq:users', users);
      return true;
    } catch (err) {
      console.warn('[CloudStorage] saveUsers failed:', err);
      return false;
    }
  }
}
