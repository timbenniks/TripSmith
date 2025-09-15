"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  Users,
  MapPin,
  Download,
  Share2,
  MessageCircle,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
} from "lucide-react";

interface AnalyticsData {
  overview: {
    totalUsers: number;
    activeUsers?: number;
    totalTrips: number;
    totalExports: number;
    totalShares: number;
    totalMessages: number;
  };
  userGrowth?: {
    date: string;
    users: number;
    trips: number;
  }[];
  topDestinations?: {
    destination: string;
    count: number;
    percentage: number;
  }[];
  conversionFunnel?: {
    stage: string;
    users: number;
    percentage: number;
  }[];
}

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d");

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/analytics?period=${timeRange}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to load analytics");
      const json = await res.json();
      setData(json as AnalyticsData);
    } catch (error) {
      console.error("Failed to load analytics:", error);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-white/10 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <Activity className="h-12 w-12 text-white/40 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">
          Failed to load analytics
        </h3>
        <p className="text-white/60 mb-4">
          There was an error loading the analytics data.
        </p>
        <Button
          onClick={loadAnalytics}
          variant="outline"
          className="border-white/20 text-white"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Analytics Dashboard</h2>
          <p className="text-white/60 mt-1">
            User behavior and system performance insights
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={timeRange}
            onChange={(e) =>
              setTimeRange(e.target.value as "7d" | "30d" | "90d")
            }
            className="bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard
          title="Total Users"
          value={data.overview.totalUsers}
          subtitle={`${data.overview.activeUsers} active`}
          icon={Users}
          color="blue"
        />
        <MetricCard
          title="Total Trips"
          value={data.overview.totalTrips}
          subtitle="All time"
          icon={MapPin}
          color="green"
        />
        <MetricCard
          title="Exports Generated"
          value={data.overview.totalExports}
          subtitle="PDF + ICS files"
          icon={Download}
          color="purple"
        />
        <MetricCard
          title="Shares Created"
          value={data.overview.totalShares}
          subtitle="Public links"
          icon={Share2}
          color="pink"
        />
        <MetricCard
          title="Chat Messages"
          value={data.overview.totalMessages}
          subtitle="Total interactions"
          icon={MessageCircle}
          color="orange"
        />
        {!!data.overview.activeUsers && (
          <MetricCard
            title="Active Users"
            value={data.overview.activeUsers}
            subtitle={`in ${timeRange}`}
            icon={TrendingUp}
            color="cyan"
          />
        )}
      </div>

      {/* Charts Row (still mocked for now) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <Card className="p-6 bg-black/20 backdrop-blur-sm border-white/10">
          <h3 className="text-lg font-semibold mb-4 flex items-center text-white">
            <BarChart3 className="h-5 w-5 mr-2 text-blue-400" />
            User Growth Trend
          </h3>
          <div className="h-64 flex items-end justify-between space-x-1">
            {(data.userGrowth || []).map((day, index) => (
              <div key={day.date} className="flex flex-col items-center flex-1">
                <div className="w-full space-y-1">
                  <div
                    className="bg-blue-500/80 rounded-t"
                    style={{ height: `${(day.users / 250) * 100}px` }}
                  ></div>
                  <div
                    className="bg-purple-500/80 rounded-b"
                    style={{ height: `${(day.trips / 150) * 100}px` }}
                  ></div>
                </div>
                <span className="text-xs text-white/60 mt-2">
                  {new Date(day.date).getDate()}
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center space-x-6 mt-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span className="text-sm text-white/80">Users</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-purple-500 rounded"></div>
              <span className="text-sm text-white/80">Trips</span>
            </div>
          </div>
        </Card>

        {/* Top Destinations */}
        <Card className="p-6 bg-black/20 backdrop-blur-sm border-white/10">
          <h3 className="text-lg font-semibold mb-4 flex items-center text-white">
            <PieChart className="h-5 w-5 mr-2 text-green-400" />
            Top Destinations
          </h3>
          <div className="space-y-3">
            {(data.topDestinations || []).map((dest, index) => (
              <div
                key={dest.destination}
                className="flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-white/80 w-4">
                    {index + 1}
                  </span>
                  <span className="text-sm text-white">{dest.destination}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-20 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-400 to-blue-500 rounded-full"
                      style={{ width: `${dest.percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-white/60 w-8">
                    {dest.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Conversion Funnel */}
      <Card className="p-6 bg-black/20 backdrop-blur-sm border-white/10">
        <h3 className="text-lg font-semibold mb-4 flex items-center text-white">
          <TrendingUp className="h-5 w-5 mr-2 text-yellow-400" />
          Conversion Funnel
        </h3>
        <div className="space-y-4">
          {(data.conversionFunnel || []).map((stage, index) => (
            <div key={stage.stage} className="relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white">
                  {stage.stage}
                </span>
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-white/80">
                    {stage.users.toLocaleString()}
                  </span>
                  <span className="text-sm text-white/60">
                    ({stage.percentage.toFixed(1)}%)
                  </span>
                </div>
              </div>
              <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                  style={{ width: `${stage.percentage}%` }}
                ></div>
              </div>
              {index < (data.conversionFunnel || []).length - 1 && (
                <div className="absolute left-6 top-full w-px h-4 bg-white/20"></div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: number | string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: MetricCardProps) {
  const getColorClasses = (color: string) => {
    const colors = {
      blue: "text-blue-400",
      green: "text-green-400",
      purple: "text-purple-400",
      pink: "text-pink-400",
      orange: "text-orange-400",
      cyan: "text-cyan-400",
    };
    return colors[color as keyof typeof colors] || "text-gray-400";
  };

  return (
    <Card className="p-6 bg-black/20 backdrop-blur-sm border-white/10">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-white/60">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-sm text-white/60">{subtitle}</p>
        </div>
        <Icon className={`h-8 w-8 ${getColorClasses(color)}`} />
      </div>
    </Card>
  );
}
