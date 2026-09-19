import Link from "next/link";
import { Shield, Trophy, Users, Terminal, ArrowRight, Lock, Zap } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen cyber-grid flex flex-col justify-between p-6 md:p-12 relative overflow-hidden">
      {/* Glow decorative orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="flex justify-between items-center z-10">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wider font-mono text-white">CIPHER CHASE</h1>
            <p className="text-xs text-slate-400 tracking-widest font-mono uppercase">CTF Engine v1.0</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="hidden sm:flex items-center space-x-2 px-3 py-1 bg-slate-900/80 border border-slate-800 rounded-full text-xs font-mono text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>SERVER AUTHORITATIVE</span>
          </div>
          <Link
            href="/admin"
            className="px-4 py-2 text-xs font-mono tracking-wider border border-slate-700 bg-slate-900/60 hover:bg-slate-800 hover:border-slate-500 text-slate-300 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Lock className="w-3.5 h-3.5 text-cyan-400" />
            ADMIN
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="my-auto py-12 max-w-4xl mx-auto text-center z-10">
        <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-cyan-950/60 border border-cyan-800/50 text-cyan-400 text-xs font-mono mb-6">
          <Terminal className="w-3.5 h-3.5" />
          <span>CYBERSECURITY COMPETITION PLATFORM</span>
        </div>

        <h2 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6 font-mono">
          DEFEND. EXPLOIT. <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-emerald-400 to-purple-400">CONQUER.</span>
        </h2>

        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed font-sans">
          Welcome to <strong className="text-white">Cipher Chase</strong>. Compete in Round 1 Themed CTF batch windows,
          qualify for the Round 2 Cyber Auction, and claim glory on the live leaderboard.
        </p>

        {/* Primary Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
          <Link
            href="/team/join"
            className="group px-6 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-xl shadow-cyan-glow flex items-center justify-center gap-3 transition-all transform hover:-translate-y-0.5"
          >
            <Users className="w-5 h-5" />
            <span className="font-mono tracking-wider">JOIN TEAM</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            href="/leaderboard"
            className="group px-6 py-4 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/50 text-white font-semibold rounded-xl flex items-center justify-center gap-3 transition-all"
          >
            <Trophy className="w-5 h-5 text-amber-400" />
            <span className="font-mono tracking-wider">LIVE LEADERBOARD</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-slate-400" />
          </Link>
        </div>
      </section>

      {/* Two-Round Overview Cards */}
      <footer className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto w-full z-10 pt-8 border-t border-slate-800/80">
        <div className="p-4 bg-slate-900/50 border border-slate-800/80 rounded-xl">
          <div className="flex items-center space-x-2.5 mb-2">
            <Zap className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold font-mono text-cyan-300">ROUND 1: THEMED CTF</h3>
          </div>
          <p className="text-xs text-slate-400">
            Timed challenge batches (10-minute windows). First correct solve locks the question for the team. Instant score tiebreaker timestamps.
          </p>
        </div>

        <div className="p-4 bg-slate-900/50 border border-slate-800/80 rounded-xl">
          <div className="flex items-center space-x-2.5 mb-2">
            <Trophy className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-semibold font-mono text-purple-300">ROUND 2: CYBER AUCTION</h3>
          </div>
          <p className="text-xs text-slate-400">
            Top qualifiers convert score to auction wallet. Verbal bidding, committed countdown timers, hint purchasing, and speed bonus rewards.
          </p>
        </div>
      </footer>
    </main>
  );
}
