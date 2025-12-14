import { IsString, IsOptional, IsInt, Min, Max } from "class-validator";
import { Type } from "class-transformer";

export class TagSearchQuery {
  @IsOptional()
  @IsString({ message: "q must be a string" })
  q?: string;

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
}
