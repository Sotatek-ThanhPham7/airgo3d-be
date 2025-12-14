import { IsMongoId } from "class-validator";

export class MongoIdParam {
  @IsMongoId({ message: "id must be a valid MongoDB ObjectId" })
  id!: string;
}
