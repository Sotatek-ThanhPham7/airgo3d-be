import { IsBoolean } from "class-validator";

export class BookmarkUpdateRequest {
  @IsBoolean({ message: "isBookmarked must be a boolean" })
  isBookmarked!: boolean;
}
