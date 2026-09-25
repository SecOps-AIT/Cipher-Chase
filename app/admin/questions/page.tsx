"use client";

import { useState, useEffect } from "react";
import {
  FileQuestion,
  Plus,
  Trash2,
  Clock,
  Eye,
  EyeOff,
  AlertCircle,
  X,
  Tag,
  Lightbulb,
} from "lucide-react";

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Answer reveal toggle state per question
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({});

  // New question modal state
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [answer, setAnswer] = useState("");
  const [points, setPoints] = useState(100);
  const [difficulty, setDifficulty] = useState("MEDIUM");
  const [category, setCategory] = useState("Web Security");
  const [releaseMinutesFromNow, setReleaseMinutesFromNow] = useState(0);
  const [durationMinutes, setDurationMinutes] = useState(20);
  const [createLoading, setCreateLoading] = useState(false);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);

  const fetchQuestions = async () => {
    try {
      const res = await fetch("/api/admin/questions");
      if (!res.ok) throw new Error("Failed to load questions");
      const data = await res.json();
      setQuestions(data.questions || []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setError(null);

    const now = new Date();
    const releaseAt = new Date(now.getTime() + releaseMinutesFromNow * 60 * 1000);
    const closeAt = new Date(releaseAt.getTime() + durationMinutes * 60 * 1000);

    try {
      const attachmentUrls: string[] = [];
      for (const file of attachmentFiles) {
        const uploadForm = new FormData();
        uploadForm.append("file", file);
        const upload = await fetch("/api/admin/questions/upload", { method: "POST", body: uploadForm });
        const uploaded = await upload.json();
        if (!upload.ok) throw new Error(uploaded.error || `Could not upload ${file.name}`);
        attachmentUrls.push(uploaded.url);
      }

      const res = await fetch("/api/admin/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: attachmentUrls.length
            ? `${description}\n\nAttachments:\n${attachmentUrls.join("\n")}`
            : description,
          answer,
          points,
          difficulty,
          category,
          releaseAt: releaseAt.toISOString(),
          closeAt: closeAt.toISOString(),
          order: questions.length + 1,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create question");

      setShowModal(false);
      setTitle("");
      setDescription("");
      setAttachmentFiles([]);
      setAnswer("");
      fetchQuestions();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteQuestion = async (id: string, qTitle: string) => {
    if (!confirm(`Delete question "${qTitle}"?`)) return;

    try {
      const res = await fetch(`/api/admin/questions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete question");
      fetchQuestions();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const toggleAnswerReveal = (id: string) => {
    setRevealedAnswers((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest block">
            CHALLENGES
          </span>
          <h1 className="text-2xl font-bold font-mono text-white">QUESTION VAULT</h1>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold font-mono text-xs tracking-wider rounded-xl flex items-center gap-2 transition-all shadow-cyan-glow"
        >
          <Plus className="w-4 h-4" />
          ADD QUESTION
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-3 text-rose-400 text-xs font-mono">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Questions Table */}
      <div className="bg-[#090D16] border border-[#1E293B] rounded-2xl overflow-hidden shadow-xl corner-frame">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#05070B] text-slate-400 uppercase tracking-wider border-b border-[#1E293B]">
              <tr>
                <th className="py-4 px-6">ID & Challenge Title</th>
                <th className="py-4 px-6">Category / Diff</th>
                <th className="py-4 px-6 text-center">Points</th>
                <th className="py-4 px-6 text-center">Solves</th>
                <th className="py-4 px-6">Secret Flag / Answer</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]/70">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    Loading questions...
                  </td>
                </tr>
              ) : questions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No questions created yet.
                  </td>
                </tr>
              ) : (
                questions.map((q) => {
                  const cleanTitle = q.title.replace(/^Q\d+\s*[-—:]\s*/i, "");
                  const isR2 = q.roundNumber === 2;

                  return (
                    <tr key={q.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-[#05070B] border border-cyan-500/30 text-cyan-300 font-bold text-[10px]">
                            {isR2 ? "R2" : `Q${q.order.toString().padStart(2, "0")}`}
                          </span>
                          <span className="font-bold text-white text-sm uppercase">{cleanTitle}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-xs mt-0.5">{q.description}</div>
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 bg-[#05070B] text-slate-300 rounded text-[10px] border border-slate-800">
                            {q.category}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              q.difficulty === "EASY"
                                ? "bg-cyan-950/40 text-cyan-300 border-cyan-500/40"
                                : q.difficulty === "MEDIUM"
                                ? "bg-amber-950/40 text-amber-300 border-amber-500/40"
                                : "bg-rose-950/40 text-rose-300 border-rose-500/40"
                            }`}
                          >
                            {q.difficulty}
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-6 text-center font-black text-cyan-400">
                        +{q.points}
                      </td>

                      <td className="py-4 px-6 text-center font-bold text-slate-300">
                        {q.totalSolves || 0}
                      </td>

                      {/* Secret Flag Reveal for Admin */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <span className="font-mono bg-[#05070B] px-2.5 py-1 rounded border border-slate-800 text-slate-300 text-[11px]">
                            {revealedAnswers[q.id] ? q.answer : "••••••••••••••••"}
                          </span>
                          <button
                            onClick={() => toggleAnswerReveal(q.id)}
                            className="text-slate-400 hover:text-white"
                            title={revealedAnswers[q.id] ? "Hide Answer" : "Reveal Answer"}
                          >
                            {revealedAnswers[q.id] ? (
                              <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => window.open(`/admin/questions/${q.id}/hints`, '_blank')}
                            className="p-2 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Manage Hints"
                          >
                            <Lightbulb className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteQuestion(q.id, q.title)}
                            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Delete Question"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE QUESTION MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative my-8">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-6">
              <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400">
                <FileQuestion className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-mono text-white">ADD CTF CHALLENGE</h3>
                <p className="text-xs text-slate-400">Create a question with automated release windows</p>
              </div>
            </div>

            <form onSubmit={handleCreateQuestion} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-2">
                  Title <span className="text-cyan-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Q16 — SQL Injection Breach"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-2">
                  Description / Prompt <span className="text-cyan-400">*</span>
                </label>
                <textarea
                  placeholder="Challenge details and lore..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-2">Question Attachments</label>
                <input type="file" multiple onChange={(e) => setAttachmentFiles(Array.from(e.target.files || []))} className="w-full text-xs text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-500/15 file:px-3 file:py-2 file:text-cyan-300" />
                <p className="mt-1 text-[11px] text-slate-500">Files are uploaded to the configured Supabase Storage bucket (25 MB per file).</p>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-2">
                  Secret Flag / Answer <span className="text-cyan-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. FLAG{INJECTION_SUCCESSFUL}"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-2">
                    Points
                  </label>
                  <input
                    type="number"
                    value={points}
                    onChange={(e) => setPoints(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-2">
                    Difficulty
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm"
                  >
                    <option value="EASY">EASY</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HARD">HARD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-2">
                    Category
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-2">
                    Release In (Minutes from now)
                  </label>
                  <input
                    type="number"
                    value={releaseMinutesFromNow}
                    onChange={(e) => setReleaseMinutesFromNow(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-2">
                    Active Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-mono text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading || !title.trim() || !answer.trim()}
                  className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs rounded-xl transition-colors disabled:opacity-50"
                >
                  {createLoading ? "Creating..." : "Save Question"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
