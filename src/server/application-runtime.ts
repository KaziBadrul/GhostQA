// Registered by the long-lived server. No route statically imports CLI/bundle code.
export interface ApplicationEngine {
  command(
    action: string,
    projectId?: string,
    value?: unknown,
    extra?: string,
  ): Promise<unknown>;
  shutdown(): Promise<void>;
}
const registry = globalThis as unknown as {
  __ghostqaApplication?: ApplicationEngine;
};
export function installApplication(engine: ApplicationEngine) {
  registry.__ghostqaApplication = engine;
}
export function application() {
  if (!registry.__ghostqaApplication)
    throw new Error('APPLICATION UNAVAILABLE');
  return registry.__ghostqaApplication;
}
