"use client";

import { useState, useEffect } from "react";
import { Lightbulb, Plus, AlertCircle, CheckCircle2, TrendingDown } from "lucide-react";

interface Team {
  teamId: string;
  teamName: string;
  hintsR1: number;
  hintsR2: number;
  totalHints: number;
  totalPenalty: number;
  currentScore: number;
}

interface HintStats {
  totalTeams: number;
  totalHintsGiven: number;
  totalPenaltyPoints: number;
  averageHintsPerTeam: number;
}

export default function AdminHintsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [stats, setStats] = useState<HintStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [selectedRound, setSelectedRound] = useState<1 | 2>(1);
  const [hintDescription, setHintDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchHintStats();
  }, []);

  const fetchHintStats = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/hints/record");
      if (!res.ok) throw new Error("Failed to fetch hint stats");
      
      const data = await res.json();
      setStats(data.summary);
      setTeams(data.teams);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordHint = async () => {
    if (!selectedTeamId) {
      setSubmitMessage({ type: 'error', text: 'Please select a team' });
      return;
    }

    try {
      setSubmitting(true);
      setSubmitMessage(null);

      const res = await fetch("/api/admin/hints/record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: selectedTeamId,
          round: selectedRound,
          description: hintDescription || undefined
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to record hint");
      }

      setSubmitMessage({ type: 'success', text: data.message });
      
      // Refresh stats
      await fetchHintStats();
      
      // Reset form after short delay
      setTimeout(() => {
        setShowModal(false);
        setSelectedTeamId("");
        setHintDescription("");
        setSubmitMessage(null);
      }, 1500);

    } catch (err: any) {
      setSubmitMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading hint statistics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-mono flex items-center gap-3">
              <Lightbulb className="w-8 h-8 text-yellow-400" />
              Manual Hint Management
            </h1>
            <p className="text-slate-400 mt-2">Record hints given to teams (-5 points each)</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl flex items-center gap-2 transition-all"
          >
            <Plus className="w-5 h-5" />
            Record Hint
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span className="text-red-200">{error}</span>
          </div>
        )}

        {/* Summary Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl">
              <div className="text-sm text-slate-400 mb-1">Total Teams</div>
              <div className="text-3xl font-bold text-cyan-400">{stats.totalTeams}</div>
            </div>
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl">
              <div className="text-sm text-slate-400 mb-1">Total Hints Given</div>
              <div className="text-3xl font-bold text-yellow-400">{stats.totalHintsGiven}</div>
            </div>
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl">
              <div className="text-sm text-slate-400 mb-1">Total Penalty Points</div>
              <div className="text-3xl font-bold text-red-400">-{stats.totalPenaltyPoints}</div>
            </div>
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl">
              <div className="text-sm text-slate-400 mb-1">Avg Hints/Team</div>
              <div className="text-3xl font-bold text-purple-400">{stats.averageHintsPerTeam.toFixed(1)}</div>
            </div>
          </div>
        )}

        {/* Teams Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-slate-800">
            <h2 className="text-xl font-bold font-mono">Team Hint Statistics</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-950 text-left">
                  <th className="px-6 py-4 text-sm font-semibold text-slate-300">Team Name</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-300 text-center">Round 1</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-300 text-center">Round 2</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-300 text-center">Total Hints</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-300 text-center">Total Penalty</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-300 text-center">Current Score</th>
                </tr>
              </thead>
              <tbody>
                {teams.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                      No teams found
                    </td>
                  </tr>
                ) : (
                  teams.map((team) => (
                    <tr key={team.teamId} className="border-t border-slate-800 hover:bg-slate-950/50 transition-colors">
                      <td className="px-6 py-4 font-mono text-slate-200">{team.teamName}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-yellow-400 font-bold">{team.hintsR1}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-yellow-400 font-bold">{team.hintsR2}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-cyan-400 font-bold">{team.totalHints}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-red-400 font-bold">-{team.totalPenalty}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-emerald-400 font-bold">{team.currentScore}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Record Hint Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold font-mono flex items-center gap-2">
                <Lightbulb className="w-6 h-6 text-yellow-400" />
                Record Manual Hint
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSubmitMessage(null);
                }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Team Selection */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Select Team
                </label>
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                >
                  <option value="">-- Choose a team --</option>
                  {teams.map((team) => (
                    <option key={team.teamId} value={team.teamId}>
                      {team.teamName} (Score: {team.currentScore})
                    </option>
                  ))}
                </select>
              </div>

              {/* Round Selection */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Round
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setSelectedRound(1)}
                    className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                      selectedRound === 1
                        ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950"
                        : "bg-slate-950 border border-slate-700 text-slate-400 hover:text-white"
                    }`}
                  >
                    Round 1
                  </button>
                  <button
                    onClick={() => setSelectedRound(2)}
                    className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                      selectedRound === 2
                        ? "bg-gradient-to-r from-purple-500 to-pink-600 text-slate-950"
                        : "bg-slate-950 border border-slate-700 text-slate-400 hover:text-white"
                    }`}
                  >
                    Round 2
                  </button>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={hintDescription}
                  onChange={(e) => setHintDescription(e.target.value)}
                  placeholder="e.g., Hint about Q03 - steganography technique"
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>

              {/* Penalty Warning */}
              <div className="p-4 bg-amber-500/10 border border-amber-500/50 rounded-xl flex items-center gap-3">
                <TrendingDown className="w-5 h-5 text-amber-400 shrink-0" />
                <div className="text-sm">
                  <span className="font-bold text-amber-200">-5 points</span>
                  <span className="text-amber-300"> will be deducted from the team's score</span>
                </div>
              </div>

              {/* Submit Message */}
              {submitMessage && (
                <div className={`p-4 rounded-xl flex items-center gap-3 ${
                  submitMessage.type === 'success' 
                    ? 'bg-emerald-500/10 border border-emerald-500/50'
                    : 'bg-red-500/10 border border-red-500/50'
                }`}>
                  {submitMessage.type === 'success' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-400" />
                  )}
                  <span className={submitMessage.type === 'success' ? 'text-emerald-200' : 'text-red-200'}>
                    {submitMessage.text}
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSubmitMessage(null);
                  }}
                  className="flex-1 py-3 bg-slate-950 border border-slate-700 text-slate-300 hover:text-white font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRecordHint}
                  disabled={submitting || !selectedTeamId}
                  className="flex-1 py-3 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 text-slate-950 font-bold rounded-xl transition-all"
                >
                  {submitting ? "Recording..." : "Record Hint"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
