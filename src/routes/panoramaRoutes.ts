import { Router, Request, Response } from "express";
import * as dayjsModule from "dayjs";
const dayjs = dayjsModule as any;
import PanoramaImage from "../models/PanoramaImage";
import Tag from "../models/Tag";
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
 * @swagger
 * /api/panorama:
 *   post:
 *     summary: Create a new PanoramaImage record after successful S3 upload
 *     tags: [Panorama]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePanoramaImageRequest'
 *     responses:
 *       201:
 *         description: PanoramaImage created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PanoramaImageItem'
 *       400:
 *         description: Bad request - validation error or duplicate filename
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
router.post("/", async (req: Request, res: Response) => {
  try {
    const body: CreatePanoramaImageRequest = req.body;
    const {
      key,
      name,
      fileSize,
      mimeType,
      description,
      tags,
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

    // Process tags: find existing or create new ones
    const tagObjectIds: any[] = [];
    if (tags && Array.isArray(tags) && tags.length > 0) {
      // Deduplicate tag names (case-sensitive for creation, but we'll search case-insensitively)
      const uniqueTagNames = Array.from(
        new Set(tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0))
      );

      for (const tagName of uniqueTagNames) {
        try {
          // Search for existing tag (case-insensitive)
          const escapedTagName = tagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          let existingTag = await Tag.findOne({
            name: { $regex: new RegExp(`^${escapedTagName}$`, "i") },
          });

          if (!existingTag) {
            // Create new tag with exact casing as provided
            existingTag = new Tag({ name: tagName });
            await existingTag.save();
            logger.info(`Created new tag: ${tagName}`);
          }

          tagObjectIds.push(existingTag._id);
        } catch (tagError: any) {
          // Handle unique constraint error (race condition - tag was created by another request)
          if (tagError.code === 11000 || tagError.name === "MongoServerError") {
            // Tag already exists, find it again
            const escapedTagName = tagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const foundTag = await Tag.findOne({
              name: { $regex: new RegExp(`^${escapedTagName}$`, "i") },
            });
            if (foundTag) {
              tagObjectIds.push(foundTag._id);
            }
          } else {
            logger.error(`Error processing tag "${tagName}": ${tagError}`);
            // Continue with other tags even if one fails
          }
        }
      }
    }

    // Create new PanoramaImage document
    const panoramaImage = new PanoramaImage({
      name: name.trim(),
      filename,
      filePath: key,
      fileSize,
      mimeType,
      isBookmarked: false,
      description: description?.trim(),
      tags: tagObjectIds,
    });

    // Save to database
    const savedImage = await panoramaImage.save();

    // Populate tags before converting to DTO
    await savedImage.populate("tags");

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
 * @swagger
 * /api/panorama/{id}/bookmark:
 *   patch:
 *     summary: Update the bookmark status of a PanoramaImage
 *     tags: [Panorama]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB document ID
 *         example: "507f1f77bcf86cd799439011"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BookmarkUpdateRequest'
 *     responses:
 *       200:
 *         description: Bookmark status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PanoramaImageItem'
 *       400:
 *         description: Bad request - invalid ID format or missing isBookmarked field
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: PanoramaImage not found
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
 * @swagger
 * /api/panorama/analytics:
 *   get:
 *     summary: Get analytics data about bookmarked/un-bookmarked images over time
 *     tags: [Panorama]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for filtering (ISO date string)
 *         example: "2024-01-01T00:00:00Z"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for filtering (ISO date string)
 *         example: "2024-12-31T23:59:59Z"
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *           default: day
 *         description: Aggregation period
 *         example: "day"
 *     responses:
 *       200:
 *         description: Analytics data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BookmarkAnalyticsResponse'
 *       400:
 *         description: Bad request - invalid date format or period
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
