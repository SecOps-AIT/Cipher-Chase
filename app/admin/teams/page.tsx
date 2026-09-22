"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Plus,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  Sparkles,
  AlertCircle,
  X,
  UserPlus,
  UserMinus,
  Edit2,
} from "lucide-react";

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New team modal state
  const [showModal, setShowModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamMembers, setNewTeamMembers] = useState("");
  const [customJoinCode, setCustomJoinCode] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  // Add member modal state
  const [addMemberTeamId, setAddMemberTeamId] = useState<string | null>(null);
  const [addMemberName, setAddMemberName] = useState("");
  const [addMemberLoading, setAddMemberLoading] = useState(false);

  // Copied code feedback
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const fetchTeams = async () => {
    try {
      const res = await fetch("/api/admin/teams");
      if (!res.ok) throw new Error("Failed to load teams");
      const data = await res.json();
      setTeams(data.teams || []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setError(null);

    try {
      const membersArray = newTeamMembers
        .split(",")
        .map((m) => m.trim())
        .filter(Boolean);

      if (membersArray.length > 4) {
        throw new Error("A team can have at most 4 initial members.");
      }

      const res = await fetch("/api/admin/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTeamName.trim(),
          joinCode: customJoinCode.trim() || undefined,
          members: membersArray.length > 0 ? membersArray : ["Team Captain"],
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create team");

      setShowModal(false);
      setNewTeamName("");
      setNewTeamMembers("");
      setCustomJoinCode("");
      fetchTeams();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addMemberTeamId || !addMemberName.trim()) return;

    setAddMemberLoading(true);
    try {
      const res = await fetch(`/api/admin/teams/${addMemberTeamId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ADD_MEMBER",
          memberName: addMemberName.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add member");

      setAddMemberTeamId(null);
      setAddMemberName("");
      fetchTeams();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setAddMemberLoading(false);
    }
  };

  const handleRemoveMember = async (teamId: string, memberId: string, memberName: string) => {
    if (!confirm(`Remove member "${memberName}" from this team?`)) return;

    try {
      const res = await fetch(`/api/admin/teams/${teamId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REMOVE_MEMBER",
          memberId,
        }),
      });
      if (!res.ok) throw new Error("Failed to remove member");
      fetchTeams();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRegenerateCode = async (teamId: string) => {
    if (!confirm("Regenerate join code for this team? Connected devices with old code will need the new code.")) return;

    try {
      const res = await fetch(`/api/admin/teams/${teamId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REGENERATE_CODE" }),
      });
      if (!res.ok) throw new Error("Failed to regenerate code");
      fetchTeams();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    if (!confirm(`Are you sure you want to delete team "${teamName}"? This action cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/admin/teams/${teamId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete team");
      fetchTeams();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest block">
            MANAGEMENT
          </span>
          <h1 className="text-2xl font-bold font-mono text-white">TEAM REGISTRY</h1>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Total Teams: {teams.length} | Capacity: 1–3 members per team
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold font-mono text-xs tracking-wider rounded-xl flex items-center gap-2 transition-all shadow-cyan-glow"
        >
          <Plus className="w-4 h-4" />
          CREATE TEAM
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-3 text-rose-400 text-xs font-mono">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Teams Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-4 px-6">Team Name</th>
                <th className="py-4 px-6">Join Code</th>
                <th className="py-4 px-6">Members & Capacity</th>
                <th className="py-4 px-6 text-center">Score / Solves</th>
                <th className="py-4 px-6 text-center">Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    Loading teams...
                  </td>
                </tr>
              ) : teams.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No teams found. Click &quot;Create Team&quot; to add one.
                  </td>
                </tr>
              ) : (
                teams.map((team) => {
                  const memberCount = team.members?.length || 0;
                  const isFull = memberCount >= 3;

                  return (
                    <tr key={team.id} className="hover:bg-slate-800/30 transition-colors">
                      {/* Name */}
                      <td className="py-4 px-6">
                        <div className="font-bold text-white text-sm">{team.name}</div>
                        <div className="text-[11px] text-slate-500">
                          Created {new Date(team.createdAt).toLocaleDateString()}
                        </div>
                      </td>

                      {/* Join Code */}
                      <td className="py-4 px-6">
                        <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-slate-950 border border-slate-700 rounded-lg">
                          <span className="text-cyan-400 font-bold tracking-widest">
                            {team.joinCode}
                          </span>
                          <button
                            onClick={() => copyToClipboard(team.joinCode)}
                            className="text-slate-400 hover:text-white"
                            title="Copy Code"
                          >
                            {copiedCode === team.joinCode ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Members & Capacity */}
                      <td className="py-4 px-6 max-w-sm">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isFull
                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            }`}
                          >
                            {memberCount} / 3 {isFull ? "FULL" : "MEMBERS"}
                          </span>

                          {!isFull && (
                            <button
                              onClick={() => {
                                setAddMemberTeamId(team.id);
                                setAddMemberName("");
                              }}
                              className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 font-mono"
                            >
                              <UserPlus className="w-3 h-3" /> Add
                            </button>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {team.members && team.members.length > 0 ? (
                            team.members.map((m: any) => (
                              <span
                                key={m.id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-800 border border-slate-700 text-slate-200 rounded text-[11px]"
                              >
                                <span>{m.name}</span>
                                <button
                                  onClick={() => handleRemoveMember(team.id, m.id, m.name)}
                                  className="text-slate-500 hover:text-rose-400 ml-0.5"
                                  title="Remove member"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-500">No members yet</span>
                          )}
                        </div>
                      </td>

                      {/* Score */}
                      <td className="py-4 px-6 text-center">
                        <span className="text-sm font-bold text-white">{team.score} pts</span>
                        <div className="text-[11px] text-slate-500">{team.solvesCount} solves</div>
                      </td>

                      {/* Qualification Status */}
                      <td className="py-4 px-6 text-center">
                        {team.qualified ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-500/20 border border-purple-500/40 text-purple-300 rounded-full text-[10px]">
                            <Sparkles className="w-3 h-3 text-purple-400" /> QUALIFIED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded text-[11px]">
                            IN RUNNING
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right space-x-2">
                        <button
                          onClick={() => handleRegenerateCode(team.id)}
                          className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-colors"
                          title="Regenerate Join Code"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteTeam(team.id, team.name)}
                          className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="Delete Team"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE TEAM MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-6">
              <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-mono text-white">CREATE NEW TEAM</h3>
                <p className="text-xs text-slate-400">
                  Pre-create team. Max 3 members supported per team.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-2">
                  Team Name <span className="text-cyan-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Byte Force"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-2">
                  Initial Members (comma separated, max 4)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rahul, Naveen"
                  value={newTeamMembers}
                  onChange={(e) => setNewTeamMembers(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-cyan-400"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Leave empty to let members join themselves using the code.
                </p>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-2">
                  Custom Join Code (optional)
                </label>
                <input
                  type="text"
                  placeholder="Leave empty for auto-generated CC-XXXXX"
                  value={customJoinCode}
                  onChange={(e) => setCustomJoinCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm uppercase focus:outline-none focus:border-cyan-400"
                />
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
                  disabled={createLoading || !newTeamName.trim()}
                  className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs rounded-xl transition-colors disabled:opacity-50"
                >
                  {createLoading ? "Creating..." : "Save Team"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD MEMBER MODAL */}
      {addMemberTeamId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setAddMemberTeamId(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold font-mono text-white mb-4">
              ADD TEAM MEMBER
            </h3>

            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 uppercase mb-2">
                  Member Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Swathi"
                  value={addMemberName}
                  onChange={(e) => setAddMemberName(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAddMemberTeamId(null)}
                  className="px-3 py-1.5 text-xs font-mono text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addMemberLoading || !addMemberName.trim()}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs rounded-xl"
                >
                  {addMemberLoading ? "Adding..." : "Add Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
