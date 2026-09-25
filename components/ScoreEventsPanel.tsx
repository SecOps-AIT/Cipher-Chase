"use client";

import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Clock, Info } from "lucide-react";

interface ScoreEvent {
  id: string;
  type: string;
  points: number;
  reason: string;
  timestamp: string;
  metadata?: any;
}

export function ScoreEventsPanel() {
  const [events, setEvents] = useState<ScoreEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
    // Refresh every 5 seconds
    const interval = setInterval(fetchEvents, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await fetch("/api/team/score-events?limit=10");
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error("Failed to fetch score events:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const getEventIcon = (type: string, points: number) => {
    if (type === "HINT_PENALTY") {
      return <TrendingDown className="w-4 h-4 text-rose-400" />;
    } else if (points > 0) {
      return <TrendingUp className="w-4 h-4 text-emerald-400" />;
    } else if (points < 0) {
      return <TrendingDown className="w-4 h-4 text-rose-400" />;
    }
    return <Info className="w-4 h-4 text-slate-400" />;
  };

  const getEventColor = (points: number) => {
    if (points > 0) return "text-emerald-400";
    if (points < 0) return "text-rose-400";
    return "text-slate-400";
  };

  if (loading) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-mono font-bold text-slate-300 uppercase tracking-wider">
            Score Activity
          </h3>
        </div>
        <div className="text-sm text-slate-500 text-center py-4">Loading...</div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-mono font-bold text-slate-300 uppercase tracking-wider">
            Score Activity
          </h3>
        </div>
        <div className="text-sm text-slate-500 text-center py-4">
          No activity yet
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-slate-400" />
        <h3 className="text-sm font-mono font-bold text-slate-300 uppercase tracking-wider">
          Recent Score Activity
        </h3>
      </div>

      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
        {events.map((event) => (
          <div
            key={event.id}
            className="flex items-start gap-3 p-2.5 bg-slate-950/60 border border-slate-800/50 rounded-lg hover:border-slate-700/50 transition-colors"
          >
            <div className="mt-0.5">{getEventIcon(event.type, event.points)}</div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-xs text-slate-300 font-medium leading-tight">
                  {event.reason}
                </p>
                <span
                  className={`text-xs font-mono font-bold whitespace-nowrap ${getEventColor(
                    event.points
                  )}`}
                >
                  {event.points > 0 ? "+" : ""}
                  {event.points}
                </span>
              </div>
              
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-slate-500 font-mono">
                  {formatTime(event.timestamp)}
                </span>
                
                {event.type === "HINT_PENALTY" && (
                  <span className="text-[9px] px-1.5 py-0.5 bg-rose-500/10 text-rose-400 rounded border border-rose-500/20 font-mono uppercase">
                    Hint
                  </span>
                )}
                
                {event.type === "ROUND1_CORRECT" && (
                  <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20 font-mono uppercase">
                    Round 1
                  </span>
                )}
                
                {event.type === "ROUND_2_SOLVE" && (
                  <span className="text-[9px] px-1.5 py-0.5 bg-cyan-500/10 text-cyan-400 rounded border border-cyan-500/20 font-mono uppercase">
                    Round 2
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
