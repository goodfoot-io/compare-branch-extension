/**
 * Lifecycle and runtime status vocabularies used by Cards V2.
 *
 * These unions define the canonical status strings persisted on disk, sent over
 * the wire, and shown in UI. Treat additions or renames as compatibility
 * changes across the ecosystem.
 *
 *
 * @summary Lifecycle and runtime status vocabularies used by Cards V2
 * @module types/status
 */

// --- Card Status ---

/**
 * Card lifecycle stages as understood by both UI and automation.
 *
 * The states are intentionally coarse-grained for consistent filtering. Moving
 * a card between these states can trigger downstream behaviors such as review
 * gating, notifications, or sorting rules.
 */
export type CardStatus = 'todo' | 'in_progress' | 'needs_review' | 'done' | 'backlog' | 'archived';

// --- Session Type ---

/**
 * Role labels for agent sessions so logs and UI can distinguish intent.
 */
export type SessionType = 'router' | 'implementer' | 'reviewer' | 'interview' | 'other';

// --- Process State ---

/**
 * Execution state of a running agent process as reported by the wrapper.
 */
export type ProcessState = 'running' | 'interrupting' | 'terminated';
