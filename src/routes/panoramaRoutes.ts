import { Router, Request, Response } from "express";
import * as dayjsModule from "dayjs";
const dayjs = dayjsModule as any;
import PanoramaImage from "../models/PanoramaImage";
import { CreatePanoramaImageRequest } from "../dtos/CreatePanoramaImageRequest";
import { PanoramaImageItemDto } from "../dtos/PanoramaImageListResponse";
import {
  BookmarkAnalyticsResponse,
  BookmarkAnalyticsSummary,
  TimeSeriesDataPoint,
} from "../dtos/BookmarkAnalyticsResponse";
import logger from "../logger";

const router = Router();

/**
 * POST /api/panorama
 * Create a new PanoramaImage record after successful S3 upload
 *
 * Request body:
 * {
 *   key: string (required) - S3 object key/path
 *   name: string (required) - Display name for the image
 *   originalFilename: string (required) - Original filename from client
 *   fileSize: number (required) - File size in bytes
 *   mimeType: string (required) - MIME type (image/jpeg, image/png, image/jpg, image/webp)
 *   width?: number (optional) - Image width in pixels
 *   height?: number (optional) - Image height in pixels
 *   metadata?: object (optional) - Optional metadata
 * }
 *
 * Response:
 * {
 *   _id: string - MongoDB document ID
 *   name: string
 *   filename: string
 *   originalFilename: string
 *   filePath: string
 *   fileSize: number
 *   mimeType: string
 *   width?: number
 *   height?: number
 *   isBookmarked: boolean
 *   createdAt: Date
 *   updatedAt: Date
 *   metadata?: object
 * }
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const body: CreatePanoramaImageRequest = req.body;
    const {
      key,
      name,
      originalFilename,
      fileSize,
      mimeType,
      width,
      height,
      metadata,
    } = body;

    // Validate required fields
    if (!key || typeof key !== "string") {
      return res.status(400).json({
        error:
          "Missing or invalid 'key' field. 'key' must be a non-empty string.",
      });
    }

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({
        error:
          "Missing or invalid 'name' field. 'name' must be a non-empty string.",
      });
    }

    if (!originalFilename || typeof originalFilename !== "string") {
      return res.status(400).json({
        error:
          "Missing or invalid 'originalFilename' field. 'originalFilename' must be a non-empty string.",
      });
    }

    if (!fileSize || typeof fileSize !== "number" || fileSize < 0) {
      return res.status(400).json({
        error:
          "Missing or invalid 'fileSize' field. 'fileSize' must be a non-negative number.",
      });
    }

    if (!mimeType || typeof mimeType !== "string") {
      return res.status(400).json({
        error:
          "Missing or invalid 'mimeType' field. 'mimeType' must be a string.",
      });
    }

    // Validate mimeType enum
    const validMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "image/webp",
    ];
    if (!validMimeTypes.includes(mimeType)) {
      return res.status(400).json({
        error: `Invalid 'mimeType'. Must be one of: ${validMimeTypes.join(
          ", "
        )}`,
      });
    }

    // Extract filename from S3 key (last segment after last '/')
    const filename = key.split("/").pop() || key;

    // Validate optional fields
    if (width !== undefined && (typeof width !== "number" || width < 0)) {
      return res.status(400).json({
        error: "Invalid 'width' field. 'width' must be a non-negative number.",
      });
    }

    if (height !== undefined && (typeof height !== "number" || height < 0)) {
      return res.status(400).json({
        error:
          "Invalid 'height' field. 'height' must be a non-negative number.",
      });
    }

    // Create new PanoramaImage document
    const panoramaImage = new PanoramaImage({
      name: name.trim(),
      filename,
      originalFilename,
      filePath: key,
      fileSize,
      mimeType,
      width,
      height,
      isBookmarked: false,
      metadata,
    });

    // Save to database
    const savedImage = await panoramaImage.save();

    // Convert to DTO
    const responseDto = new PanoramaImageItemDto(savedImage);

    logger.info(
      `Created PanoramaImage with ID: ${savedImage._id}, filename: ${filename}`
    );

    res.status(201).json(responseDto);
  } catch (error: any) {
    logger.error(`Error creating PanoramaImage: ${error}`);

    // Handle duplicate filename error (unique constraint)
    if (error.code === 11000 || error.name === "MongoServerError") {
      return res.status(400).json({
        error: "A PanoramaImage with this filename already exists.",
        message: error.message,
      });
    }

    // Handle validation errors
    if (error.name === "ValidationError") {
      return res.status(400).json({
        error: "Validation error",
        message: error.message,
      });
    }

    // Generic server error
    res.status(500).json({
      error: "Failed to create PanoramaImage",
      message: error.message || "Internal server error",
    });
  }
});

/**
 * PATCH /api/panorama/:id/bookmark
 * Update the bookmark status of a PanoramaImage
 *
 * URL Parameters:
 * - id: string (required) - MongoDB document ID
 *
 * Request body:
 * {
 *   isBookmarked: boolean (required) - Bookmark status (true to bookmark, false to unbookmark)
 * }
 *
 * Response:
 * {
 *   _id: string - MongoDB document ID
 *   name: string
 *   filename: string
 *   originalFilename: string
 *   filePath: string
 *   fileSize: number
 *   mimeType: string
 *   width?: number
 *   height?: number
 *   isBookmarked: boolean
 *   createdAt: Date
 *   updatedAt: Date
 *   metadata?: object
 * }
 */
router.patch("/:id/bookmark", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isBookmarked } = req.body;

    // Validate ID
    if (!id) {
      return res.status(400).json({
        error: "Missing 'id' parameter in URL.",
      });
    }

    // Validate isBookmarked field
    if (typeof isBookmarked !== "boolean") {
      return res.status(400).json({
        error:
          "Missing or invalid 'isBookmarked' field. 'isBookmarked' must be a boolean.",
      });
    }

    // Find and update the PanoramaImage
    const panoramaImage = await PanoramaImage.findByIdAndUpdate(
      id,
      { isBookmarked },
      { new: true, runValidators: true }
    );

    // Check if image was found
    if (!panoramaImage) {
      return res.status(404).json({
        error: "PanoramaImage not found.",
      });
    }

    // Convert to DTO
    const responseDto = new PanoramaImageItemDto(panoramaImage);

    logger.info(
      `Updated bookmark status for PanoramaImage ID: ${id}, isBookmarked: ${isBookmarked}`
    );

    res.status(200).json(responseDto);
  } catch (error: any) {
    logger.error(`Error updating bookmark status: ${error}`);

    // Handle invalid ObjectId format
    if (error.name === "CastError" || error.kind === "ObjectId") {
      return res.status(400).json({
        error: "Invalid PanoramaImage ID format.",
      });
    }

    // Handle validation errors
    if (error.name === "ValidationError") {
      return res.status(400).json({
        error: "Validation error",
        message: error.message,
      });
    }

    // Generic server error
    res.status(500).json({
      error: "Failed to update bookmark status",
      message: error.message || "Internal server error",
    });
  }
});

/**
 * GET /api/panorama/analytics
 * Get analytics data about bookmarked/un-bookmarked images over time
 *
 * Query parameters:
 * - startDate (optional): ISO date string - Start date for filtering
 * - endDate (optional): ISO date string - End date for filtering
 * - period (optional): "day" | "week" | "month" - Aggregation period (default: "day")
 *
 * Response:
 * {
 *   summary: {
 *     totalImages: number,
 *     bookmarkedCount: number,
 *     unbookmarkedCount: number,
 *     bookmarkedPercentage: number,
 *     unbookmarkedPercentage: number
 *   },
 *   timeSeries: [
 *     {
 *       date: string,
 *       bookmarked: number,
 *       unbookmarked: number,
 *       total: number
 *     }
 *   ],
 *   period: string,
 *   startDate?: Date,
 *   endDate?: Date
 * }
 */
router.get("/analytics", async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, period = "day" } = req.query;

    // Validate period parameter
    const validPeriods = ["day", "week", "month"];
    if (period && !validPeriods.includes(period as string)) {
      return res.status(400).json({
        error: `Invalid 'period' parameter. Must be one of: ${validPeriods.join(
          ", "
        )}`,
      });
    }

    // Parse and validate dates using dayjs
    let startDateObj: Date | undefined;
    let endDateObj: Date | undefined;

    if (startDate) {
      const parsedStartDate = dayjs(startDate as string);
      if (!parsedStartDate.isValid()) {
        return res.status(400).json({
          error: "Invalid 'startDate' format. Must be a valid ISO date string.",
        });
      }
      startDateObj = parsedStartDate.startOf("day").toDate();
    }

    if (endDate) {
      const parsedEndDate = dayjs(endDate as string);
      if (!parsedEndDate.isValid()) {
        return res.status(400).json({
          error: "Invalid 'endDate' format. Must be a valid ISO date string.",
        });
      }
      endDateObj = parsedEndDate.endOf("day").toDate();
    }

    // Validate date range
    if (startDateObj && endDateObj && dayjs(startDateObj).isAfter(endDateObj)) {
      return res.status(400).json({
        error: "'startDate' must be before or equal to 'endDate'.",
      });
    }

    // Build date format string based on period
    let dateFormatString: string;
    switch (period) {
      case "week":
        dateFormatString = "%Y-W%V"; // ISO week format: YYYY-Www
        break;
      case "month":
        dateFormatString = "%Y-%m"; // YYYY-MM
        break;
      case "day":
      default:
        dateFormatString = "%Y-%m-%d"; // YYYY-MM-DD
        break;
    }

    // Build aggregation pipeline
    const pipeline: any[] = [];

    // Match stage: filter by date range if provided
    const matchStage: any = {};
    if (startDateObj || endDateObj) {
      matchStage.createdAt = {};
      if (startDateObj) {
        matchStage.createdAt.$gte = startDateObj;
      }
      if (endDateObj) {
        matchStage.createdAt.$lte = endDateObj;
      }
      pipeline.push({ $match: matchStage });
    }

    // Group stage: group by date period and bookmark status
    pipeline.push({
      $group: {
        _id: {
          date: {
            $dateToString: {
              format: dateFormatString,
              date: "$createdAt",
            },
          },
          isBookmarked: "$isBookmarked",
        },
        count: { $sum: 1 },
      },
    });

    pipeline.push({
      $group: {
        _id: "$_id.date",
        bookmarked: {
          $sum: {
            $cond: {
              if: { $eq: ["$_id.isBookmarked", true] },
              then: "$count",
              else: 0,
            },
          },
        },
        unbookmarked: {
          $sum: {
            $cond: {
              if: { $eq: ["$_id.isBookmarked", false] },
              then: "$count",
              else: 0,
            },
          },
        },
        total: { $sum: "$count" },
      },
    });

    pipeline.push({
      $project: {
        date: "$_id",
        _id: 0,
        bookmarked: 1,
        unbookmarked: 1,
        total: 1,
      },
    });

    // Sort by date
    pipeline.push({
      $sort: { date: 1 },
    });

    // Execute aggregation
    const aggregationResult = await PanoramaImage.aggregate(pipeline);

    let totalImages = 0;
    let bookmarkedCount = 0;
    let unbookmarkedCount = 0;
    let bookmarkedPercentage = 0;
    let unbookmarkedPercentage = 0;
    aggregationResult.forEach((item) => {
      totalImages += item.total;
      bookmarkedCount += item.bookmarked;
      unbookmarkedCount += item.unbookmarked;
      bookmarkedPercentage =
        Math.round((bookmarkedCount / totalImages) * 100 * 100) / 100;
      unbookmarkedPercentage =
        Math.round((unbookmarkedCount / totalImages) * 100 * 100) / 100;
    });

    const summary: BookmarkAnalyticsSummary = {
      totalImages,
      bookmarkedCount,
      unbookmarkedCount,
      bookmarkedPercentage,
      unbookmarkedPercentage,
    };

    const response = new BookmarkAnalyticsResponse(
      summary,
      aggregationResult as unknown as TimeSeriesDataPoint[],
      period as string,
      startDateObj,
      endDateObj
    );

    logger.info(
      `Retrieved bookmark analytics: period=${period}, total=${totalImages}, dateRange=${
        startDateObj ? startDateObj.toISOString() : "none"
      }-${endDateObj ? endDateObj.toISOString() : "none"}`
    );

    res.status(200).json(response);
  } catch (error: any) {
    logger.error(`Error retrieving bookmark analytics: ${error}`);

    // Generic server error
    res.status(500).json({
      error: "Failed to retrieve bookmark analytics",
      message: error.message || "Internal server error",
    });
  }
});

export default router;
