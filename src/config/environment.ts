import dotenv from "dotenv";
dotenv.config();

export const envConfig = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number.parseInt(process.env.PORT || "3000", 10),

  // Database
  DB_HOST: process.env.DB_HOST || "localhost",
  DB_PORT: Number.parseInt(process.env.DB_PORT || "55432", 10),
  DB_USER: process.env.DB_USER || "postgres",
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_NAME: process.env.DB_NAME || "meter_data",

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || "your_jwt_secret_key",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "24h",

  // Security
  BCRYPT_ROUNDS: Number.parseInt(process.env.BCRYPT_ROUNDS || "10", 10),

  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:3000",
}

// Validation
export const validateEnv = () => {
  const required = ["DB_HOST", "DB_USER", "DB_PASSWORD", "JWT_SECRET"]
  const missing = required.filter((key) => !process.env[key])

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`)
  }
}
