import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import logger from "../logger";

class S3Service {
  private s3Client: S3Client;
  private bucketName: string;
  private defaultExpiry: number;

  constructor() {
    // Validate required environment variables
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_REGION;
    this.bucketName = process.env.S3_BUCKET_NAME || "";

    if (!accessKeyId || !secretAccessKey || !region || !this.bucketName) {
      const missing = [];
      if (!accessKeyId) missing.push("AWS_ACCESS_KEY_ID");
      if (!secretAccessKey) missing.push("AWS_SECRET_ACCESS_KEY");
      if (!region) missing.push("AWS_REGION");
      if (!this.bucketName) missing.push("S3_BUCKET_NAME");

      logger.error(
        `Missing required S3 environment variables: ${missing.join(", ")}`
      );
      throw new Error(
        `Missing required S3 environment variables: ${missing.join(", ")}`
      );
    }

    // Initialize S3 client
    this.s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    this.defaultExpiry = parseInt(
      process.env.S3_PRESIGNED_URL_EXPIRY_SECONDS || "300",
      10
    );

    logger.info(
      `S3 service initialized for bucket: ${this.bucketName}, region: ${region}`
    );
  }

  /**
   * Generate a presigned URL for uploading a file to S3
   * @param key - The S3 object key (file path)
   * @param contentType - Optional content type of the file
   * @param expiresIn - Optional expiration time in seconds (default: 5 minutes)
   * @returns Presigned URL string
   */
  async generatePresignedUploadUrl(
    key: string,
    contentType?: string,
    expiresIn?: number
  ): Promise<string> {
    try {
      const commandParams: PutObjectCommandInput = {
        Bucket: this.bucketName,
        Key: key,
      };
      if (contentType) {
        commandParams.ContentType = contentType;
      }
      const command = new PutObjectCommand(commandParams);

      const expiry = expiresIn || this.defaultExpiry;
      const url = await getSignedUrl(this.s3Client, command, {
        expiresIn: expiry,
      });

      logger.info(
        `Generated presigned upload URL for key: ${key}, expires in: ${expiry}s`
      );
      return url;
    } catch (error) {
      logger.error(
        `Error generating presigned upload URL for key ${key}: ${error}`
      );
      throw error;
    }
  }

  /**
   * Generate a presigned URL for downloading a file from S3
   * @param key - The S3 object key (file path)
   * @param expiresIn - Optional expiration time in seconds (default: 5 minutes)
   * @returns Presigned URL string
   */
  async generatePresignedDownloadUrl(
    key: string,
    expiresIn?: number
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const expiry = expiresIn || this.defaultExpiry;
      const url = await getSignedUrl(this.s3Client, command, {
        expiresIn: expiry,
      });

      logger.info(
        `Generated presigned download URL for key: ${key}, expires in: ${expiry}s`
      );
      return url;
    } catch (error) {
      logger.error(
        `Error generating presigned download URL for key ${key}: ${error}`
      );
      throw error;
    }
  }
}

// Export singleton instance
const s3Service = new S3Service();
export default s3Service;
