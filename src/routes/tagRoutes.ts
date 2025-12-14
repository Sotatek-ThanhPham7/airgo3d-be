import { Router, Request, Response } from "express";
import Tag from "../models/Tag";
import { TagSearchQuery } from "../dtos/TagSearchQuery";
import { validateRequest } from "../middleware/validation";
import logger from "../logger";

const router = Router();

/**
 * @swagger
 * /api/tags/search:
 *   get:
 *     summary: Search for tags by name (case-insensitive)
 *     tags: [Tags]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search term for tag name
 *         example: "nature"
 *     responses:
 *       200:
 *         description: Tags found successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Tag'
 *       400:
 *         description: Bad request - missing or invalid query parameter
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
  "/search",
  validateRequest(TagSearchQuery, "query"),
  async (req: Request, res: Response) => {
    try {
      const queryParams = (req as any).validated as TagSearchQuery;
      const { q } = queryParams;

      // Escape special regex characters in search term
      const escapedSearchTerm = q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // Search for tags (case-insensitive, limit to 20 results)
    const tags = await Tag.find({
      name: { $regex: escapedSearchTerm, $options: "i" },
    })
      .limit(20)
      .select("_id name")
      .lean();

    logger.info(`Tag search completed: query="${q}", found ${tags.length} results`);

    res.status(200).json(tags);
  } catch (error: any) {
    logger.error(`Error searching tags: ${error}`);

    res.status(500).json({
      error: "Failed to search tags",
      message: error.message || "Internal server error",
    });
  }
  }
);

export default router;
