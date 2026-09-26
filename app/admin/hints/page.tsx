"use client";

import { useState, useEffect } from "react";
import { Lightbulb, Plus, AlertCircle, CheckCircle2, TrendingDown, History } from "lucide-react";

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

interface HintLogEntry {
  id: string;
  teamName: string;
  round: number | null;
  questionTitle: string | null;
  penalty: number;
  reason: string;
  recordedBy: string | null;
  createdAt: string;
}

interface AuctionQuestionOption {
  id: string;
  questionId: string;
  title: string;
  hintPenalty: number;
}

const ROUND1_HINT_PENALTY = 10;

export default function AdminHintsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [stats, setStats] = useState<HintStats | null>(null);
  const [log, setLog] = useState<HintLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [auctionQuestions, setAuctionQuestions] = useState<AuctionQuestionOption[]>([]);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [selectedRound, setSelectedRound] = useState<1 | 2>(1);
  const [selectedQuestionId, setSelectedQuestionId] = useState("");
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
      setLog(data.log || []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuctionQuestions = async () => {
    try {
      const res = await fetch("/api/admin/auction/questions");
      if (!res.ok) return;
      const data = await res.json();
      setAuctionQuestions(
        (data.auctionQuestions || []).map((q: any) => ({
          id: q.id,
          questionId: q.questionId,
          title: q.title,
          hintPenalty: q.hintPenalty,
        }))
      );
    } catch {
      // Non-fatal — the round selector will just show no questions to pick.
    }
  };

  const openModal = () => {
    fetchAuctionQuestions();
    setSelectedQuestionId("");
    setShowModal(true);
  };

  const selectedQuestion = auctionQuestions.find((q) => q.questionId === selectedQuestionId);
  const currentPenaltyPreview = selectedRound === 1
    ? ROUND1_HINT_PENALTY
    : (selectedQuestion ? Math.abs(selectedQuestion.hintPenalty) : null);

  const handleRecordHint = async () => {
    if (!selectedTeamId) {
      setSubmitMessage({ type: 'error', text: 'Please select a team' });
      return;
    }
    if (selectedRound === 2 && !selectedQuestionId) {
      setSubmitMessage({ type: 'error', text: 'Please select which Round 2 question the hint was for' });
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
          questionId: selectedRound === 2 ? selectedQuestionId : undefined,
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
        setSelectedQuestionId("");
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
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-slate-400 font-mono text-sm">Loading hint statistics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest block">
            SCORING
          </span>
          <h1 className="text-2xl font-bold font-mono text-white flex items-center gap-3">
            <Lightbulb className="w-6 h-6 text-yellow-400" />
            MANUAL HINT MANAGEMENT
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Record hints given to teams verbally/in-person — penalty is fixed for Round 1, per-question for Round 2.
          </p>
        </div>
        <button
          onClick={openModal}
          className="px-5 py-2.5 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-slate-950 font-bold font-mono text-xs tracking-wider rounded-xl flex items-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" />
          RECORD HINT
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/50 rounded-xl flex items-center gap-3 text-rose-300 text-xs font-mono">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary Stats */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-1">Total Teams</div>
            <div className="text-3xl font-bold font-mono text-cyan-400">{stats.totalTeams}</div>
          </div>
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-1">Total Hints Given</div>
            <div className="text-3xl font-bold font-mono text-yellow-400">{stats.totalHintsGiven}</div>
          </div>
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-1">Total Penalty Points</div>
            <div className="text-3xl font-bold font-mono text-rose-400">-{stats.totalPenaltyPoints}</div>
          </div>
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-1">Avg Hints / Team</div>
            <div className="text-3xl font-bold font-mono text-purple-400">{stats.averageHintsPerTeam.toFixed(1)}</div>
          </div>
        </div>
      )}

      {/* Teams Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-800">
          <h2 className="text-sm font-bold font-mono text-white uppercase tracking-wider">Team Hint Totals</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Team Name</th>
                <th className="px-6 py-4 text-center">Round 1</th>
                <th className="px-6 py-4 text-center">Round 2</th>
                <th className="px-6 py-4 text-center">Total Hints</th>
                <th className="px-6 py-4 text-center">Total Penalty</th>
                <th className="px-6 py-4 text-center">Current Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {teams.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                    No teams found
                  </td>
                </tr>
              ) : (
                teams.map((team) => (
                  <tr key={team.teamId} className="hover:bg-slate-950/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-white">{team.teamName}</td>
                    <td className="px-6 py-4 text-center text-yellow-400 font-bold">{team.hintsR1}</td>
                    <td className="px-6 py-4 text-center text-yellow-400 font-bold">{team.hintsR2}</td>
                    <td className="px-6 py-4 text-center text-cyan-400 font-bold">{team.totalHints}</td>
                    <td className="px-6 py-4 text-center text-rose-400 font-bold">-{team.totalPenalty}</td>
                    <td className="px-6 py-4 text-center text-emerald-400 font-bold">{team.currentScore}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hint Log */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex items-center gap-2">
          <History className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-bold font-mono text-white uppercase tracking-wider">Hint Log</h2>
        </div>
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider sticky top-0">
              <tr>
                <th className="px-6 py-3">Time</th>
                <th className="px-6 py-3">Team</th>
                <th className="px-6 py-3">Round</th>
                <th className="px-6 py-3">Question</th>
                <th className="px-6 py-3 text-center">Penalty</th>
                <th className="px-6 py-3">Recorded By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {log.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                    No hints recorded yet.
                  </td>
                </tr>
              ) : (
                log.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-950/50 transition-colors">
                    <td className="px-6 py-3 text-slate-400 whitespace-nowrap">
                      {new Date(entry.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-white font-bold">{entry.teamName}</td>
                    <td className="px-6 py-3 text-slate-300">
                      {entry.round ? `Round ${entry.round}` : "—"}
                    </td>
                    <td className="px-6 py-3 text-slate-300 truncate max-w-[220px]">
                      {entry.questionTitle || "—"}
                    </td>
                    <td className="px-6 py-3 text-center text-rose-400 font-bold">-{entry.penalty}</td>
                    <td className="px-6 py-3 text-slate-400">{entry.recordedBy || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Hint Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold font-mono text-white flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-yellow-400" />
                RECORD MANUAL HINT
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
                <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-2">
                  Select Team
                </label>
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-cyan-400"
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
                <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-2">
                  Round
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setSelectedRound(1); setSelectedQuestionId(""); }}
                    className={`flex-1 py-2.5 rounded-xl font-mono text-xs font-bold transition-all ${
                      selectedRound === 1
                        ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950"
                        : "bg-slate-950 border border-slate-700 text-slate-400 hover:text-white"
                    }`}
                  >
                    ROUND 1
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRound(2)}
                    className={`flex-1 py-2.5 rounded-xl font-mono text-xs font-bold transition-all ${
                      selectedRound === 2
                        ? "bg-gradient-to-r from-purple-500 to-pink-600 text-slate-950"
                        : "bg-slate-950 border border-slate-700 text-slate-400 hover:text-white"
                    }`}
                  >
                    ROUND 2
                  </button>
                </div>
              </div>

              {/* Round 2 Question Picker */}
              {selectedRound === 2 && (
                <div>
                  <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-2">
                    Question <span className="text-cyan-400">*</span>
                  </label>
                  <select
                    value={selectedQuestionId}
                    onChange={(e) => setSelectedQuestionId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-cyan-400"
                  >
                    <option value="">-- Choose a question --</option>
                    {auctionQuestions.map((q) => (
                      <option key={q.id} value={q.questionId}>
                        {q.title} (-{Math.abs(q.hintPenalty)} pts)
                      </option>
                    ))}
                  </select>
                  {auctionQuestions.length === 0 && (
                    <p className="mt-1 text-[11px] text-slate-500">
                      No Round 2 questions found — add one from Questions Bank first.
                    </p>
                  )}
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={hintDescription}
                  onChange={(e) => setHintDescription(e.target.value)}
                  placeholder="e.g., Hint about Q03 - steganography technique"
                  rows={3}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm placeholder-slate-600 focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Penalty Preview */}
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/50 rounded-xl flex items-center gap-3">
                <TrendingDown className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="text-xs font-mono">
                  {currentPenaltyPreview !== null ? (
                    <>
                      <span className="font-bold text-amber-200">-{currentPenaltyPreview} points</span>
                      <span className="text-amber-300"> will be deducted from the team's score</span>
                    </>
                  ) : (
                    <span className="text-amber-300">Select a question to see the penalty</span>
                  )}
                </div>
              </div>

              {/* Submit Message */}
              {submitMessage && (
                <div className={`p-3.5 rounded-xl flex items-center gap-3 ${
                  submitMessage.type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/50'
                    : 'bg-rose-500/10 border border-rose-500/50'
                }`}>
                  {submitMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span className={`text-xs font-mono ${submitMessage.type === 'success' ? 'text-emerald-200' : 'text-rose-200'}`}>
                    {submitMessage.text}
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setSubmitMessage(null);
                  }}
                  className="flex-1 py-2.5 bg-slate-950 border border-slate-700 text-slate-300 hover:text-white font-mono text-xs font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRecordHint}
                  disabled={submitting || !selectedTeamId || (selectedRound === 2 && !selectedQuestionId)}
                  className="flex-1 py-2.5 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 text-slate-950 font-mono text-xs font-bold rounded-xl transition-all"
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
