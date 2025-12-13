export interface TimeSeriesDataPoint {
  date: string;
  bookmarked: number;
  unbookmarked: number;
  total: number;
}

export interface BookmarkAnalyticsSummary {
  totalImages: number;
  bookmarkedCount: number;
  unbookmarkedCount: number;
  bookmarkedPercentage: number;
  unbookmarkedPercentage: number;
}

export class BookmarkAnalyticsResponse {
  summary: BookmarkAnalyticsSummary;
  timeSeries: TimeSeriesDataPoint[];
  period: string;
  startDate?: Date;
  endDate?: Date;

  constructor(
    summary: BookmarkAnalyticsSummary,
    timeSeries: TimeSeriesDataPoint[],
    period: string,
    startDate?: Date,
    endDate?: Date
  ) {
    this.summary = summary;
    this.timeSeries = timeSeries;
    this.period = period;
    this.startDate = startDate;
    this.endDate = endDate;
  }
}

