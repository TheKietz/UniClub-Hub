import api from "@/lib/axiosInstance";

export interface AnalyticsOverview {
  totalViews: number;
  viewsThisWeek: number;
  viewsLastWeek: number;
  viewsThisMonth: number;
  viewsLastMonth: number;
  avgViewsPerDay: number;
  weeklyGrowthPercent: number;
  monthlyGrowthPercent: number;
}

export interface DailyView {
  date: string;
  count: number;
}

const base = (clubId: number) => `/clubs/${clubId}/analytics`;

export const getAnalyticsOverview = (clubId: number) =>
  api.get<{ data: AnalyticsOverview }>(`${base(clubId)}/overview`);

export const getDailyViews = (clubId: number, days = 30) =>
  api.get<{ data: DailyView[] }>(`${base(clubId)}/daily-views`, {
    params: { days },
  });
