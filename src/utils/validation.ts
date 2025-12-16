import { Request, Response } from "express";
import { validationResult } from "express-validator";
import logger from "../logger";

export const handleValidationErrors = (
  req: Request,
  res: Response
): boolean => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const details = errors.array().map((err: any) => ({
      field: err.param,
      messages: [err.msg],
    }));

    logger.warn(`Validation failed: ${JSON.stringify(details)}`);

    res.status(400).json({
      error: "Validation error",
      details,
    });
    return true;
  }
  return false;
};

