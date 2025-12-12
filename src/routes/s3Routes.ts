import { Router, Request, Response } from "express";
import uuid = require("uuid");
import s3Service from "../services/s3Service";
import logger from "../logger";

const router = Router();

/**
 * POST /api/s3/presigned-url
 * Generate a presigned URL for uploading a file to S3
 *
 * Request body:
 * {
 *   contentType?: string (optional) - Content type of the file
 *   expiresIn?: number (optional) - Expiration time in seconds (default: 5 minutes)
 *   prefix?: string (optional) - Optional prefix/path for the S3 key (e.g., "uploads/images/")
 * }
 *
 * Response:
 * {
 *   url: string - The presigned URL
 *   key: string - The auto-generated S3 object key (UUID v4)
 *   expiresIn: number - Expiration time in seconds
 * }
 */
router.post("/presigned-url", async (req: Request, res: Response) => {
  try {
    const { contentType, prefix = "images", fileName } = req.body;

    if (!fileName) {
      return res.status(400).json({
        error: "File name is required",
      });
    }

    if (!contentType) {
      return res.status(400).json({
        error: "Content type is required",
      });
    }

    const generatedUuid = uuid.v4();
    const key = `${prefix}/${fileName}-${generatedUuid}`;

    const expiresIn = parseInt(
      process.env.S3_PRESIGNED_URL_EXPIRY_SECONDS || "300",
      10
    );

    // for Put only
    const url = await s3Service.generatePresignedUploadUrl(
      key,
      contentType,
      expiresIn
    );

    res.status(200).json({
      url,
      key,
      expiresIn,
    });
  } catch (error: any) {
    logger.error(`Error in presigned-url endpoint: ${error}`);
    res.status(500).json({
      error: "Failed to generate presigned URL",
      message: error.message || "Internal server error",
    });
  }
});

export default router;
