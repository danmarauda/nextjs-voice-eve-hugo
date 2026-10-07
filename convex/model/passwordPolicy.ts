export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;

export const PASSWORD_REQUIREMENTS_TEXT = `${PASSWORD_MIN_LENGTH}–${PASSWORD_MAX_LENGTH} characters, including a letter and a number.`;

/** Returns a user-safe problem description, or null when the password is acceptable. */
export function passwordProblem(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Use no more than ${PASSWORD_MAX_LENGTH} characters.`;
  }
  if (!/\p{L}/u.test(password) || !/\p{N}/u.test(password)) {
    return "Include at least one letter and one number.";
  }
  if (password.trim() !== password) {
    return "Remove spaces from the start and end.";
  }
  return null;
}
