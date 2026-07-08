/**
 * Provider-neutral landmark classification for a stream event.
 *
 * A landmark is a summarizable anchor in a stream — the kind of point that
 * belongs in a breadcrumb trail, a session headline, or a triage summary. The
 * {@link computeBestLandmark} function selects the single most salient landmark
 * from a set via a preference chain that privileges decision points, assistant
 * messages, actions, and failures over generic entries.
 *
 * Landmark *production* — building {@link Landmark}[] arrays from
 * provider-specific events — is deferred to a future phase. The types and
 * {@link computeBestLandmark} function are forward contracts that future
 * producers target; no producer exists yet.
 *
 * @summary Provider-neutral landmark model for stream events
 * @module streams/lib/landmark
 */

/** The conceptual kind of a stream landmark. */
export type LandmarkKind =
  | 'boundary'
  | 'decision'
  | 'message'
  | 'reasoning'
  | 'action'
  | 'evidence'
  | 'output'
  | 'mutation'
  | 'failure'
  | 'metric'
  | 'raw';

/**
 * A summarizable anchor extracted from a stream event.
 *
 * `sourceRef` is an opaque anchor (e.g. a line index string) that lets a
 * downstream consumer defer raw-source access until the landmark is selected
 * as the headline; it is not a display value.
 */
export interface Landmark {
  /** Discriminant for preference-chain selection. */
  kind: LandmarkKind;
  /** Escalation level — `'error'` landmarks can drive a red dot / badge. */
  severity: 'normal' | 'error';
  /** User-facing role label (e.g. `User`, `Assistant`, `Tool`, `Output`). */
  label: string;
  /** Display text used for headline selection and breadcrumb rendering. */
  text: string;
  /** Opaque anchor for deferred raw-source access (e.g. line index string). */
  sourceRef: string;
}

/**
 * Selects the single most salient landmark from a set.
 *
 * Preference chain (first match wins):
 * 1. First `'decision'` landmark
 * 2. Latest `'message'` with label `'Assistant'`
 * 3. Latest `'action'`
 * 4. First `'failure'`
 * 5. Last landmark of any kind (fallback)
 *
 * Returns `undefined` for an empty array.
 *
 * @param landmarks - The candidate landmarks to evaluate.
 * @returns The best landmark, or `undefined` when the array is empty.
 */
export function computeBestLandmark(landmarks: Landmark[]): Landmark | undefined {
  if (landmarks.length === 0) {
    return undefined;
  }

  // 1. First 'decision' landmark
  for (const lm of landmarks) {
    if (lm.kind === 'decision') {
      return lm;
    }
  }

  // 2. Latest 'message' with label 'Assistant'
  for (let i = landmarks.length - 1; i >= 0; i--) {
    const lm = landmarks[i];
    if (lm !== undefined && lm.kind === 'message' && lm.label === 'Assistant') {
      return lm;
    }
  }

  // 3. Latest 'action'
  for (let i = landmarks.length - 1; i >= 0; i--) {
    const lm = landmarks[i];
    if (lm !== undefined && lm.kind === 'action') {
      return lm;
    }
  }

  // 4. First 'failure'
  for (const lm of landmarks) {
    if (lm.kind === 'failure') {
      return lm;
    }
  }

  // 5. Last landmark of any kind (fallback)
  return landmarks[landmarks.length - 1];
}
