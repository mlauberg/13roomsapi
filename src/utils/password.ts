import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'crypto';

const ITERATIONS = 120_000;
const KEY_LENGTH = 64;
const DIGEST = 'sha512';

const encode = (buffer: Buffer): string => buffer.toString('hex');

// Common weak passwords to reject
const COMMON_PASSWORDS = new Set([
  'password', '12345678', 'qwerty', 'abc123', 'monkey', '1234567890',
  'letmein', 'trustno1', 'dragon', 'baseball', 'iloveyou', 'master',
  'sunshine', 'ashley', 'bailey', 'passw0rd', 'shadow', '123456',
  'football', 'michael', 'welcome', 'jesus', 'ninja', 'mustang'
]);

/**
 * Validates password strength according to security best practices.
 * @param password - The password to validate
 * @throws Error with specific validation failure message
 */
const validatePasswordStrength = (password: string): void => {
  if (!password || typeof password !== 'string') {
    throw new Error('Password is required.');
  }

  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long.');
  }

  if (password.length > 128) {
    throw new Error('Password must not exceed 128 characters to prevent DoS attacks.');
  }

  // Check for common weak passwords (case-insensitive)
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    throw new Error('This password is too common. Please choose a stronger password.');
  }

  // Check for at least one number
  if (!/\d/.test(password)) {
    throw new Error('Password must contain at least one number.');
  }

  // Check for at least one letter
  if (!/[a-zA-Z]/.test(password)) {
    throw new Error('Password must contain at least one letter.');
  }
};

export const hashPassword = (password: string): string => {
  validatePasswordStrength(password);

  const salt = randomBytes(16);
  const derivedKey = pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST);

  return `${ITERATIONS}:${encode(salt)}:${encode(derivedKey)}`;
};

export const verifyPassword = (password: string, storedHash: string): boolean => {
  if (!password || !storedHash) {
    return false;
  }

  const [iterationStr, saltHex, hashHex] = storedHash.split(':');
  const iterations = Number.parseInt(iterationStr, 10);

  if (!iterations || !saltHex || !hashHex) {
    return false;
  }

  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');
  const actual = pbkdf2Sync(password, salt, iterations, expected.length, DIGEST);

  return actual.length === expected.length && timingSafeEqual(actual, expected);
};
