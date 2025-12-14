import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsString,
  IsArray,
} from "class-validator";
import { Transform, Type } from "class-transformer";

export class SearchPanoramaImageQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "page must be an integer" })
  @Min(1, { message: "page must be a positive integer" })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "limit must be an integer" })
  @Min(1, { message: "limit must be at least 1" })
  @Max(100, { message: "limit must be at most 100" })
  limit?: number = 10;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === "true" || value === "1" || value === true) return true;
    if (value === "false" || value === "0" || value === false) return false;
    return value;
  })
  @IsBoolean({ message: "isBookmarked must be a boolean" })
  isBookmarked?: boolean;

  @IsOptional()
  @IsString({ message: "search must be a string" })
  search?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === "string") {
      return value.split(",").map((tag) => tag.trim()).filter((tag) => tag.length > 0);
    }
    if (Array.isArray(value)) {
      return value.map((tag) => String(tag).trim()).filter((tag) => tag.length > 0);
    }
    return value;
  })
  @IsArray({ message: "tags must be an array" })
  @IsString({ each: true, message: "Each tag must be a string" })
  tags?: string[];
}
