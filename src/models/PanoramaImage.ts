import mongoose, { Schema, Document } from "mongoose";

export interface IPanoramaImage extends Document {
  filename: string;
  filePath: string;
  fileSize: number; // in bytes
  mimeType: string;
  isBookmarked: boolean;

  // For search and filter
  name: string;
  description?: string;
  tags?: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const PanoramaImageSchema: Schema = new Schema(
  {
    filename: {
      type: String,
      required: true,
      unique: true,
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
    isBookmarked: {
      type: Boolean,
      default: false,
      index: true, // Indexed for filtering by bookmark status
    },

    // For search and filter
    name: {
      type: String,
      required: true,
      trim: true,
      index: true, // Indexed for search performance
    },
    tags: [{ type: Schema.Types.ObjectId, ref: "Tag" }],
    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for search and filter combinations
PanoramaImageSchema.index({ name: "text" });
PanoramaImageSchema.index({ isBookmarked: 1, createdAt: -1 });

const PanoramaImage = mongoose.model<IPanoramaImage>(
  "PanoramaImage",
  PanoramaImageSchema
);

export default PanoramaImage;
