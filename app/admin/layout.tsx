"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Shield,
  LayoutDashboard,
  Users,
  FileQuestion,
  PlayCircle,
  Gavel,
  Calculator,
  History,
  LogOut,
  ExternalLink,
  Activity,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin", label: "OVERVIEW", icon: LayoutDashboard },
  { href: "/admin/teams", label: "TEAMS REGISTRY", icon: Users },
  { href: "/admin/questions", label: "QUESTIONS BANK", icon: FileQuestion },
  { href: "/admin/round-1", label: "ROUND 1 CONTROL", icon: PlayCircle },
  { href: "/admin/auction", label: "ROUND 2 AUCTION", icon: Gavel },
  { href: "/admin/qualification", label: "QUALIFICATION", icon: Calculator },
  { href: "/admin/audit", label: "AUDIT LOGS", icon: History },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // If on login page, render without sidebar
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
  };

  return (
    <div className="min-h-screen vault-bg text-slate-100 flex flex-col md:flex-row">
      {/* Admin Sidebar */}
      <aside className="w-full md:w-64 bg-[#070B12] border-r border-[#1E293B] p-5 flex flex-col justify-between shrink-0">
        <div>
          {/* Brand */}
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-xs font-black font-mono text-white tracking-widest">
                  CIPHER CHASE
                </h2>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-fast" />
              </div>
              <span className="text-[9px] font-mono text-cyan-400 tracking-widest uppercase block -mt-0.5">
                SEC-OPS COMMAND
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg font-mono text-xs tracking-wider transition-all ${
                    isActive
                      ? "bg-cyan-950/40 border border-cyan-500/40 text-cyan-300 font-bold border-l-2 border-l-cyan-400 shadow-sm"
                      : "text-slate-400 hover:text-white hover:bg-slate-900/60 border border-transparent"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-cyan-400" : "text-slate-500"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions & System Status */}
        <div className="pt-6 border-t border-[#1E293B] space-y-2">
          <div className="px-3 py-1.5 rounded bg-[#05070B] border border-slate-800 text-[10px] font-mono text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              TELEMETRY
            </span>
            <span className="text-emerald-400 font-bold">ONLINE</span>
          </div>

          <Link
            href="/leaderboard"
            target="_blank"
            className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
              LIVE SCOREBOARD
            </span>
          </Link>

          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-mono text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>DISCONNECT</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
