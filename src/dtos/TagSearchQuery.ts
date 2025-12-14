import { IsString, IsNotEmpty } from "class-validator";

export class TagSearchQuery {
  @IsString({ message: "q must be a string" })
  @IsNotEmpty({ message: "q must be a non-empty string" })
  q!: string;
}
