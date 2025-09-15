"use client";

import React, { useState } from "react";
import { User } from "@supabase/supabase-js";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  TrendingUp,
  Activity,
  MapPin,
  Download,
  Share2,
  MessageCircle,
  AlertTriangle,
  Clock,
  CheckCircle,
} from "lucide-react";
import { useAnalytics } from "@/lib/analytics";
import { UserManagement } from "./user-management";
import { AnalyticsDashboard } from "./analytics-dashboard";
import { SystemMonitoring } from "./system-monitoring";

interface AdminDashboardProps {
  user: User;
}

type TabType = "overview" | "users" | "analytics" | "system";

export default function AdminDashboard({ user }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const { track } = useAnalytics();

  // Track admin dashboard access
  React.useEffect(() => {
    track("page_view", {
      feature_used: "admin_dashboard",
      user_id: user.id,
    });
  }, [track, user.id]);

  const tabs = [
    { id: "overview" as TabType, label: "Overview", icon: TrendingUp },
    { id: "users" as TabType, label: "Users", icon: Users },
    { id: "analytics" as TabType, label: "Analytics", icon: Activity },
    { id: "system" as TabType, label: "System", icon: AlertTriangle },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">TripSmith Admin Dashboard</h1>
              <p className="text-white/60 mt-1">
                System administration and analytics
              </p>
            </div>
            <div className="text-sm text-white/60">
              Welcome, {user.email} (Admin)
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-white/10 bg-black/10 backdrop-blur-sm">
        <div className="container mx-auto px-6">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-2 border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? "border-purple-400 text-purple-300"
                      : "border-transparent text-white/60 hover:text-white hover:border-white/30"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-8">
        {activeTab === "overview" && <OverviewTab />}
        {activeTab === "users" && <UserManagement />}
        {activeTab === "analytics" && <AnalyticsDashboard />}
        {activeTab === "system" && <SystemMonitoring />}
      </div>
    </div>
  );
}

type Period = "7d" | "30d" | "90d";

interface UsersStats {
  total: number;
  active_7d: number;
  active_30d: number;
  active_90d: number;
}
interface TripsStats {
  total: number;
  created_7d: number;
  created_30d: number;
}
interface SharesStats {
  total: number;
  created_7d: number;
  created_30d: number;
}
interface ExportsStats {
  pdf_total: number;
  ics_total: number;
}

function OverviewTab() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [users, setUsers] = React.useState<UsersStats | null>(null);
  const [trips, setTrips] = React.useState<TripsStats | null>(null);
  const [shares, setShares] = React.useState<SharesStats | null>(null);
  const [period, setPeriod] = React.useState<Period>("30d");
  const [exportsStats, setExportsStats] = React.useState<ExportsStats | null>(
    null
  );

  const format = (n: number | undefined | null) =>
    typeof n === "number" ? n.toLocaleString() : "—";

  const loadAll = React.useCallback(async (selectedPeriod: Period) => {
    setError(null);
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        fetch("/api/admin/overview/users", { cache: "no-store" }),
        fetch("/api/admin/overview/trips", { cache: "no-store" }),
        fetch("/api/admin/overview/shares", { cache: "no-store" }),
        fetch(`/api/admin/overview/exports?period=${selectedPeriod}`, {
          cache: "no-store",
        }),
      ]);

      const [uRes, tRes, sRes, eRes] = results.map((r) =>
        r.status === "fulfilled" ? r.value : null
      );

      if (uRes && uRes.ok) setUsers(await uRes.json());
      if (tRes && tRes.ok) setTrips(await tRes.json());
      if (sRes && sRes.ok) setShares(await sRes.json());
      if (eRes && eRes.ok) setExportsStats(await eRes.json());

      const anyError = [uRes, tRes, sRes, eRes].some((res) => !res || !res.ok);
      if (anyError) setError("Some metrics failed to load");
    } catch (err: any) {
      setError(err?.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadAll(period);
  }, [loadAll, period]);

  return (
    <div className="space-y-6">
      {/* Period selector for Exports */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-white/60">Overview metrics</div>
        <div className="inline-flex rounded-lg overflow-hidden border border-white/10 bg-white/5">
          {(["7d", "30d", "90d"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-sm transition-colors ${
                period === p
                  ? "bg-purple-500/20 text-purple-200"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={format(users?.total)}
          icon={Users}
          positive
        />
        <StatCard
          title="Total Trips"
          value={format(trips?.total)}
          icon={MapPin}
          positive
        />
        <StatCard
          title={`Exports (${period})`}
          value={format(
            (exportsStats?.pdf_total || 0) + (exportsStats?.ics_total || 0)
          )}
          icon={Download}
          positive
        />
        <StatCard
          title="Shares Created"
          value={format(shares?.total)}
          icon={Share2}
          positive
        />
      </div>

      {loading && (
        <Card className="p-6 bg-black/20 backdrop-blur-sm border-white/10">
          <p className="text-white/80">Loading overview…</p>
        </Card>
      )}

      {error && !loading && (
        <Card className="p-6 bg-black/20 backdrop-blur-sm border-white/10">
          <p className="text-red-300">{error}</p>
        </Card>
      )}

      {/* Recent Activity (placeholder until endpoint exists) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 bg-black/20 backdrop-blur-sm border-white/10">
          <h3 className="text-lg font-semibold mb-4 flex items-center text-white">
            <Clock className="h-5 w-5 mr-2 text-purple-400" />
            Recent Activity
          </h3>
          <div className="space-y-3">
            <ActivityItem
              type="trip_created"
              description="User created new trip"
              timestamp="—"
            />
            <ActivityItem
              type="export"
              description="Export generated"
              timestamp="—"
            />
            <ActivityItem
              type="share"
              description="Trip shared via link"
              timestamp="—"
            />
            <ActivityItem
              type="signup"
              description="New user registered"
              timestamp="—"
            />
          </div>
        </Card>

        <Card className="p-6 bg-black/20 backdrop-blur-sm border-white/10">
          <h3 className="text-lg font-semibold mb-4 flex items-center text-white">
            <CheckCircle className="h-5 w-5 mr-2 text-green-400" />
            System Status
          </h3>
          <div className="space-y-3">
            <StatusItem service="API" status="operational" />
            <StatusItem service="Database" status="operational" />
            <StatusItem service="Authentication" status="operational" />
            <StatusItem service="File Storage" status="operational" />
          </div>
        </Card>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  icon: React.ComponentType<{ className?: string }>;
  positive: boolean;
}

function StatCard({
  title,
  value,
  change,
  icon: Icon,
  positive,
}: StatCardProps) {
  return (
    <Card className="p-6 bg-black/20 backdrop-blur-sm border-white/10">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-white/60">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {typeof change === "string" && (
            <p
              className={`text-sm ${
                positive ? "text-green-400" : "text-red-400"
              }`}
            >
              {change} from last month
            </p>
          )}
        </div>
        <Icon className="h-8 w-8 text-purple-400" />
      </div>
    </Card>
  );
}

interface ActivityItemProps {
  type: string;
  description: string;
  timestamp: string;
}

function ActivityItem({ type, description, timestamp }: ActivityItemProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case "trip_created":
        return <MapPin className="h-4 w-4 text-blue-400" />;
      case "export":
        return <Download className="h-4 w-4 text-green-400" />;
      case "share":
        return <Share2 className="h-4 w-4 text-purple-400" />;
      case "signup":
        return <Users className="h-4 w-4 text-yellow-400" />;
      default:
        return <Activity className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="flex items-center space-x-3 p-3 rounded-lg bg-white/5">
      {getIcon(type)}
      <div className="flex-1">
        <p className="text-sm text-white">{description}</p>
        <p className="text-xs text-white/60">{timestamp}</p>
      </div>
    </div>
  );
}

interface StatusItemProps {
  service: string;
  status: "operational" | "degraded" | "down";
}

function StatusItem({ service, status }: StatusItemProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "operational":
        return "text-green-400";
      case "degraded":
        return "text-yellow-400";
      case "down":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  const getStatusDot = (status: string) => {
    const color =
      status === "operational"
        ? "bg-green-400"
        : status === "degraded"
        ? "bg-yellow-400"
        : "bg-red-400";
    return <div className={`w-2 h-2 rounded-full ${color}`} />;
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
      <span className="text-sm text-white">{service}</span>
      <div className="flex items-center space-x-2">
        {getStatusDot(status)}
        <span className={`text-sm capitalize ${getStatusColor(status)}`}>
          {status}
        </span>
      </div>
    </div>
  );
}
