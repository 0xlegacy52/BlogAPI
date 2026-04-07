import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError.js";
import { errorResponse } from "../utils/ApiResponse.js";

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof ApiError) {
    req.log.warn({ code: err.code, status: err.statusCode }, err.message);
    res
      .status(err.statusCode)
      .json(errorResponse(err.code, err.message, err.details));
    return;
  }

  req.log.error({ err }, "Unhandled error");
  res.status(500).json(errorResponse("INTERNAL_SERVER_ERROR", "Internal server error"));
}
