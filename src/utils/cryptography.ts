import crypto from "crypto"
import logger from "./logger"

export class CryptoUtil {
  static generateSalt(): string {
    const salt = crypto.randomBytes(16)
    return salt.toString("base64")
  }

  static hashPassword(password: string, salt: string): string {
    const saltBuffer = Buffer.from(salt, "base64")
    const hash = crypto.pbkdf2Sync(password, saltBuffer, 100000, 32, "sha256")
    return hash.toString("base64")
  }

  static comparePassword(password: string, storedHash: string, salt: string): boolean {
    try {
      const computedHash = this.hashPassword(password, salt)
      return computedHash === storedHash
    } catch (error) {
      logger.error("Password comparison failed:", error)
      return false
    }
  }
}
