import multer from "multer";
import { ApiError } from "../utils/ApiError.js";
import type { Request, Response, NextFunction } from "express";

const storage = multer.memoryStorage();

export const uploadAvatar = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image files are allowed"));
    } else {
      cb(null, true);
    }
  },
}).single("avatar");

export function handleMulterError(
  err: unknown,
  _req: Request,
  _res: Response,
  next: NextFunction,
) {
  if (err instanceof multer.MulterError || err instanceof Error) {
    return next(ApiError.badRequest(err.message));
  }
  next(err);
}
