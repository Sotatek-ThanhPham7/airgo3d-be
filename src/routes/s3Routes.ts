import { Router, Request, Response } from "express";
import uuid = require("uuid");
import s3Service from "../services/s3Service";
import logger from "../logger";

const router = Router();

/**
 * @swagger
 * /api/s3/presigned-url:
 *   post:
 *     summary: Generate a presigned URL for uploading a file to S3
 *     tags: [S3]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PresignedUrlRequest'
 *     responses:
 *       200:
 *         description: Presigned URL generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PresignedUrlResponse'
 *       400:
 *         description: Bad request - missing or invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
