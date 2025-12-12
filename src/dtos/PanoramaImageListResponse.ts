import { PaginatedResponse } from "./PaginatedResponse";
import { IPanoramaImage } from "../models/PanoramaImage";

export class PanoramaImageItemDto {
  _id: string;
  name: string;
  filename: string;
  originalFilename: string;
  filePath: string;
  s3Url?: string;
  fileSize: number;
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
    [key: string]: any;
  };

  constructor(panoramaImage: IPanoramaImage | any) {
    this._id = panoramaImage._id?.toString() || panoramaImage.id?.toString();
    this.name = panoramaImage.name;
    this.filename = panoramaImage.filename;
    this.originalFilename = panoramaImage.originalFilename;
    this.filePath = panoramaImage.filePath;
    this.s3Url = panoramaImage.s3Url;
    this.fileSize = panoramaImage.fileSize;
    this.mimeType = panoramaImage.mimeType;
    this.width = panoramaImage.width;
    this.height = panoramaImage.height;
    this.isBookmarked = panoramaImage.isBookmarked;
    this.uploadedAt = panoramaImage.uploadedAt;
    this.updatedAt = panoramaImage.updatedAt;
    this.metadata = panoramaImage.metadata;
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
