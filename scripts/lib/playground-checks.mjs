/**
 * Mirrors dashboard `hasStagehandUsage` from core `src/utils/playground-stagehand.ts`.
 */

/**
 * @param {string} code
 * @returns {boolean}
 */
export function hasStagehandUsage(code) {
  const stagehandVariablePattern = /(?:let|const|var)\s+\w+\s*=\s*new\s+Stagehand\s*\(/;
  const stagehandDirectPattern = /(?:^|\s|await\s+)(?:new\s+)?Stagehand\s*\(/;
  return stagehandVariablePattern.test(code) || stagehandDirectPattern.test(code);
}
