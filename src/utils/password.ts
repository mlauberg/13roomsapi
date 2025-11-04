import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'crypto';

const ITERATIONS = 120_000;
const KEY_LENGTH = 64;
const DIGEST = 'sha512';

const encode = (buffer: Buffer): string => buffer.toString('hex');

export const hashPassword = (password: string): string => {
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters long.');
  }

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
