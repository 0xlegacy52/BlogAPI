import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";

export interface JwtPayload {
  userId: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(ApiError.unauthorized("Missing or invalid Authorization header"));
  }

  const token = authHeader.slice(7);
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    return next(ApiError.internal("JWT_ACCESS_SECRET is not configured"));
  }

  try {
    const payload = jwt.verify(token, secret) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    next(ApiError.unauthorized("Invalid or expired token"));
  }
}

export function optionalAuthenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.slice(7);
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) return next();

  try {
    const payload = jwt.verify(token, secret) as JwtPayload;
    req.user = payload;
  } catch {
    // ignore invalid token for optional auth
  }
  next();
}
