import { IsOptional, IsEnum, IsDateString } from "class-validator";

export class AnalyticsQuery {
  @IsOptional()
  @IsDateString({}, { message: "startDate must be a valid ISO date string" })
  startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: "endDate must be a valid ISO date string" })
  endDate?: string;

  @IsOptional()
  @IsEnum(["day", "week", "month"], {
    message: "period must be one of: day, week, month",
  })
  period?: "day" | "week" | "month" = "day";
}
