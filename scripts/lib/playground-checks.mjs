/**
 * Mirrors dashboard `hasStagehandUsage` from core `src/utils/playground-stagehand.ts`.
 */

/**
 * @param {string} code
 * @returns {boolean}
 */
export function hasStagehandUsage(code) {
  const stagehandConstructorPattern = /(?:let|const|var)\s+\w+\s*=\s*new\s+Stagehand\s*\(/;
  const stagehandDirectPattern = /(?:^|\s|await\s+)(?:new\s+)?Stagehand\s*\(/;
  const stagehandCreatePattern = /(?:^|\s|await\s+)Stagehand\.create\s*\(/;
  return (
    stagehandConstructorPattern.test(code) ||
    stagehandDirectPattern.test(code) ||
    stagehandCreatePattern.test(code)
  );
}
