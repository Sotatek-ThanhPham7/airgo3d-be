// models/Tag.ts
import mongoose, { Schema, Document } from "mongoose";

export interface ITag extends Document {
  name: string; // single name used for display and search (case-sensitive)
  createdAt: Date;
  updatedAt: Date;
}

const TagSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

TagSchema.index({ name: 1 }, { unique: true });

const Tag = mongoose.model<ITag>("Tag", TagSchema);
export default Tag;
