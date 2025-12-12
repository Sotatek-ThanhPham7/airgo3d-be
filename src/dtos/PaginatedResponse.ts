export class PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;

  constructor(page: number, limit: number, total: number) {
    this.page = page;
    this.limit = limit;
    this.total = total;
    this.totalPages = Math.ceil(total / limit);
  }
}

export class PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;

  constructor(data: T[], page: number, limit: number, total: number) {
    this.data = data;
    this.pagination = new PaginationMeta(page, limit, total);
  }
}
