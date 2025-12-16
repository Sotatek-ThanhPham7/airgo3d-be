import { Router, Request, Response } from "express";
import { query } from "express-validator";
import Tag from "../models/Tag";
import { TagListResponse, TagItemDto } from "../dtos/TagListResponse";
import logger from "../logger";
import { handleValidationErrors } from "../utils/validation";

const router = Router();

/**
 * @swagger
 * /api/tags/suggest:
 *   get:
 *     summary: Suggest tags by name (case-insensitive) with pagination
 *     tags: [Tags]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: false
 *         schema:
 *           type: string
 *         description: Search term for tag name (optional)
 *         example: "nature"
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of results per page
 *     responses:
 *       200:
 *         description: Tags found successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TagListResponse'
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
  "/suggest",
  [
    query("q").optional().isString().withMessage("q must be a string"),
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("page must be a positive integer")
      .toInt(),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("limit must be between 1 and 100")
      .toInt(),
  ],
  async (req: Request, res: Response) => {
    try {
      if (handleValidationErrors(req, res)) {
        return;
      }

      const { page = 1, limit = 10, q } = req.query as any;

      const query: any = {};

      if (q && q.trim().length > 0) {
        const escapedSearchTerm = q
          .trim()
          .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const searchRegex = new RegExp(escapedSearchTerm, "i");
        query.name = { $regex: searchRegex };
      }

      const skip = (page - 1) * limit;

      const [tags, total] = await Promise.all([
        Tag.find(query)
          .sort({ name: 1 })
          .skip(skip)
          .limit(limit)
          .select("_id name")
          .lean(),
        Tag.countDocuments(query),
      ]);

      const data = tags.map((tag) => new TagItemDto(tag));

      const response = new TagListResponse(data, page, limit, total);

      logger.info(
        `Tag suggest completed: page=${page}, limit=${limit}, total=${total}, query="${
          q || ""
        }"`
      );

      res.status(200).json(response);
    } catch (error: any) {
      logger.error(`Error suggesting tags: ${error}`);

      res.status(500).json({
        error: "Failed to suggest tags",
        message: error.message || "Internal server error",
      });
    }
  }
);

export default router;
