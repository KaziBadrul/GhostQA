import type { Json } from '../contracts';
import { sensitiveName } from './classify';
export class SecretVault {
  readonly #values = new Map<string, { value: Json; sensitive: boolean }>();
  readonly #symbols = new Map<string, string>();
  #closed = false;
  #symbolIndex = 0;
  readonly #symbolNames = new Set<string>();
  constructor(readonly selectors: readonly string[] = []) {}
  #check() {
    if (this.#closed) throw new Error('VAULT CLOSED');
  }
  register(value: Json): string {
    this.#check();
    const encoded = JSON.stringify(value);
    const known = this.#symbols.get(encoded);
    if (known) return known;
    if (typeof value === 'string' && this.#symbolNames.has(value))
      throw new Error('SENSITIVE VALUE CONFLICT');
    let symbol: string;
    do {
      symbol = `[SECRET_${++this.#symbolIndex}]`;
    } while (symbol === value || this.#symbols.has(JSON.stringify(symbol)));
    this.#symbolNames.add(symbol);
    this.#symbols.set(encoded, symbol);
    if (typeof value === 'string' && /^Bearer\s+/i.test(value))
      this.register(value.replace(/^Bearer\s+/i, ''));
    return symbol;
  }
  set(name: string, value: Json, sensitive = false) {
    this.#check();
    const previous = this.#values.get(name);
    const tainted =
      sensitive ||
      previous?.sensitive === true ||
      this.#symbols.has(JSON.stringify(value));
    this.#values.set(name, { value, sensitive: tainted });
    if (tainted) this.register(value);
  }
  get(name: string): Json {
    this.#check();
    const entry = this.#values.get(name);
    if (!entry) throw new Error('MISSING VALUE');
    return entry.value;
  }
  isSensitive(name: string) {
    this.#check();
    return this.#values.get(name)?.sensitive === true;
  }
  // Preserve symbols only for records already sanitized by the trusted engine.
  sanitize(value: Json, alreadySanitized = false): Json {
    this.#check();
    const symbolic = (value: Json): boolean =>
      typeof value === 'string' &&
      (this.#symbolNames.has(value) ||
        (alreadySanitized && /^\[SECRET_[0-9]+\]$/.test(value))) &&
      !this.#symbols.has(JSON.stringify(value));
    const mark = (value: Json) =>
      symbolic(value) ? value : this.register(value);
    const rawMark = (value: Json) =>
      alreadySanitized ? mark(value) : this.register(value);
    const classify = (input: Json): void => {
      if (symbolic(input)) return;
      if (typeof input === 'string') {
        for (const match of input.matchAll(/[?&]([^=&#]+)=([^&#]*)/g)) {
          if (sensitiveName(match[1] ?? '', this.selectors)) {
            let decoded: string;
            try {
              decoded = decodeURIComponent(match[2] ?? '');
            } catch {
              continue;
            }
            rawMark(decoded);
          }
        }
      } else if (Array.isArray(input)) input.forEach(classify);
      else if (input && typeof input === 'object')
        for (const [name, item] of Object.entries(input)) {
          if (sensitiveName(name, this.selectors)) rawMark(item);
          classify(item);
        }
    };
    classify(value);
    const replacements = [...this.#symbols].sort(
      (a, b) => b[0].length - a[0].length,
    );
    const clean = (input: Json): Json => {
      if (symbolic(input)) return input;
      const exact = this.#symbols.get(JSON.stringify(input));
      if (exact) return exact;
      if (typeof input === 'string') {
        let output = input;
        for (const [encoded, symbol] of replacements) {
          const original: unknown = JSON.parse(encoded);
          if (typeof original !== 'string' || !original) continue;
          for (const form of new Set([
            original,
            encodeURIComponent(original),
            JSON.stringify(original).slice(1, -1),
          ]))
            output = output.split(form).join(symbol);
        }
        output = output.replace(
          /([?&]([^=&#]+)=)([^&#]*)/g,
          (full: string, prefix: string, name: string, raw: string) => {
            if (!sensitiveName(name, this.selectors)) return full;
            let decoded = raw;
            try {
              decoded = decodeURIComponent(raw);
            } catch {
              return prefix + '[WITHHELD]';
            }
            return prefix + mark(decoded);
          },
        );
        return output;
      }
      if (Array.isArray(input)) return input.map(clean);
      if (input && typeof input === 'object')
        return Object.fromEntries(
          Object.entries(input).map(([name, item]) => [
            name,
            sensitiveName(name, this.selectors) ? mark(item) : clean(item),
          ]),
        );
      return input;
    };
    return clean(value);
  }
  discard() {
    this.#values.clear();
    this.#symbols.clear();
    this.#symbolNames.clear();
    this.#closed = true;
  }
}
