export interface CreatePanoramaImageRequest {
  key: string; // S3 object key/path from the upload
  name: string; // Display name for the image
  originalFilename: string; // Original filename from client
  fileSize: number; // File size in bytes
  mimeType: string; // MIME type (must match enum: image/jpeg, image/png, image/jpg, image/webp)
  width?: number; // Image width in pixels
  height?: number; // Image height in pixels
  metadata?: {
    camera?: string;
    location?: string;
    tags?: string[];
    description?: string;
    [key: string]: any; // for additional custom metadata
  };
}

