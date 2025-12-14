export interface CreatePanoramaImageRequest {
  key: string; // S3 object key/path from the upload
  name: string; // Display name for the image
  fileSize: number; // File size in bytes
  mimeType: string; // MIME type (must match enum: image/jpeg, image/png, image/jpg, image/webp)
  description?: string; // Optional description for the image
  tags?: string[]; // Optional array of tag names (will be created if they don't exist)
}

