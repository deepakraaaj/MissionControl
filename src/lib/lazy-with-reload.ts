import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

const RELOAD_KEY_PREFIX = 'syncatch:lazy-reload:';

/**
 * Recovers when an open web session spans a deployment and its old bundle asks
 * the new deployment for a hashed chunk that no longer exists.
 */
// React's ComponentType uses `any` in its own generic interoperability surface.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithReload<T extends ComponentType<any>>(
  key: string,
  loader: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  const reloadKey = `${RELOAD_KEY_PREFIX}${key}`;

  return lazy(async () => {
    try {
      const module = await loader();
      sessionStorage.removeItem(reloadKey);
      return module;
    } catch (error) {
      try {
        if (sessionStorage.getItem(reloadKey) !== '1') {
          sessionStorage.setItem(reloadKey, '1');
          window.location.reload();
          return await new Promise<never>(() => undefined);
        }
      } catch {
        // Storage can be unavailable in privacy-restricted webviews. Preserve
        // the original import error instead of risking an endless reload loop.
      }

      throw error;
    }
  });
}
