/**
 * Parser utility functions for character sheet processing
 */

/**
 * Gets the first number from a line
 * @param line - The line to search
 * @returns The first number found or null
 */
export function GetFirstNumberFromALine(line: string): number | null {
  const regex = /-?\d+/;
  const match = line.match(regex);
  if (match) {
    return Number(match[0]);
  }
  return null;
}

/**
 * Gets part of a line until a specific token
 * @param line - The input line
 * @param token - The token to stop at
 * @returns The substring before the token
 */
export function GetPartOfTheLineUntilToken(line: string, token: string): string {
  if (line.includes(token)) {
    return line.substring(0, line.indexOf(token));
  }
  return line;
}

/**
 * Gets content within parentheses from a line
 * @param line - The input line
 * @returns The content within parentheses or null
 */
export function GetParenthesesContent(line: string): string | null {
  if (line.includes('(') && line.includes(')')) {
    return line.substring(line.indexOf('(') + 1, line.indexOf(')')).trim();
  }
  return null;
}

/**
 * Gets the first line that contains one of the specified tokens
 * @param lines - Array of text lines
 * @param tokens - Array of tokens to search for
 * @returns The first matching line or undefined
 */
export function GetLineThatContainsOneOfTheseTokens(lines: string[], tokens: readonly string[]): string | undefined {
  return lines.find(line => tokens.some(token => line.includes(token)));
}
