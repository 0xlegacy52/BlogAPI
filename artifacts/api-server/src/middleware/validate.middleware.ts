import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import { ApiError } from "../utils/ApiError.js";

export function validate(req: Request, _res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const details = errors.array().map((err) => ({
      field: (err as { path?: string }).path ?? "unknown",
      message: err.msg,
    }));
    return next(ApiError.validationError(details));
  }
  next();
}
