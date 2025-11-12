import type { Request, Response, NextFunction } from "express"
import logger from "../utils/logger"

/**
 * Middleware to log HTTP requests with detailed information
 * Logs method, path, status code, duration, IP address, and user ID (if authenticated)
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now()

  res.on("finish", () => {
    const duration = Date.now() - start
    const ip = req.ip || req.socket.remoteAddress || "unknown"
    
    logger.info({
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip,
      userId: req.user?.userId || undefined,
    })
  })

  next()
}
