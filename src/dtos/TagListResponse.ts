import { PaginatedResponse } from "./PaginatedResponse";
import { ITag } from "../models/Tag";

export class TagItemDto {
  _id: string;
  name: string;

  constructor(tag: ITag | any) {
    this._id = tag._id?.toString() || tag.id?.toString();
    this.name = tag.name;
  }
}

export class TagListResponse extends PaginatedResponse<TagItemDto> {
  constructor(
    data: TagItemDto[],
    page: number,
    limit: number,
    total: number
  ) {
    super(data, page, limit, total);
  }
}
