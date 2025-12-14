import { IsString, IsNotEmpty, IsOptional } from "class-validator";

export class PresignedUrlRequest {
  @IsString({ message: "fileName must be a string" })
  @IsNotEmpty({ message: "fileName is required" })
  fileName!: string;

  @IsString({ message: "contentType must be a string" })
  @IsNotEmpty({ message: "contentType is required" })
  contentType!: string;

  @IsString({ message: "prefix must be a string" })
  @IsOptional()
  prefix?: string = "images";
}
