import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  randomUUID,
} from 'node:crypto';
import type { PoolClient } from 'pg';
export interface CredentialBinding {
  projectId: string;
  slot: string;
  version: number;
}
export interface EncryptedCredential {
  ciphertext: Buffer;
  nonce: Buffer;
  authTag: Buffer;
}
function validateKey(key: Buffer) {
  if (key.length !== 32) throw new Error('INVALID KEY');
}
function binding(data: CredentialBinding) {
  return Buffer.from(JSON.stringify([data.projectId, data.slot, data.version]));
}
export function encryptCredential(
  value: string,
  key: Buffer,
  data: CredentialBinding,
): EncryptedCredential {
  validateKey(key);
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, nonce);
  cipher.setAAD(binding(data));
  return {
    ciphertext: Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]),
    nonce,
    authTag: cipher.getAuthTag(),
  };
}
export function decryptCredential(
  record: EncryptedCredential,
  key: Buffer,
  data: CredentialBinding,
): string {
  validateKey(key);
  try {
    if (record.nonce.length !== 12 || record.authTag.length !== 16)
      throw new Error('Invalid record');
    const cipher = createDecipheriv('aes-256-gcm', key, record.nonce);
    cipher.setAAD(binding(data));
    cipher.setAuthTag(record.authTag);
    return Buffer.concat([
      cipher.update(record.ciphertext),
      cipher.final(),
    ]).toString('utf8');
  } catch {
    throw new Error('CREDENTIAL UNAVAILABLE');
  }
}
export class CredentialStore {
  constructor(
    readonly client: PoolClient,
    readonly key: Buffer,
  ) {
    validateKey(key);
  }
  async replace(projectId: string, slot: string, value: string) {
    await this.client.query('BEGIN');
    try {
      const project = await this.client.query(
        'SELECT id FROM projects WHERE id=$1 FOR UPDATE',
        [projectId],
      );
      if (!project.rowCount) throw new Error('Missing project');
      const previous = await this.client.query<{ version: number }>(
        'SELECT COALESCE(max(version),0)::int AS version FROM credentials WHERE project_id=$1 AND slot_name=$2',
        [projectId, slot],
      );
      const version = (previous.rows[0]?.version ?? 0) + 1;
      const encrypted = encryptCredential(value, this.key, {
        projectId,
        slot,
        version,
      });
      await this.client.query(
        'INSERT INTO credentials(id,project_id,slot_name,version,ciphertext,nonce,auth_tag,key_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
        [
          randomUUID(),
          projectId,
          slot,
          version,
          encrypted.ciphertext,
          encrypted.nonce,
          encrypted.authTag,
          'environment',
        ],
      );
      await this.client.query('COMMIT');
      return { slot, version };
    } catch {
      await this.client.query('ROLLBACK');
      throw new Error('CREDENTIAL STORAGE ERROR');
    }
  }
  async resolve(data: CredentialBinding) {
    const result = await this.client.query<{
      ciphertext: Buffer;
      nonce: Buffer;
      auth_tag: Buffer;
    }>(
      'SELECT ciphertext,nonce,auth_tag FROM credentials WHERE project_id=$1 AND slot_name=$2 AND version=$3',
      [data.projectId, data.slot, data.version],
    );
    const row = result.rows[0];
    if (!row) throw new Error('CREDENTIAL UNAVAILABLE');
    return decryptCredential(
      { ciphertext: row.ciphertext, nonce: row.nonce, authTag: row.auth_tag },
      this.key,
      data,
    );
  }
}
