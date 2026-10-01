import { randomUUID } from 'node:crypto';
export class Accounts {
  readonly accounts = new Map<string, { email: string; password: string }>();
  readonly tokens = new Map<string, string>();
  constructor(readonly repaired: boolean) {}
  private invalidateTokens(accountId: string) {
    for (const [token, id] of this.tokens)
      if (id === accountId) this.tokens.delete(token);
  }
  reset() {
    this.accounts.clear();
    this.tokens.clear();
  }
  execute(
    method: string,
    path: string,
    body: Record<string, unknown>,
  ): { status: number; body: unknown } {
    if (method === 'POST' && path === '/api/accounts') {
      if (typeof body.email !== 'string' || typeof body.password !== 'string')
        return { status: 400, body: { error: 'Invalid input' } };
      const id = randomUUID();
      this.accounts.set(id, { email: body.email, password: body.password });
      return { status: 201, body: { id } };
    }
    const reset = /^\/api\/accounts\/([^/]+)\/password-reset$/.exec(path);
    if (reset && method === 'POST') {
      if (!this.accounts.has(reset[1]!))
        return { status: 404, body: { error: 'Not found' } };
      const token = randomUUID();
      this.tokens.set(token, reset[1]!);
      return { status: 200, body: { token } };
    }
    const email = /^\/api\/accounts\/([^/]+)\/email$/.exec(path);
    if (email && method === 'PATCH') {
      const account = this.accounts.get(email[1]!);
      if (!account) return { status: 404, body: { error: 'Not found' } };
      if (typeof body.email !== 'string')
        return { status: 400, body: { error: 'Invalid input' } };
      account.email = body.email;
      if (this.repaired) this.invalidateTokens(email[1]!);
      return { status: 200, body: { id: email[1], email: body.email } };
    }
    if (path === '/api/password-reset' && method === 'POST') {
      const id =
        typeof body.token === 'string'
          ? this.tokens.get(body.token)
          : undefined;
      const account = id ? this.accounts.get(id) : undefined;
      if (!account)
        return { status: 403, body: { error: 'Token unavailable' } };
      if (typeof body.password !== 'string')
        return { status: 400, body: { error: 'Invalid input' } };
      account.password = body.password;
      this.tokens.delete(String(body.token));
      if (this.repaired) this.invalidateTokens(id!);
      return { status: 200, body: { updated: true } };
    }
    return { status: 404, body: { error: 'Not found' } };
  }
}
