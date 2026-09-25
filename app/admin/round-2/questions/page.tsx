"use client";

import { useState, useEffect } from "react";
import {
  FileText,
  Upload,
  Trash2,
  Download,
  AlertCircle,
  CheckCircle2,
  Paperclip,
  Plus,
  X,
  FileIcon,
} from "lucide-react";

interface Attachment {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  storageUrl: string;
  uploadedAt: string;
}

interface Question {
  id: string;
  title: string;
  description: string;
  answer: string;
  points: number;
  difficulty: string;
  category: string;
}

export default function AdminRound2QuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchQuestions();
  }, []);

  useEffect(() => {
    if (selectedQuestion) {
      fetchAttachments(selectedQuestion.id);
    }
  }, [selectedQuestion]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      // Fetch Round 2 questions - you may need to adjust this endpoint based on your setup
      const res = await fetch("/api/admin/questions?roundNumber=2");
      if (!res.ok) throw new Error("Failed to fetch questions");
      
      const data = await res.json();
      setQuestions(data.questions || []);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
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
      // Step 1: Upload file to storage
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

      // Step 2: Create attachment record
      const attachRes = await fetch("/api/admin/round-2/attachments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: selectedQuestion.id,
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
      fetchAttachments(selectedQuestion.id);
      
      // Reset file input
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
        fetchAttachments(selectedQuestion.id);
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
      {/* Header */}
      <div className="border-b border-slate-800 pb-6">
        <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest block">
          ROUND 2 MANAGEMENT
        </span>
        <h1 className="text-2xl font-bold font-mono text-white">Question Attachments</h1>
        <p className="text-sm text-slate-400 mt-2">
          Upload files for Round 2 questions (PDF, ZIP, PCAP, etc.)
        </p>
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
              <FileText className="w-4 h-4 text-cyan-400" />
              Round 2 Questions
            </h3>
          </div>
          <div className="overflow-y-auto max-h-[600px]">
            {loading ? (
              <div className="p-8 text-center text-slate-500 font-mono text-sm">
                Loading questions...
              </div>
            ) : questions.length === 0 ? (
              <div className="p-8 text-center text-slate-500 font-mono text-sm">
                No Round 2 questions found
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {questions.map((q) => (
                  <button
                    key={q.id}
                    onClick={() => setSelectedQuestion(q)}
                    className={`w-full text-left p-3 rounded-lg transition-all ${
                      selectedQuestion?.id === q.id
                        ? 'bg-cyan-500/20 border border-cyan-500/50'
                        : 'bg-slate-950/50 border border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-mono text-sm text-white font-bold truncate">
                      {q.title}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                      <span>{q.points} pts</span>
                      <span>•</span>
                      <span>{q.difficulty}</span>
                    </div>
                  </button>
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
                  {selectedQuestion.description}
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
    </div>
  );
}
