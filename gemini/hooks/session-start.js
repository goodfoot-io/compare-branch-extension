/**
 * Gemini session-start hook.
 *
 * @param {object} context - Session context
 */
export default async function onSessionStart(context) {
  console.log('Gemini session started:', context.sessionId);
}
