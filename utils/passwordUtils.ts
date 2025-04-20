import { randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { scrypt } from "crypto";

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;

  // Return the hash and salt concatenated as a string
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(
  supplied: string,
  stored: string
): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");

  // Hash the supplied password with the salt and compare using timing-safe equality
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;

  // Compare buffers using timing-safe equality
  return timingSafeEqual(hashedBuf, suppliedBuf);
}
