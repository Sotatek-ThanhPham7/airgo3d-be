import mongoose, { Schema, Document } from "mongoose";

export interface IPanoramaImage extends Document {
  name: string;
  filename: string;
  originalFilename: string;
  filePath: string;
  fileSize: number; // in bytes
  mimeType: string;
  width?: number;
  height?: number;
  isBookmarked: boolean;
  uploadedAt: Date;
  updatedAt: Date;
  metadata?: {
    camera?: string;
    location?: string;
    tags?: string[];
    description?: string;
    [key: string]: any; // for additional custom metadata
  };
}

const PanoramaImageSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true, // Indexed for search performance
    },
    filename: {
      type: String,
      required: true,
      unique: true,
    },
    originalFilename: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
      min: 0,
    },
    mimeType: {
      type: String,
      required: true,
      enum: ["image/jpeg", "image/png", "image/jpg", "image/webp"],
    },
    width: {
      type: Number,
      min: 0,
    },
    height: {
      type: Number,
      min: 0,
    },
    isBookmarked: {
      type: Boolean,
      default: false,
      index: true, // Indexed for filtering by bookmark status
    },
    metadata: {
      camera: String,
      location: String,
      tags: [String],
      description: String,
    },
  },
  {
    timestamps: true, // Automatically adds uploadedAt and updatedAt
  }
);

// Compound index for search and filter combinations
PanoramaImageSchema.index({ name: "text" }); // Text search on name
PanoramaImageSchema.index({ isBookmarked: 1, uploadedAt: -1 }); // For filtering and sorting

const PanoramaImage = mongoose.model<IPanoramaImage>(
  "PanoramaImage",
  PanoramaImageSchema
);

export default PanoramaImage;

