/**
 * Effort level for action execution.
 *
 * Represents the user-selected effort level in the Actions dropdown.
 * This is the single source of truth for valid effort values — no string
 * literals for effort values should appear outside of display label text.
 *
 *
 * @summary Effort level enum for action execution
 * @module types/effort
 */

/**
 * Effort levels available in the TriStateSwitch UI control.
 *
 * - `low`: Quick, lightweight execution. Favors speed over thoroughness.
 * - `medium`: Balanced execution. The default when no effort is specified.
 * - `high`: Rigorous, thorough execution. Favors quality over speed.
 */
export enum Effort {
  low = 'low',
  medium = 'medium',
  high = 'high'
}
