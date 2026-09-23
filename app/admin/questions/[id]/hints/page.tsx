"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Lightbulb,
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  X,
} from "lucide-react";

interface Hint {
  id?: string;
  title: string;
  content: string;
  cost: number;
  order: number;
}

interface QuestionData {
  questionId: string;
  questionTitle: string;
  hints: Hint[];
}

export default function AdminQuestionHintsPage() {
  const params = useParams();
  const questionId = params.id as string;

  const [questionData, setQuestionData] = useState<QuestionData | null>(null);
  const [hints, setHints] = useState<Hint[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const loadHints = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/questions/${questionId}/hints`);
      if (res.ok) {
        const data = await res.json();
        setQuestionData(data);
        setHints(data.hints || []);
      } else {
        throw new Error("Failed to load hints");
      }
    } catch (error: any) {
      setFeedback({ type: "error", message: error.message });
    } finally {
      setLoading(false);
    }
  }, [questionId]);

  useEffect(() => {
    loadHints();
  }, [loadHints]);

  const addHint = () => {
    const newOrder = hints.length > 0 ? Math.max(...hints.map(h => h.order)) + 1 : 1;
    setHints([...hints, {
      title: `Hint #${newOrder}`,
      content: "",
      cost: 2,
      order: newOrder
    }]);
  };

  const updateHint = (index: number, field: keyof Hint, value: string | number) => {
    const updatedHints = [...hints];
    updatedHints[index] = { ...updatedHints[index], [field]: value };
    setHints(updatedHints);
  };

  const removeHint = (index: number) => {
    const updatedHints = hints.filter((_, i) => i !== index);
    // Reorder the remaining hints
    const reorderedHints = updatedHints.map((hint, i) => ({
      ...hint,
      order: i + 1
    }));
    setHints(reorderedHints);
  };

  const saveHints = async () => {
    if (!questionData) return;
    
    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/admin/questions/${questionId}/hints`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hints })
      });

      const data = await res.json();
      
      if (res.ok) {
        setFeedback({ type: "success", message: data.message });
        // Reload to get updated IDs
        await loadHints();
      } else {
        throw new Error(data.error || "Failed to save hints");
      }
    } catch (error: any) {
      setFeedback({ type: "error", message: error.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cyber-darker text-slate-100 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400 font-mono">Loading hints...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cyber-darker text-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/questions"
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <Lightbulb className="w-6 h-6 text-amber-400" />
                Manage Hints
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                {questionData?.questionTitle || `Question ${questionId}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={addHint}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-mono text-xs rounded-xl flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              ADD HINT
            </button>
            <button
              onClick={saveHints}
              disabled={saving}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-mono text-xs rounded-xl flex items-center gap-2 transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? "SAVING..." : "SAVE ALL"}
            </button>
          </div>
        </div>

        {/* Feedback */}
        {feedback && (
          <div
            className={`mb-6 p-4 rounded-xl border flex items-center gap-3 ${
              feedback.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"
                : "bg-rose-500/10 border-rose-500/40 text-rose-300"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span className="font-mono text-sm">{feedback.message}</span>
            <button
              onClick={() => setFeedback(null)}
              className="ml-auto text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Hints List */}
        <div className="space-y-6">
          {hints.length === 0 ? (
            <div className="text-center py-12">
              <Lightbulb className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 font-mono">No hints configured</p>
              <p className="text-slate-500 text-sm mt-2">
                Add hints to help teams solve this question
              </p>
            </div>
          ) : (
            hints.map((hint, index) => (
              <div
                key={index}
                className="bg-slate-900 border border-slate-700 rounded-xl p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/10 px-2 py-1 rounded">
                    HINT #{hint.order}
                  </span>
                  <button
                    onClick={() => removeHint(index)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                    title="Remove Hint"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono text-slate-400 uppercase mb-2">
                        Hint Title
                      </label>
                      <input
                        type="text"
                        value={hint.title}
                        onChange={(e) => updateHint(index, "title", e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none"
                        placeholder="Enter hint title"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-slate-400 uppercase mb-2">
                        Cost (Wallet Points)
                      </label>
                      <input
                        type="number"
                        value={hint.cost}
                        onChange={(e) => updateHint(index, "cost", parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none"
                        min="1"
                        max="20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 uppercase mb-2">
                      Hint Content
                    </label>
                    <textarea
                      value={hint.content}
                      onChange={(e) => updateHint(index, "content", e.target.value)}
                      rows={3}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none resize-none"
                      placeholder="Enter the hint content that will be revealed to teams..."
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Instructions */}
        <div className="mt-8 p-4 bg-slate-950/50 border border-slate-800 rounded-xl">
          <h3 className="text-sm font-bold text-white mb-2">Instructions</h3>
          <ul className="text-xs text-slate-400 space-y-1">
            <li>• Hints are ordered automatically and shown to teams in sequence</li>
            <li>• Teams must spend wallet points to claim hints</li>
            <li>• Typical hint costs range from 1-5 points (default: 2 points)</li>
            <li>• Hint content is only revealed after teams claim the hint</li>
            <li>• Changes are saved immediately when you click &quot;Save All&quot;</li>
          </ul>
        </div>
      </div>
    </div>
  );
}