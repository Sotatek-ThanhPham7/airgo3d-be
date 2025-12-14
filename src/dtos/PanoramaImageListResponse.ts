import { PaginatedResponse } from "./PaginatedResponse";
import { IPanoramaImage } from "../models/PanoramaImage";

export class PanoramaImageItemDto {
  _id: string;
  name: string;
  filename: string;
  filePath: string;
  s3Url?: string;
  fileSize: number;
  mimeType: string;
  isBookmarked: boolean;
  description?: string;
  tags?: Array<{ _id: string; name: string }>;
  createdAt: Date;
  updatedAt: Date;

  constructor(panoramaImage: IPanoramaImage | any) {
    this._id = panoramaImage._id?.toString() || panoramaImage.id?.toString();
    this.name = panoramaImage.name;
    this.filename = panoramaImage.filename;
    this.filePath = panoramaImage.filePath;
    this.s3Url = panoramaImage.s3Url;
    this.fileSize = panoramaImage.fileSize;
    this.mimeType = panoramaImage.mimeType;
    this.isBookmarked = panoramaImage.isBookmarked;
    this.description = panoramaImage.description;
    this.createdAt = panoramaImage.createdAt;
    this.updatedAt = panoramaImage.updatedAt;

    // Handle tags - can be populated (objects) or ObjectIds
    if (panoramaImage.tags && Array.isArray(panoramaImage.tags)) {
      this.tags = panoramaImage.tags
        .map((tag: any) => {
          if (typeof tag === "object" && tag._id && tag.name) {
            return {
              _id: tag._id.toString(),
              name: tag.name,
            };
          }
          return null;
        })
        .filter((tag: any) => tag !== null);
    }
  }
}

export class PanoramaImageListResponse extends PaginatedResponse<PanoramaImageItemDto> {
  constructor(
    data: PanoramaImageItemDto[],
    page: number,
    limit: number,
    total: number
  ) {
    super(data, page, limit, total);
  }
}
