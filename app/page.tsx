import Link from "next/link";
import { Shield, Trophy, Users, Terminal, ArrowRight, Lock, KeyRound, Cpu, Layers } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen vault-bg flex flex-col justify-between p-6 sm:p-10 md:p-12 relative overflow-hidden select-none">
      {/* Subtle blueprint decorative elements */}
      <div className="absolute top-1/4 left-1/4 w-[480px] h-[480px] bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[480px] h-[480px] bg-red-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="flex justify-between items-center z-10 border-b border-[#1E293B]/70 pb-5 max-w-6xl mx-auto w-full">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black tracking-widest font-mono text-white">CIPHER CHASE</h1>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-fast" />
            </div>
            <p className="text-[10px] text-slate-400 tracking-widest font-mono uppercase">
              HIGH-SECURITY CTF PLATFORM // 2026
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex items-center space-x-2 px-3 py-1 bg-[#090D16] border border-slate-800 rounded-lg text-[11px] font-mono text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-cyan-300 font-bold">GRID ONLINE</span>
          </div>
          <Link
            href="/admin"
            className="px-3.5 py-1.5 text-xs font-mono tracking-wider border border-slate-700/80 bg-[#090D16] hover:bg-[#0D1424] hover:border-cyan-500/50 text-slate-300 rounded-lg transition-all flex items-center gap-1.5"
          >
            <Lock className="w-3.5 h-3.5 text-cyan-400" />
            <span>ADMIN</span>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="my-auto py-12 max-w-4xl mx-auto text-center z-10 w-full">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-[11px] font-mono mb-6">
          <Terminal className="w-3.5 h-3.5" />
          <span className="tracking-widest uppercase">TACTICAL OPERATION // ACTIVE MISSION</span>
        </div>

        <h2 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white mb-4 font-mono">
          BREACH. SOLVE. <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-300">ESCAPE.</span>
        </h2>

        <p className="text-xs sm:text-sm font-mono text-slate-400 max-w-xl mx-auto mb-10 leading-relaxed uppercase tracking-wider">
          A high-stakes cybersecurity CTF competition. Infiltrate classified vault targets, bid time in live auctions, and escape with the flag.
        </p>

        {/* Primary Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto">
          <Link
            href="/team/join"
            className="group px-6 py-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl shadow-cyan-glow flex items-center justify-center gap-3 transition-all cursor-pointer"
          >
            <KeyRound className="w-4 h-4" />
            <span className="font-mono text-xs tracking-widest font-black uppercase">ENTER THE CHASE</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>

        </div>
      </section>

      {/* Two-Round Overview Cards */}
      <footer className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto w-full z-10 pt-6 border-t border-[#1E293B]/70">
        <div className="p-4 bg-[#090D16]/80 border border-[#1E293B] rounded-xl corner-frame">
          <div className="flex items-center space-x-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider">
              ROUND 01 — 20 OPERATION TARGETS
            </h3>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
            Dedicated 30-minute team timer. Crack targets across Crypto, Web, Forensics, and Reverse Engineering. Immediate team sync.
          </p>
        </div>

        <div className="p-4 bg-[#090D16]/80 border border-[#1E293B] rounded-xl corner-frame">
          <div className="flex items-center space-x-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider">
              ROUND 02 — LIVE TIME AUCTION
            </h3>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
            Top qualifiers bid execution time. Lowest valid bid secures the challenge. Risk/reward scoring with dynamic time bonuses.
          </p>
        </div>
      </footer>
    </main>
  );
}
