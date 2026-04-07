import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError.js";

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden("Insufficient permissions"));
    }
    next();
  };
}

export const requireAdmin = requireRole("ADMIN");
