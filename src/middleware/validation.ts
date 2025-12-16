/* eslint-disable @typescript-eslint/ban-types */
import { Request, Response, NextFunction } from "express";
import { validate, ValidationError } from "class-validator";
import { plainToInstance } from "class-transformer";
import logger from "../logger";

export function validateRequest<T extends object>(
  dtoClass: new () => T,
  source: "body" | "query" | "params" = "body"
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Transform plain object to class instance
      const dto = plainToInstance(dtoClass, req[source], {
        enableImplicitConversion: true,
      });

      // Validate
      const errors: ValidationError[] = await validate(dto, {
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      });

      if (errors.length > 0) {
        const errorMessages = errors.map((error) => {
          const constraints = error.constraints || {};
          return {
            field: error.property,
            messages: Object.values(constraints),
          };
        });

        logger.warn(`Validation failed: ${JSON.stringify(errorMessages)}`);

        return res.status(400).json({
          error: "Validation error",
          details: errorMessages,
        });
      }

      // Attach validated DTO to request
      // Store in an object keyed by source to handle multiple validations
      if (!(req as any).validated) {
        (req as any).validated = {};
      }
      (req as any).validated[source] = dto;
      // Also set direct property for backward compatibility when only one validation is used
      // This will be overwritten if multiple validations exist, so routes should use validated[source]
      if (Object.keys((req as any).validated).length === 1) {
        (req as any).validated = dto;
      }
      next();
    } catch (error: any) {
      logger.error(`Validation middleware error: ${error}`);
      return res.status(500).json({
        error: "Validation error",
        message: error.message || "Internal server error",
      });
    }
  };
}
