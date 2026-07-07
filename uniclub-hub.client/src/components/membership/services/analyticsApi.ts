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

export interface PostStatItem {
  id: number;
  title: string;
  status: string;
  category: string;
  createdAt: string;
}

export interface ContentStats {
  totalPosts: number;
  publishedPosts: number;
  pendingPosts: number;
  draftPosts: number;
  rejectedPosts: number;
  totalMedia: number;
  imageCount: number;
  videoCount: number;
  recentPosts: PostStatItem[];
}

const base = (clubId: number) => `/clubs/${clubId}/analytics`;

export const getAnalyticsOverview = (clubId: number) =>
  api.get<{ data: AnalyticsOverview }>(`${base(clubId)}/overview`);

export const getDailyViews = (clubId: number, days = 30) =>
  api.get<{ data: DailyView[] }>(`${base(clubId)}/daily-views`, {
    params: { days },
  });

export const getContentStats = (clubId: number) =>
  api.get<{ data: ContentStats }>(`${base(clubId)}/content-stats`);
