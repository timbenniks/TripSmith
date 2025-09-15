"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Server,
  Database,
  Shield,
  HardDrive,
  Wifi,
  RefreshCw,
} from "lucide-react";

interface SystemHealth {
  status: "healthy" | "warning" | "critical";
  services: {
    name: string;
    status: "operational" | "degraded" | "down";
    responseTime: number;
    uptime: number;
    lastCheck: string;
  }[];
  metrics: {
    apiRequests: {
      total: number;
      successful: number;
      failed: number;
      avgResponseTime: number;
    };
    database: {
      connections: number;
      maxConnections: number;
      queryTime: number;
    };
  };
  recentEvents: {
    timestamp: string;
    type: "info" | "warning" | "error";
    message: string;
    service?: string;
  }[];
}

export function SystemMonitoring() {
  const [data, setData] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadSystemHealth();

    if (autoRefresh) {
      const interval = setInterval(loadSystemHealth, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const loadSystemHealth = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/system", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load system health");
      const json = await res.json();
      setData(json as SystemHealth);
    } catch (error) {
      console.error("Failed to load system health:", error);
    } finally {
      setLoading(false);
    }
  };

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "operational":
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case "degraded":
        return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
      case "down":
        return <AlertTriangle className="h-4 w-4 text-red-400" />;
      default:
        return <Activity className="h-4 w-4 text-gray-400" />;
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else {
      const diffInHours = Math.floor(diffInMinutes / 60);
      return `${diffInHours}h ago`;
    }
  };

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-64 bg-white/10 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <Server className="h-12 w-12 text-white/40 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">
          Failed to load system health
        </h3>
        <p className="text-white/60 mb-4">
          There was an error loading the system monitoring data.
        </p>
        <Button
          onClick={loadSystemHealth}
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
          <h2 className="text-2xl font-bold text-white">System Monitoring</h2>
          <p className="text-white/60 mt-1">
            Real-time system health and performance
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            onClick={() => setAutoRefresh(!autoRefresh)}
            variant="outline"
            size="sm"
            className={`border-white/20 ${
              autoRefresh ? "text-green-400 border-green-400/50" : "text-white"
            }`}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${autoRefresh ? "animate-spin" : ""}`}
            />
            Auto-refresh {autoRefresh ? "ON" : "OFF"}
          </Button>
          <Button
            onClick={loadSystemHealth}
            variant="outline"
            size="sm"
            className="border-white/20 text-white"
            disabled={loading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall Status */}
      <Card className="p-6 bg-black/20 backdrop-blur-sm border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center ${
                data.status === "healthy"
                  ? "bg-green-500/20"
                  : data.status === "warning"
                  ? "bg-yellow-500/20"
                  : "bg-red-500/20"
              }`}
            >
              {data.status === "healthy" ? (
                <CheckCircle className="h-6 w-6 text-green-400" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-yellow-400" />
              )}
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">
                System Status:{" "}
                <span
                  className={`capitalize ${
                    data.status === "healthy"
                      ? "text-green-400"
                      : data.status === "warning"
                      ? "text-yellow-400"
                      : "text-red-400"
                  }`}
                >
                  {data.status}
                </span>
              </h3>
              <p className="text-white/60">All core services monitored</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-white/60">Last updated</p>
            <p className="text-sm text-white">
              {formatTime(new Date().toISOString())}
            </p>
          </div>
        </div>
      </Card>

      {/* Services and Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Services Status */}
        <Card className="p-6 bg-black/20 backdrop-blur-sm border-white/10">
          <h3 className="text-lg font-semibold mb-4 flex items-center text-white">
            <Server className="h-5 w-5 mr-2 text-blue-400" />
            Service Status
          </h3>
          <div className="space-y-4">
            {data.services.map((service) => (
              <div
                key={service.name}
                className="flex items-center justify-between p-3 rounded-lg bg-white/5"
              >
                <div className="flex items-center space-x-3">
                  {getStatusIcon(service.status)}
                  <div>
                    <p className="text-sm font-medium text-white">
                      {service.name}
                    </p>
                    <p className="text-xs text-white/60">
                      {service.responseTime}ms • {service.uptime}% uptime
                    </p>
                  </div>
                </div>
                <span
                  className={`text-sm capitalize ${getStatusColor(
                    service.status
                  )}`}
                >
                  {service.status}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Key Metrics */}
        <Card className="p-6 bg-black/20 backdrop-blur-sm border-white/10">
          <h3 className="text-lg font-semibold mb-4 flex items-center text-white">
            <Activity className="h-5 w-5 mr-2 text-purple-400" />
            Key Metrics
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
              <div className="flex items-center space-x-3">
                <Wifi className="h-4 w-4 text-blue-400" />
                <div>
                  <p className="text-sm font-medium text-white">API Requests</p>
                  <p className="text-xs text-white/60">
                    {(
                      (data.metrics.apiRequests.successful /
                        data.metrics.apiRequests.total) *
                      100
                    ).toFixed(1)}
                    % success rate
                  </p>
                </div>
              </div>
              <span className="text-sm text-white">
                {data.metrics.apiRequests.total.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
              <div className="flex items-center space-x-3">
                <Database className="h-4 w-4 text-green-400" />
                <div>
                  <p className="text-sm font-medium text-white">Database</p>
                  <p className="text-xs text-white/60">
                    {data.metrics.database.connections}/
                    {data.metrics.database.maxConnections} connections
                  </p>
                </div>
              </div>
              <span className="text-sm text-white">
                {data.metrics.database.queryTime}ms
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Events */}
      <Card className="p-6 bg-black/20 backdrop-blur-sm border-white/10">
        <h3 className="text-lg font-semibold mb-4 flex items-center text-white">
          <Clock className="h-5 w-5 mr-2 text-orange-400" />
          Recent Events
        </h3>
        <div className="space-y-3">
          {data.recentEvents.map((event, index) => (
            <div
              key={index}
              className="flex items-start space-x-3 p-3 rounded-lg bg-white/5"
            >
              <div
                className={`w-2 h-2 rounded-full mt-2 ${
                  event.type === "info"
                    ? "bg-blue-400"
                    : event.type === "warning"
                    ? "bg-yellow-400"
                    : "bg-red-400"
                }`}
              ></div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-white">{event.message}</p>
                  <span className="text-xs text-white/60">
                    {formatTime(event.timestamp)}
                  </span>
                </div>
                {event.service && (
                  <p className="text-xs text-white/60 mt-1">
                    Service: {event.service}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
