import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsEnum,
  IsOptional,
  IsArray,
  ArrayMinSize,
} from "class-validator";

export class CreatePanoramaImageRequest {
  @IsString()
  @IsNotEmpty({ message: "key must be a non-empty string" })
  key!: string; // S3 object key/path from the upload

  @IsString()
  @IsNotEmpty({ message: "name must be a non-empty string" })
  name!: string; // Display name for the image

  @IsNumber({}, { message: "fileSize must be a number" })
  @Min(0, { message: "fileSize must be a non-negative number" })
  fileSize!: number; // File size in bytes

  @IsEnum(
    ["image/jpeg", "image/png", "image/jpg", "image/webp"],
    {
      message:
        "mimeType must be one of: image/jpeg, image/png, image/jpg, image/webp",
    }
  )
  mimeType!: string; // MIME type

  @IsString()
  @IsOptional()
  description?: string; // Optional description for the image

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[]; // Optional array of tag names (will be created if they don't exist)
}

