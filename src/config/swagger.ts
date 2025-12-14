import * as swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "AirGo3D Backend API",
      version: "1.0.0",
      description: "API documentation for AirGo3D Backend - Panorama Image Management System",
      contact: {
        name: "API Support",
      },
    },
    servers: [
      {
        url: process.env.API_BASE_URL || "http://localhost:3000",
        description: "Development server",
      },
    ],
    components: {
      schemas: {
        Error: {
          type: "object",
          properties: {
            error: {
              type: "string",
              description: "Error message",
            },
            message: {
              type: "string",
              description: "Detailed error message",
            },
          },
        },
        CreatePanoramaImageRequest: {
          type: "object",
          required: ["key", "name", "fileSize", "mimeType"],
          properties: {
            key: {
              type: "string",
              description: "S3 object key/path from the upload",
              example: "images/panorama-123.jpg",
            },
            name: {
              type: "string",
              description: "Display name for the image",
              example: "Beautiful Panorama",
            },
            fileSize: {
              type: "number",
              description: "File size in bytes",
              example: 2048000,
            },
            mimeType: {
              type: "string",
              enum: ["image/jpeg", "image/png", "image/jpg", "image/webp"],
              description: "MIME type of the image",
              example: "image/jpeg",
            },
            description: {
              type: "string",
              description: "Optional description for the image",
              example: "A beautiful panoramic view",
            },
            tags: {
              type: "array",
              items: {
                type: "string",
              },
              description: "Optional array of tag names (will be created if they don't exist)",
              example: ["nature", "landscape", "outdoor"],
            },
          },
        },
        PanoramaImageItem: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              description: "MongoDB document ID",
              example: "507f1f77bcf86cd799439011",
            },
            name: {
              type: "string",
              example: "Beautiful Panorama",
            },
            filename: {
              type: "string",
              example: "panorama-123.jpg",
            },
            filePath: {
              type: "string",
              example: "images/panorama-123.jpg",
            },
            s3Url: {
              type: "string",
              description: "S3 URL (if available)",
              example: "https://bucket.s3.amazonaws.com/images/panorama-123.jpg",
            },
            fileSize: {
              type: "number",
              example: 2048000,
            },
            mimeType: {
              type: "string",
              example: "image/jpeg",
            },
            isBookmarked: {
              type: "boolean",
              example: false,
            },
            description: {
              type: "string",
              example: "A beautiful panoramic view",
            },
            tags: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  _id: {
                    type: "string",
                    example: "507f1f77bcf86cd799439012",
                  },
                  name: {
                    type: "string",
                    example: "nature",
                  },
                },
              },
            },
            createdAt: {
              type: "string",
              format: "date-time",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
            },
          },
        },
        BookmarkUpdateRequest: {
          type: "object",
          required: ["isBookmarked"],
          properties: {
            isBookmarked: {
              type: "boolean",
              description: "Bookmark status (true to bookmark, false to unbookmark)",
              example: true,
            },
          },
        },
        BookmarkAnalyticsSummary: {
          type: "object",
          properties: {
            totalImages: {
              type: "number",
              example: 100,
            },
            bookmarkedCount: {
              type: "number",
              example: 45,
            },
            unbookmarkedCount: {
              type: "number",
              example: 55,
            },
            bookmarkedPercentage: {
              type: "number",
              example: 45.0,
            },
            unbookmarkedPercentage: {
              type: "number",
              example: 55.0,
            },
          },
        },
        TimeSeriesDataPoint: {
          type: "object",
          properties: {
            date: {
              type: "string",
              example: "2024-01-15",
            },
            bookmarked: {
              type: "number",
              example: 5,
            },
            unbookmarked: {
              type: "number",
              example: 10,
            },
            total: {
              type: "number",
              example: 15,
            },
          },
        },
        BookmarkAnalyticsResponse: {
          type: "object",
          properties: {
            summary: {
              $ref: "#/components/schemas/BookmarkAnalyticsSummary",
            },
            timeSeries: {
              type: "array",
              items: {
                $ref: "#/components/schemas/TimeSeriesDataPoint",
              },
            },
            period: {
              type: "string",
              enum: ["day", "week", "month"],
              example: "day",
            },
            startDate: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
            endDate: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
          },
        },
        PresignedUrlRequest: {
          type: "object",
          required: ["fileName", "contentType"],
          properties: {
            fileName: {
              type: "string",
              description: "Name of the file to upload",
              example: "panorama.jpg",
            },
            contentType: {
              type: "string",
              description: "Content type of the file",
              example: "image/jpeg",
            },
            prefix: {
              type: "string",
              description: "Optional prefix/path for the S3 key",
              example: "images",
              default: "images",
            },
          },
        },
        PresignedUrlResponse: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "The presigned URL for uploading",
              example: "https://bucket.s3.amazonaws.com/images/panorama.jpg-uuid?X-Amz-Algorithm=...",
            },
            key: {
              type: "string",
              description: "The auto-generated S3 object key",
              example: "images/panorama.jpg-uuid",
            },
            expiresIn: {
              type: "number",
              description: "Expiration time in seconds",
              example: 300,
            },
          },
        },
        Tag: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              example: "507f1f77bcf86cd799439012",
            },
            name: {
              type: "string",
              example: "nature",
            },
          },
        },
      },
    },
  },
  apis: ["./src/routes/*.ts", "./src/app.ts"],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
