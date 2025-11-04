import jwt, { Secret, SignOptions } from "jsonwebtoken";
import { envConfig } from "../config/environment";
import type { JwtPayload } from "../types/users";

export class JwtUtil {
  static sign(payload: JwtPayload): string {
    const secret: Secret = envConfig.JWT_SECRET as string;
    const options: SignOptions = { expiresIn: envConfig.JWT_EXPIRES_IN as any };

    return jwt.sign(payload, secret, options);
  }

  static verify(token: string): JwtPayload {
    const secret: Secret = envConfig.JWT_SECRET as string;
    return jwt.verify(token, secret) as JwtPayload;
  }

  static decode(token: string): JwtPayload | null {
    return jwt.decode(token) as JwtPayload | null;
  }
}
