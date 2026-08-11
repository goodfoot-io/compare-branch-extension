/**
 * Whole-value safety filtering for theme CSS custom properties.
 *
 * VS Code injects `--vscode-*` custom properties as inline styles on the
 * webview's `document.documentElement`; the Cards status palette is a static
 * constant. Both are forwarded into sandboxed iframes — and, since the served
 * document model, baked into a `<style>` element at serve time — a sink
 * governed by two grammars at once (the CSS tokenizer and the HTML raw-text
 * tokenizer). `isSafeCssValue()` is the single choke point that guards it,
 * shared by both ends: the webview forwards only safe entries, and the server
 * refuses a `?vars=` payload containing any entry that fails it (fail-closed,
 * one filter).
 *
 * @summary Shared whole-value filter for forwarded theme CSS variables
 * @module theme/cssValue
 */

const HEX_COLOR = /^#[0-9a-fA-F]{3,8}$/;
const COLOR_FUNCTION = /^(?:rgba?|hsla?)\(\s*[\d.%,\s-]+\)$/;
const LENGTH = /^-?\d+(?:\.\d+)?(?:px|em|rem|%|pt|vh|vw)?$/;
const FONT_STACK_ITEM = /(?:"[A-Za-z0-9 -]+"|'[A-Za-z0-9 -]+'|[A-Za-z-]+)/;
const FONT_STACK = new RegExp(`^${FONT_STACK_ITEM.source}(?:\\s*,\\s*${FONT_STACK_ITEM.source})*$`);
const KEYWORD = /^[A-Za-z-]+$/;
const FEATURE_TAG = /(?:"[A-Za-z0-9]{4}"|'[A-Za-z0-9]{4}')/;
const FEATURE_ITEM = new RegExp(`${FEATURE_TAG.source}\\s+(?:on|off|\\d+)`);
const FONT_FEATURE_SETTINGS = new RegExp(`^${FEATURE_ITEM.source}(?:\\s*,\\s*${FEATURE_ITEM.source})*$`);

/**
 * The value shapes a legitimate theme custom-property value can take.
 *
 * Exported so the two consumer ends (webview forwarding, server `?vars=`
 * validation) and the parity test that holds them together all reference one
 * list; the predicate itself is {@link isSafeCssValue}.
 */
export const KNOWN_VALUE_SHAPES: readonly RegExp[] = [
  HEX_COLOR,
  COLOR_FUNCTION,
  LENGTH,
  FONT_STACK,
  FONT_FEATURE_SETTINGS,
  KEYWORD
];

/**
 * True when a CSS custom-property value matches, in its entirety, one of the
 * small number of shapes a legitimate `--vscode-*` value actually takes.
 *
 * Unlike a character-membership test (allow- or deny-list) or a scan that
 * tracks open/closed state, an anchored whole-value pattern cannot be quietly
 * narrowed to "outside of quoted content" by a branch that forgot to apply it
 * there too — `FONT_STACK_ITEM`'s quoted alternative constrains exactly the
 * same character class inside its own quotes as `KEYWORD` does outside any
 * quotes at all, so there is no region of the value the check does not cover.
 * A value that matches none of these shapes is rejected outright, whatever
 * character it fails on.
 *
 * @param value - Raw CSS custom-property value.
 * @returns True when the whole value matches a known-good shape.
 */
export function isSafeCssValue(value: string): boolean {
  return KNOWN_VALUE_SHAPES.some((shape) => shape.test(value));
}
