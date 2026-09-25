"use client";

import { useState, useEffect } from "react";
import {
  Activity,
  Shield,
  Users,
  Zap,
  Filter,
  RefreshCw,
  Calendar,
  User,
  FileText,
  AlertCircle,
} from "lucide-react";

interface ActivityLogEntry {
  id: string;
  eventId: string | null;
  teamId: string | null;
  memberId: string | null;
  actor: string;
  action: string;
  target: string | null;
  metadata: any;
  createdAt: string;
}

interface ActivityStats {
  totalActivities: number;
  adminActions: number;
  teamActions: number;
  systemActions: number;
  recentActivityCount: number;
}

export default function AdminActivityPage() {
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Filters
  const [actorFilter, setActorFilter] = useState<string>("");
  const [actionFilter, setActionFilter] = useState<string>("");

  useEffect(() => {
    fetchActivities();

    if (autoRefresh) {
      const interval = setInterval(fetchActivities, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh, actorFilter, actionFilter]);

  const fetchActivities = async () => {
    try {
      const params = new URLSearchParams();
      params.append("limit", "50");
      if (actorFilter) params.append("actor", actorFilter);
      if (actionFilter) params.append("action", actionFilter);

      const res = await fetch(`/api/admin/activity?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch activity logs");

      const data = await res.json();
      setActivities(data.activities || []);
      setStats(data.stats || null);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getActorIcon = (actor: string) => {
    switch (actor) {
      case "ADMIN":
        return <Shield className="w-4 h-4 text-purple-400" />;
      case "TEAM":
        return <Users className="w-4 h-4 text-cyan-400" />;
      case "SYSTEM":
        return <Zap className="w-4 h-4 text-amber-400" />;
      default:
        return <User className="w-4 h-4 text-slate-400" />;
    }
  };

  const getActorColor = (actor: string) => {
    switch (actor) {
      case "ADMIN":
        return "bg-purple-500/20 text-purple-300 border-purple-500/30";
      case "TEAM":
        return "bg-cyan-500/20 text-cyan-300 border-cyan-500/30";
      case "SYSTEM":
        return "bg-amber-500/20 text-amber-300 border-amber-500/30";
      default:
        return "bg-slate-500/20 text-slate-300 border-slate-500/30";
    }
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);

    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    return date.toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-6">
        <div>
          <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest block">
            SECURITY & MONITORING
          </span>
          <h1 className="text-2xl font-bold font-mono text-white flex items-center gap-3">
            <Activity className="w-7 h-7 text-cyan-400" />
            Activity Log
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            Track all admin actions, team activities, and system events
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-4 py-2 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-2 ${
              autoRefresh
                ? "bg-emerald-500/20 border border-emerald-500/50 text-emerald-400"
                : "bg-slate-800 border border-slate-700 text-slate-400 hover:text-white"
            }`}
          >
            <Activity className={`w-4 h-4 ${autoRefresh ? "animate-pulse" : ""}`} />
            {autoRefresh ? "LIVE" : "PAUSED"}
          </button>

          <button
            onClick={fetchActivities}
            disabled={loading}
            className="px-4 py-2 bg-cyan-500/20 border border-cyan-500/50 hover:bg-cyan-500/30 text-cyan-400 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            REFRESH
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-center gap-3 text-red-300 font-mono text-sm">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="text-xs text-slate-400 mb-1">Total Activities</div>
            <div className="text-2xl font-bold text-white">{stats.totalActivities}</div>
          </div>
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="text-xs text-slate-400 mb-1">Admin Actions</div>
            <div className="text-2xl font-bold text-purple-400">{stats.adminActions}</div>
          </div>
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="text-xs text-slate-400 mb-1">Team Actions</div>
            <div className="text-2xl font-bold text-cyan-400">{stats.teamActions}</div>
          </div>
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="text-xs text-slate-400 mb-1">System Actions</div>
            <div className="text-2xl font-bold text-amber-400">{stats.systemActions}</div>
          </div>
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="text-xs text-slate-400 mb-1">Last 24 Hours</div>
            <div className="text-2xl font-bold text-emerald-400">{stats.recentActivityCount}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <div className="flex-1">
          <select
            value={actorFilter}
            onChange={(e) => setActorFilter(e.target.value)}
            className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Actors</option>
            <option value="ADMIN">Admin Only</option>
            <option value="TEAM">Team Only</option>
            <option value="SYSTEM">System Only</option>
          </select>
        </div>
        <div className="flex-1">
          <input
            type="text"
            placeholder="Filter by action..."
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Activity Log */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            Recent Activities ({activities.length})
          </h3>
        </div>

        <div className="overflow-y-auto max-h-[600px]">
          {loading && activities.length === 0 ? (
            <div className="p-8 text-center text-slate-500 font-mono text-sm">
              Loading activities...
            </div>
          ) : activities.length === 0 ? (
            <div className="p-8 text-center text-slate-500 font-mono text-sm">
              No activities found
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="p-4 hover:bg-slate-950/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {/* Actor Badge */}
                    <div className="shrink-0">
                      {getActorIcon(activity.actor)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${getActorColor(
                            activity.actor
                          )}`}
                        >
                          {activity.actor}
                        </span>
                        <span className="text-sm font-mono font-bold text-white">
                          {activity.action}
                        </span>
                        {activity.target && (
                          <span className="text-xs text-slate-400">→ {activity.target}</span>
                        )}
                      </div>

                      {/* Metadata */}
                      {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                        <div className="mt-2 p-2 bg-slate-950 border border-slate-800 rounded text-xs font-mono text-slate-400">
                          {JSON.stringify(activity.metadata, null, 2)}
                        </div>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div className="shrink-0 text-xs text-slate-500 font-mono flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatTimestamp(activity.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
