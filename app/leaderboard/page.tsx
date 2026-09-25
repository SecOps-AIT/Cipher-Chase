"use client";

import { Shield, Lock, Eye, UserX } from "lucide-react";
import Link from "next/link";

/**
 * PUBLIC LEADERBOARD PAGE - NOW ADMIN-ONLY
 * 
 * As per game specification:
 * "The global leaderboard is ADMIN ONLY. Participants must NOT see rank, other team scores"
 * 
 * This page now displays a message to participants that the leaderboard is not available.
 * Admins can access the leaderboard through the admin dashboard.
 */
export default function PublicLeaderboardPage() {
  return (
    <div className="min-h-screen bg-[#04060a] cyber-grid text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <div className="bg-slate-900/80 border border-slate-700/80 rounded-3xl p-12 text-center space-y-6">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="p-6 bg-amber-500/10 border border-amber-500/30 rounded-3xl">
              <Lock className="w-16 h-16 text-amber-400" />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h1 className="text-4xl font-black font-mono tracking-tight text-white">
              Leaderboard Unavailable
            </h1>
            <p className="text-lg text-slate-300 font-medium">
              This feature is restricted to administrators only
            </p>
          </div>

          {/* Description */}
          <div className="space-y-4 text-slate-400">
            <div className="flex items-start gap-3 text-left p-4 bg-slate-950/50 border border-slate-800 rounded-xl">
              <Eye className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">Privacy by Design</p>
                <p className="text-xs">
                  To maintain competitive integrity, the global leaderboard and team rankings 
                  are not visible to participants during the competition.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 text-left p-4 bg-slate-950/50 border border-slate-800 rounded-xl">
              <Shield className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">Focus on Your Progress</p>
                <p className="text-xs">
                  Track your team's progress through your team dashboard. 
                  You can see your score, solved challenges, and time remaining.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 text-left p-4 bg-slate-950/50 border border-slate-800 rounded-xl">
              <UserX className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">No Rankings Revealed</p>
                <p className="text-xs">
                  Your rank and other team scores remain hidden until the competition concludes. 
                  Final results will be announced by the organizers.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 space-y-3">
            <Link
              href="/team"
              className="block w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold font-mono text-sm tracking-wider rounded-xl transition-all"
            >
              GO TO TEAM DASHBOARD
            </Link>
            
            <Link
              href="/admin/login"
              className="block w-full py-3 bg-slate-950 border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white font-bold font-mono text-xs tracking-wider rounded-xl transition-all"
            >
              ADMIN LOGIN
            </Link>
          </div>

          {/* Footer Note */}
          <p className="text-xs text-slate-500 font-mono pt-4">
            CIPHER CHASE 2026 • LEADERBOARD ACCESS: ADMIN ONLY
          </p>
        </div>
      </div>
    </div>
  );
}
