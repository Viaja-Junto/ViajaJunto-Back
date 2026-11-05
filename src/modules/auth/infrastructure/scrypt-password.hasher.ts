import { Injectable } from '@nestjs/common';
import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  type BinaryLike,
} from 'node:crypto';
import { promisify } from 'node:util';
import { PasswordHasher } from '../domain/password-hasher.js';

const scrypt = promisify(scryptCallback) as (
  password: BinaryLike,
  salt: BinaryLike,
  keylen: number,
) => Promise<Buffer>;

const SCHEME = 'scrypt';
const SALT_BYTES = 16;
const KEY_LENGTH = 64;

@Injectable()
export class ScryptPasswordHasher implements PasswordHasher {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(SALT_BYTES);
    const key = await scrypt(password, salt, KEY_LENGTH);

    return [SCHEME, salt.toString('hex'), key.toString('hex')].join(':');
  }

  async verify(password: string, hash: string): Promise<boolean> {
    const [scheme, saltHex, keyHex] = hash.split(':');

    if (scheme !== SCHEME || !saltHex || !keyHex) {
      return false;
    }

    const expected = Buffer.from(keyHex, 'hex');
    const actual = await scrypt(
      password,
      Buffer.from(saltHex, 'hex'),
      expected.length,
    );

    return (
      actual.length === expected.length && timingSafeEqual(actual, expected)
    );
  }
}
