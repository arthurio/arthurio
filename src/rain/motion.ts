/** Reduced-motion helpers: a pure resolver plus a matchMedia listener. */

export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export interface MatchMediaHost {
  matchMedia?: (query: string) => MediaQueryList;
}

/** Pure: interpret a media query list (or its absence) as a boolean. */
export function resolveReducedMotion(mql: { matches: boolean } | null | undefined): boolean {
  return mql?.matches === true;
}

export function prefersReducedMotion(host: MatchMediaHost = window): boolean {
  if (typeof host.matchMedia !== 'function') return false;
  return resolveReducedMotion(host.matchMedia(REDUCED_MOTION_QUERY));
}

/** Pure: whether the animation loop should be running. */
export function shouldAnimate(reducedMotion: boolean, documentHidden: boolean): boolean {
  return !reducedMotion && !documentHidden;
}

/** Subscribe to preference changes. Returns an unsubscribe function. */
export function watchReducedMotion(
  callback: (reduced: boolean) => void,
  host: MatchMediaHost = window,
): () => void {
  if (typeof host.matchMedia !== 'function') return () => undefined;
  const mql = host.matchMedia(REDUCED_MOTION_QUERY);
  const listener = (event: { matches: boolean }): void => callback(resolveReducedMotion(event));
  if (typeof mql.addEventListener === 'function') {
    mql.addEventListener('change', listener);
    return () => mql.removeEventListener('change', listener);
  }
  // Legacy Safari fallback.
  mql.addListener(listener);
  return () => mql.removeListener(listener);
}
