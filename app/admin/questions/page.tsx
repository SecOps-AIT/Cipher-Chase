"use client";

import { useState, useEffect } from "react";
import {
  FileQuestion,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  X,
  Lightbulb,
  Edit,
  Gavel,
  Upload,
  Download,
  Paperclip,
  FileIcon,
  FileText,
} from "lucide-react";

type TabKey = "ROUND_1" | "ROUND_2";

interface Attachment {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  storageUrl: string;
  uploadedAt: string;
}

interface AuctionQuestion {
  id: string;
  questionId: string;
  title: string;
  topic: string;
  outline: string;
  baseTimeSeconds: number;
  points: number;
  hintPenalty: number;
  status: string;
  answer?: string;
  difficulty?: string;
  category?: string;
}

export default function AdminQuestionsPage() {
  const [tab, setTab] = useState<TabKey>("ROUND_1");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest block">
            CHALLENGES
          </span>
          <h1 className="text-2xl font-bold font-mono text-white">QUESTION VAULT</h1>
        </div>

        <div className="flex items-center gap-2 bg-[#090D16] border border-[#1E293B] rounded-xl p-1">
          <button
            onClick={() => setTab("ROUND_1")}
            className={`px-4 py-2 rounded-lg font-mono text-xs font-bold tracking-wider transition-colors ${
              tab === "ROUND_1"
                ? "bg-cyan-500 text-slate-950"
                : "text-slate-400 hover:text-white"
            }`}
          >
            ROUND 1
          </button>
          <button
            onClick={() => setTab("ROUND_2")}
            className={`px-4 py-2 rounded-lg font-mono text-xs font-bold tracking-wider transition-colors ${
              tab === "ROUND_2"
                ? "bg-cyan-500 text-slate-950"
                : "text-slate-400 hover:text-white"
            }`}
          >
            ROUND 2 (AUCTION)
          </button>
        </div>
      </div>

      {tab === "ROUND_1" ? <Round1Section /> : <Round2Section />}
    </div>
  );
}

// ============================================================
// ROUND 1 SECTION
// ============================================================

function Round1Section() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({});

  const [showModal, setShowModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [answer, setAnswer] = useState("");
  const [points, setPoints] = useState(100);
  const [difficulty, setDifficulty] = useState("MEDIUM");
  const [category, setCategory] = useState("Web Security");
  const [topic, setTopic] = useState("");
  const [outline, setOutline] = useState("");
  const [hintPenalty, setHintPenalty] = useState(10);
  const [releaseMinutesFromNow, setReleaseMinutesFromNow] = useState(0);
  const [durationMinutes, setDurationMinutes] = useState(20);
  const [createLoading, setCreateLoading] = useState(false);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);

  const fetchQuestions = async () => {
    try {
      const res = await fetch("/api/admin/questions?roundNumber=1");
      if (!res.ok) throw new Error("Failed to load questions");
      const data = await res.json();
      setQuestions((data.questions || []).filter((q: any) => q.roundNumber !== 2));
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

      const payload = {
        title,
        description: attachmentUrls.length
          ? `${description}\n\nAttachments:\n${attachmentUrls.join("\n")}`
          : description,
        answer,
        points,
        difficulty,
        category,
        topic: topic.trim() || null,
        outline: outline.trim() || null,
        hintPenalty,
        releaseAt: releaseAt.toISOString(),
        closeAt: closeAt.toISOString(),
        order: questions.length + 1,
      };

      const url = editingQuestion
        ? `/api/admin/questions/${editingQuestion.id}`
        : "/api/admin/questions";

      const method = editingQuestion ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to ${editingQuestion ? 'update' : 'create'} question`);

      setShowModal(false);
      resetForm();
      fetchQuestions();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  const resetForm = () => {
    setEditingQuestion(null);
    setTitle("");
    setDescription("");
    setAttachmentFiles([]);
    setAnswer("");
    setPoints(100);
    setDifficulty("MEDIUM");
    setCategory("Web Security");
    setTopic("");
    setOutline("");
    setHintPenalty(10);
    setReleaseMinutesFromNow(0);
    setDurationMinutes(20);
  };

  const handleEditQuestion = (q: any) => {
    setEditingQuestion(q);
    setTitle(q.title);
    setDescription(q.description);
    setAnswer(q.answer);
    setPoints(q.points);
    setDifficulty(q.difficulty);
    setCategory(q.category);
    setTopic(q.topic || "");
    setOutline(q.outline || "");
    setHintPenalty(q.hintPenalty || 10);
    setReleaseMinutesFromNow(0);
    setDurationMinutes(20);
    setShowModal(true);
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
      <div className="flex justify-end">
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

                  return (
                    <tr key={q.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-[#05070B] border border-cyan-500/30 text-cyan-300 font-bold text-[10px]">
                            Q{q.order.toString().padStart(2, "0")}
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
                            onClick={() => handleEditQuestion(q)}
                            className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Edit Question"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
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

      {/* CREATE/EDIT QUESTION MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative my-8">
            <button
              onClick={() => { setShowModal(false); resetForm(); }}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-6">
              <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400">
                <FileQuestion className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-mono text-white">
                  {editingQuestion ? "EDIT QUESTION" : "ADD CTF CHALLENGE"}
                </h3>
                <p className="text-xs text-slate-400">
                  {editingQuestion ? "Update question details" : "Create a question with automated release windows"}
                </p>
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
                  Topic
                </label>
                <input
                  type="text"
                  placeholder="e.g. OSINT, Web Exploitation"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-2">
                  Outline
                </label>
                <input
                  type="text"
                  placeholder="e.g. Searching for clues on platforms"
                  value={outline}
                  onChange={(e) => setOutline(e.target.value)}
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

              {!editingQuestion && (
                <div>
                  <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-2">Question Attachments</label>
                  <input type="file" multiple onChange={(e) => setAttachmentFiles(Array.from(e.target.files || []))} className="w-full text-xs text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-500/15 file:px-3 file:py-2 file:text-cyan-300" />
                  <p className="mt-1 text-[11px] text-slate-500">Files are uploaded to the configured Supabase Storage bucket (25 MB per file).</p>
                </div>
              )}

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

              <div className="grid grid-cols-4 gap-3">
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
                    Hint Penalty
                  </label>
                  <input
                    type="number"
                    value={hintPenalty}
                    onChange={(e) => setHintPenalty(parseInt(e.target.value, 10))}
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

              {!editingQuestion && (
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
              )}

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="px-4 py-2 text-xs font-mono text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading || !title.trim() || !answer.trim()}
                  className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs rounded-xl transition-colors disabled:opacity-50"
                >
                  {createLoading ? (editingQuestion ? "Updating..." : "Creating...") : (editingQuestion ? "Update Question" : "Save Question")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// ROUND 2 (AUCTION) SECTION
// ============================================================

function Round2Section() {
  const [questions, setQuestions] = useState<AuctionQuestion[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<AuctionQuestion | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [answer, setAnswer] = useState("");
  const [difficulty, setDifficulty] = useState("MEDIUM");
  const [category, setCategory] = useState("Web Security");
  const [topic, setTopic] = useState("");
  const [outline, setOutline] = useState("");
  const [baseTimeSeconds, setBaseTimeSeconds] = useState(300);
  const [points, setPoints] = useState(200);
  const [hintPenalty, setHintPenalty] = useState(-10);

  useEffect(() => {
    fetchQuestions();
  }, []);

  useEffect(() => {
    if (selectedQuestion) {
      fetchAttachments(selectedQuestion.questionId);
    }
  }, [selectedQuestion]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/auction/questions");
      if (!res.ok) throw new Error("Failed to fetch questions");

      const data = await res.json();
      setQuestions(data.auctionQuestions || []);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setAnswer("");
    setDifficulty("MEDIUM");
    setCategory("Web Security");
    setTopic("");
    setOutline("");
    setBaseTimeSeconds(300);
    setPoints(200);
    setHintPenalty(-10);
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/auction/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          answer,
          difficulty,
          category,
          topic,
          outline,
          baseTimeSeconds,
          points,
          hintPenalty,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create auction question");

      setMessage({ type: 'success', text: `Auction question "${title}" created` });
      setShowModal(false);
      resetForm();
      fetchQuestions();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteQuestion = async (q: AuctionQuestion) => {
    if (!confirm(`Delete auction question "${q.title}"?`)) return;

    try {
      const res = await fetch(`/api/admin/auction/questions?id=${q.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete auction question");

      setMessage({ type: 'success', text: `Auction question "${q.title}" deleted` });
      if (selectedQuestion?.id === q.id) setSelectedQuestion(null);
      fetchQuestions();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const fetchAttachments = async (questionId: string) => {
    try {
      const res = await fetch(`/api/admin/round-2/attachments?questionId=${questionId}`);
      if (!res.ok) throw new Error("Failed to fetch attachments");

      const data = await res.json();
      setAttachments(data.attachments || []);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedQuestion || !e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const maxSize = 25 * 1024 * 1024; // 25MB

    if (file.size > maxSize) {
      setMessage({ type: 'error', text: 'File size exceeds 25MB limit' });
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const uploadForm = new FormData();
      uploadForm.append("file", file);

      const uploadRes = await fetch("/api/admin/questions/upload", {
        method: "POST",
        body: uploadForm,
      });

      if (!uploadRes.ok) {
        const error = await uploadRes.json();
        throw new Error(error.error || "Upload failed");
      }

      const uploaded = await uploadRes.json();

      const attachRes = await fetch("/api/admin/round-2/attachments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: selectedQuestion.questionId,
          filename: uploaded.name,
          originalName: file.name,
          mimeType: file.type,
          fileSize: file.size,
          storageUrl: uploaded.url,
        }),
      });

      if (!attachRes.ok) {
        const error = await attachRes.json();
        throw new Error(error.error || "Failed to add attachment");
      }

      setMessage({ type: 'success', text: `File "${file.name}" uploaded successfully` });
      fetchAttachments(selectedQuestion.questionId);

      e.target.value = "";
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string, filename: string) => {
    if (!confirm(`Delete attachment "${filename}"?`)) return;

    try {
      const res = await fetch(`/api/admin/round-2/attachments?attachmentId=${attachmentId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete attachment");
      }

      setMessage({ type: 'success', text: `Attachment "${filename}" deleted` });
      if (selectedQuestion) {
        fetchAttachments(selectedQuestion.questionId);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold font-mono text-xs tracking-wider rounded-xl flex items-center gap-2 transition-all shadow-cyan-glow"
        >
          <Plus className="w-4 h-4" />
          ADD AUCTION QUESTION
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-xl flex items-center gap-3 ${
          message.type === 'success'
            ? 'bg-emerald-500/10 border border-emerald-500/50 text-emerald-300'
            : 'bg-red-500/10 border border-red-500/50 text-red-300'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400" />
          )}
          <span className="text-sm font-mono">{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            className="ml-auto text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Questions List */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-800">
            <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
              <Gavel className="w-4 h-4 text-cyan-400" />
              Round 2 Auction Questions
            </h3>
          </div>
          <div className="overflow-y-auto max-h-[600px]">
            {loading ? (
              <div className="p-8 text-center text-slate-500 font-mono text-sm">
                Loading questions...
              </div>
            ) : questions.length === 0 ? (
              <div className="p-8 text-center text-slate-500 font-mono text-sm">
                No Round 2 questions found. Click "Add Auction Question" to create one.
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {questions.map((q) => (
                  <div
                    key={q.id}
                    className={`w-full text-left p-3 rounded-lg transition-all cursor-pointer ${
                      selectedQuestion?.id === q.id
                        ? 'bg-cyan-500/20 border border-cyan-500/50'
                        : 'bg-slate-950/50 border border-slate-800 hover:border-slate-700'
                    }`}
                    onClick={() => setSelectedQuestion(q)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-mono text-sm text-white font-bold truncate">
                        {q.title}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteQuestion(q); }}
                        className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded shrink-0"
                        title="Delete Auction Question"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                      <span>{q.points} pts</span>
                      <span>•</span>
                      <span>{q.topic}</span>
                      <span>•</span>
                      <span className={`font-bold ${
                        q.status === "SOLD" ? "text-emerald-400" :
                        q.status === "OPEN" ? "text-amber-400" : "text-slate-500"
                      }`}>{q.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Attachments Panel */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          {selectedQuestion ? (
            <>
              <div className="p-4 border-b border-slate-800">
                <h3 className="text-sm font-bold font-mono text-white">
                  {selectedQuestion.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {selectedQuestion.outline}
                </p>
              </div>

              {/* Upload Section */}
              <div className="p-4 border-b border-slate-800 bg-slate-950/50">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="px-4 py-2 bg-cyan-500/20 border border-cyan-500/50 hover:bg-cyan-500/30 text-cyan-400 rounded-lg font-mono text-xs font-bold transition-all flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    {uploading ? "UPLOADING..." : "UPLOAD FILE"}
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    PDF, ZIP, PCAP, TXT, etc. (Max 25MB)
                  </span>
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="hidden"
                    accept=".pdf,.zip,.pcap,.pcapng,.txt,.md,.json,.xml,.csv,.log"
                  />
                </label>
              </div>

              {/* Attachments List */}
              <div className="p-4">
                {attachments.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 font-mono text-sm">
                    <Paperclip className="w-8 h-8 mx-auto mb-3 text-slate-600" />
                    No attachments yet. Upload files above.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {attachments.map((att) => (
                      <div
                        key={att.id}
                        className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center gap-3 hover:border-slate-700 transition-all"
                      >
                        <FileIcon className="w-5 h-5 text-cyan-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-sm text-white truncate">
                            {att.originalName}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                            <span>{formatFileSize(att.fileSize)}</span>
                            <span>•</span>
                            <span>{new Date(att.uploadedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={att.storageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-all"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => handleDeleteAttachment(att.id, att.originalName)}
                            className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-slate-500 font-mono text-sm">
              <FileText className="w-12 h-12 mx-auto mb-3 text-slate-700" />
              Select a question from the list to manage attachments
            </div>
          )}
        </div>
      </div>

      {/* CREATE AUCTION QUESTION MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative my-8">
            <button
              onClick={() => { setShowModal(false); resetForm(); }}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-6">
              <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400">
                <Gavel className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-mono text-white">ADD AUCTION QUESTION</h3>
                <p className="text-xs text-slate-400">
                  Create a Round 2 challenge. Points are admin-set with no time bonus.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateQuestion} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-2">
                  Title <span className="text-cyan-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Auction 03 — Reverse Engineering"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-2">
                    Topic <span className="text-cyan-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Reverse Engineering"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    required
                    className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-2">
                    Category <span className="text-cyan-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                    className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-2">
                  Outline (shown to teams before bidding) <span className="text-cyan-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Crack the binary to reveal the flag"
                  value={outline}
                  onChange={(e) => setOutline(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-2">
                  Description / Prompt (shown after winning bid) <span className="text-cyan-400">*</span>
                </label>
                <textarea
                  placeholder="Full challenge details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-2">
                  Secret Flag / Answer <span className="text-cyan-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. FLAG{REVERSED_AND_CONQUERED}"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-4 gap-3">
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
                    Hint Penalty
                  </label>
                  <input
                    type="number"
                    value={hintPenalty}
                    onChange={(e) => setHintPenalty(parseInt(e.target.value, 10))}
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
                    Base Time (sec)
                  </label>
                  <input
                    type="number"
                    value={baseTimeSeconds}
                    onChange={(e) => setBaseTimeSeconds(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="px-4 py-2 text-xs font-mono text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading || !title.trim() || !answer.trim() || !topic.trim() || !outline.trim()}
                  className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs rounded-xl transition-colors disabled:opacity-50"
                >
                  {createLoading ? "Creating..." : "Save Auction Question"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
