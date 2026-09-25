"use client";

import { useState, useEffect, useRef } from "react";
import { History, Filter, RefreshCw } from "lucide-react";

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actorFilter, setActorFilter] = useState("");
  const [actionQuery, setActionQuery] = useState("");

  const inFlightRef = useRef(false);

  const fetchLogs = async () => {
    // Skip this tick if the previous request hasn't resolved yet — prevents
    // requests piling up unboundedly when the DB round-trip is slower than
    // the poll interval (e.g. cross-region latency).
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const params = new URLSearchParams();
      if (actorFilter) params.set("actor", actorFilter);
      if (actionQuery) params.set("action", actionQuery);
      params.set("limit", "150");

      const res = await fetch(`/api/admin/audit?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actorFilter, actionQuery]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest block">
            AUDITABILITY & COMPLIANCE
          </span>
          <h1 className="text-2xl font-bold font-mono text-white">SYSTEM AUDIT LOGS</h1>
        </div>

        <button
          onClick={fetchLogs}
          className="p-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-xl transition-colors"
          title="Refresh Logs"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <Filter className="w-4 h-4 text-cyan-400" />
          <span>FILTERS:</span>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-mono text-slate-400">Actor:</label>
          <select
            value={actorFilter}
            onChange={(e) => setActorFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-xs"
          >
            <option value="">All Actors</option>
            <option value="ADMIN">ADMIN</option>
            <option value="TEAM">TEAM</option>
            <option value="SYSTEM">SYSTEM</option>
          </select>
        </div>

        <div className="flex items-center gap-2 flex-1 max-w-xs">
          <input
            type="text"
            placeholder="Search action or keyword..."
            value={actionQuery}
            onChange={(e) => setActionQuery(e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
          />
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-6">Timestamp</th>
                <th className="py-3.5 px-6">Actor</th>
                <th className="py-3.5 px-6">Action</th>
                <th className="py-3.5 px-6">Event Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-500">
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-500">
                    No matching audit records found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-6 text-slate-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleTimeString()} •{" "}
                      {new Date(log.createdAt).toLocaleDateString()}
                    </td>

                    <td className="py-3.5 px-6">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.actor === "ADMIN"
                            ? "bg-purple-500/20 text-purple-300"
                            : log.actor === "TEAM"
                            ? "bg-cyan-500/20 text-cyan-300"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {log.actor}
                      </span>
                    </td>

                    <td className="py-3.5 px-6 font-bold text-white whitespace-nowrap">
                      {log.action}
                    </td>

                    <td className="py-3.5 px-6 text-slate-300 font-sans text-xs">
                      {log.details || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
