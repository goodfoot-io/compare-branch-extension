/**
 * Command type definitions for action and type lifecycle handlers.
 *
 * These types define the callable command interfaces returned by factory
 * functions. Each command preserves metadata for CLI extraction and settings.json
 * generation while remaining executable by the runtime.
 *
 * The generic parameter `N` preserves the action/type name as a literal type,
 * enabling compile-time validation of action start/end pairing.
 *
 * @module
 */
export {};
