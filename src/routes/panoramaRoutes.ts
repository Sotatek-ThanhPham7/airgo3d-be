import { Router, Request, Response } from "express";
import * as dayjsModule from "dayjs";
const dayjs = dayjsModule as any;
import PanoramaImage from "../models/PanoramaImage";
import Tag from "../models/Tag";
import { CreatePanoramaImageRequest } from "../dtos/CreatePanoramaImageRequest";
import { BookmarkUpdateRequest } from "../dtos/BookmarkUpdateRequest";
import { SearchPanoramaImageQuery } from "../dtos/SearchPanoramaImageQuery";
import { AnalyticsQuery } from "../dtos/AnalyticsQuery";
import { MongoIdParam } from "../dtos/MongoIdParam";
import {
  PanoramaImageItemDto,
  PanoramaImageListResponse,
} from "../dtos/PanoramaImageListResponse";
import {
  BookmarkAnalyticsResponse,
  BookmarkAnalyticsSummary,
  TimeSeriesDataPoint,
} from "../dtos/BookmarkAnalyticsResponse";
import { validateRequest } from "../middleware/validation";
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
router.post(
  "/",
  validateRequest(CreatePanoramaImageRequest, "body"),
  async (req: Request, res: Response) => {
    try {
      const body = (req as any).validated as CreatePanoramaImageRequest;
      const { key, name, fileSize, mimeType, description, tags } = body;

      const filename = key.split("/").pop() || key;

      const tagObjectIds: any[] = [];
      if (tags && Array.isArray(tags) && tags.length > 0) {
        const uniqueTagNames = Array.from(
          new Set(tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0))
        );

        for (const tagName of uniqueTagNames) {
          try {
            const escapedTagName = tagName.replace(
              /[.*+?^${}()|[\]\\]/g,
              "\\$&"
            );
            let existingTag = await Tag.findOne({
              name: { $regex: new RegExp(`^${escapedTagName}$`, "i") },
            });

            if (!existingTag) {
              existingTag = new Tag({ name: tagName });
              await existingTag.save();
              logger.info(`Created new tag: ${tagName}`);
            }

            tagObjectIds.push(existingTag._id);
          } catch (tagError: any) {
            logger.error(`Error processing tag "${tagName}": ${tagError}`);
          }
        }
      }

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

      const savedImage = await panoramaImage.save();

      await savedImage.populate("tags");

      const responseDto = new PanoramaImageItemDto(savedImage);

      logger.info(
        `Created PanoramaImage with ID: ${savedImage._id}, filename: ${filename}`
      );

      res.status(201).json(responseDto);
    } catch (error: any) {
      logger.error(`Error creating PanoramaImage: ${error}`);

      if (error.code === 11000 || error.name === "MongoServerError") {
        return res.status(400).json({
          error: "A PanoramaImage with this filename already exists.",
          message: error.message,
        });
      }

      if (error.name === "ValidationError") {
        return res.status(400).json({
          error: "Validation error",
          message: error.message,
        });
      }

      res.status(500).json({
        error: "Failed to create PanoramaImage",
        message: error.message || "Internal server error",
      });
    }
  }
);

/**
 * @swagger
 * /api/panorama:
 *   get:
 *     summary: Search and filter PanoramaImage records with pagination
 *     tags: [Panorama]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page
 *         example: 10
 *       - in: query
 *         name: isBookmarked
 *         schema:
 *           type: boolean
 *         description: Filter by bookmark status
 *         example: true
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for name and description (case-insensitive)
 *         example: "beautiful"
 *       - in: query
 *         name: tags
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         description: Array of tag names to filter by (can be comma-separated or array)
 *         style: form
 *         explode: true
 *         example: ["nature", "landscape"]
 *     responses:
 *       200:
 *         description: PanoramaImage records retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PanoramaImageListResponse'
 *       400:
 *         description: Bad request - invalid query parameters
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
router.get(
  "",
  validateRequest(SearchPanoramaImageQuery, "query"),
  async (req: Request, res: Response) => {
    try {
      const queryParams = (req as any).validated as SearchPanoramaImageQuery;
      const { page = 1, limit = 10, isBookmarked, search, tags } = queryParams;

      const query: any = {};

      if (isBookmarked !== undefined) {
        query.isBookmarked = isBookmarked;
      }

      // Text search on name and description
      if (search && search.trim().length > 0) {
        const escapedSearchTerm = search
          .trim()
          .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const searchRegex = new RegExp(escapedSearchTerm, "i");
        query.$or = [
          { name: { $regex: searchRegex } },
          { description: { $regex: searchRegex } },
        ];
      }

      // Filter by tags
      if (tags && tags.length > 0) {
        const tagNames = tags;
        // Find Tag documents matching the tag names (case-insensitive)
        const tagQueries = tagNames.map((tagName) => {
          const escapedTagName = tagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          return { name: { $regex: new RegExp(`^${escapedTagName}$`, "i") } };
        });

        const matchingTags = await Tag.find({
          $or: tagQueries,
        }).select("_id");

        if (matchingTags.length > 0) {
          const tagObjectIds = matchingTags.map((tag) => tag._id);
          query.tags = { $in: tagObjectIds };
        } else {
          query.tags = { $in: [] };
        }
      }

      const skip = (page - 1) * limit;

      const [panoramaImages, total] = await Promise.all([
        PanoramaImage.find(query)
          .populate("tags")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        PanoramaImage.countDocuments(query),
      ]);

      const data = panoramaImages.map(
        (image) => new PanoramaImageItemDto(image)
      );

      const response = new PanoramaImageListResponse(data, page, limit, total);

      logger.info(
        `PanoramaImage search completed: page=${page}, limit=${limit}, total=${total}, filters=${JSON.stringify(
          query
        )}`
      );

      res.status(200).json(response);
    } catch (error: any) {
      logger.error(`Error searching PanoramaImage: ${error}`);

      res.status(500).json({
        error: "Failed to search PanoramaImage",
        message: error.message || "Internal server error",
      });
    }
  }
);

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
router.patch(
  "/:id/bookmark",
  validateRequest(MongoIdParam, "params"),
  validateRequest(BookmarkUpdateRequest, "body"),
  async (req: Request, res: Response) => {
    try {
      const validated = (req as any).validated as any;
      const params = validated.params as MongoIdParam;
      const body = validated.body as BookmarkUpdateRequest;
      const { id } = params;
      const { isBookmarked } = body;

      const panoramaImage = await PanoramaImage.findByIdAndUpdate(
        id,
        { isBookmarked },
        { new: true, runValidators: true }
      );

      if (!panoramaImage) {
        return res.status(404).json({
          error: "PanoramaImage not found.",
        });
      }

      const responseDto = new PanoramaImageItemDto(panoramaImage);

      logger.info(
        `Updated bookmark status for PanoramaImage ID: ${id}, isBookmarked: ${isBookmarked}`
      );

      res.status(200).json(responseDto);
    } catch (error: any) {
      logger.error(`Error updating bookmark status: ${error}`);

      res.status(500).json({
        error: "Failed to update bookmark status",
        message: error.message || "Internal server error",
      });
    }
  }
);

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
router.get(
  "/analytics",
  validateRequest(AnalyticsQuery, "query"),
  async (req: Request, res: Response) => {
    try {
      const queryParams = (req as any).validated as AnalyticsQuery;
      const { startDate, endDate, period = "day" } = queryParams;

      let startDateObj: Date | undefined;
      let endDateObj: Date | undefined;

      if (startDate) {
        const parsedStartDate = dayjs(startDate);
        if (!parsedStartDate.isValid()) {
          return res.status(400).json({
            error:
              "Invalid 'startDate' format. Must be a valid ISO date string.",
          });
        }
        startDateObj = parsedStartDate.startOf("day").toDate();
      }

      if (endDate) {
        const parsedEndDate = dayjs(endDate);
        if (!parsedEndDate.isValid()) {
          return res.status(400).json({
            error: "Invalid 'endDate' format. Must be a valid ISO date string.",
          });
        }
        endDateObj = parsedEndDate.endOf("day").toDate();
      }

      if (
        startDateObj &&
        endDateObj &&
        dayjs(startDateObj).isAfter(endDateObj)
      ) {
        return res.status(400).json({
          error: "'startDate' must be before or equal to 'endDate'.",
        });
      }

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

      const pipeline: any[] = [];

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

      pipeline.push({
        $sort: { date: 1 },
      });

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

      res.status(500).json({
        error: "Failed to retrieve bookmark analytics",
        message: error.message || "Internal server error",
      });
    }
  }
);

export default router;
