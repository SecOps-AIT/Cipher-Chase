"use client";

import { useState } from "react";
import { 
  Shield, 
  Target, 
  Clock, 
  Zap, 
  CheckCircle2, 
  ArrowRight,
  Lightbulb,
  Flag,
  X
} from "lucide-react";

interface WelcomeTutorialProps {
  onComplete: () => void;
  onStartRound: () => void;
}

export function WelcomeTutorial({ onComplete, onStartRound }: WelcomeTutorialProps) {
  const [step, setStep] = useState(1);
  const [demoAnswer, setDemoAnswer] = useState("");
  const [demoComplete, setDemoComplete] = useState(false);
  const [error, setError] = useState("");

  const totalSteps = 4;

  const handleDemoSubmit = () => {
    const correctFlag = "DEMO{WELCOME}";
    if (demoAnswer.trim().toUpperCase() === correctFlag) {
      setDemoComplete(true);
      setError("");
      setTimeout(() => setStep(4), 1000);
    } else {
      setError("Incorrect flag! Try again.");
    }
  };

  const handleStartRound = () => {
    onStartRound();
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 bg-gradient-to-r from-cyan-500/10 to-blue-600/10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/20 border border-cyan-500/40 rounded-lg">
                <Shield className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold font-mono text-white">ROUND 1 BRIEFING</h2>
                <p className="text-xs font-mono text-cyan-400">Mission Protocol & Tutorial</p>
              </div>
            </div>
            <button
              onClick={onComplete}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Progress Bar */}
          <div className="flex gap-1 mt-4">
            {[...Array(totalSteps)].map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-all ${
                  i + 1 <= step ? "bg-cyan-400" : "bg-slate-700"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <Target className="w-12 h-12 text-cyan-400 mx-auto mb-3" />
                <h3 className="text-lg font-bold font-mono text-white mb-2">Welcome to the Arena</h3>
                <p className="text-sm text-slate-300">
                  You&apos;re about to enter Round 1: <span className="text-cyan-400 font-bold">Themed CTF Challenge</span>
                </p>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-start gap-3">
                  <Zap className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-white">20 Core Challenges</p>
                    <p className="text-xs text-slate-400">Solve as many as you can within the time limit</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-white">Timed Competition</p>
                    <p className="text-xs text-slate-400">Timer starts when you click &quot;READY&quot; - plan your strategy!</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-white">Manual Hints</p>
                    <p className="text-xs text-slate-400">Stuck? Contact organizers for hints (-5 points each)</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-white">First Solve Locks</p>
                    <p className="text-xs text-slate-400">Once any teammate solves a question, it&apos;s locked for the whole team</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold font-mono text-sm tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                <span>CONTINUE</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <Flag className="w-12 h-12 text-amber-400 mx-auto mb-3" />
                <h3 className="text-lg font-bold font-mono text-white mb-2">Flag Format</h3>
                <p className="text-sm text-slate-300">
                  All answers follow a specific format
                </p>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <p className="text-sm text-slate-300">
                  Challenge flags are formatted as:
                </p>
                <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                  <code className="text-sm font-mono text-cyan-300">FLAG{"{"}EXAMPLE_TEXT{"}"}</code>
                </div>
                <p className="text-xs text-slate-400">
                  Always include <span className="text-cyan-400">FLAG{"{"}</span> at the start and <span className="text-cyan-400">{"}"}</span> at the end
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-mono text-sm rounded-xl transition-colors"
                >
                  BACK
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold font-mono text-sm tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all"
                >
                  <span>TRY DEMO</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <Target className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <h3 className="text-lg font-bold font-mono text-white mb-2">Practice Challenge</h3>
                <p className="text-sm text-slate-300">
                  Let&apos;s try a simple challenge to get you started
                </p>
              </div>

              <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-4">
                <div>
                  <p className="text-xs font-mono text-cyan-400 uppercase tracking-wider mb-2">
                    DEMO CHALLENGE
                  </p>
                  <h4 className="text-base font-bold text-white mb-3">Welcome to Cipher Chase</h4>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    This is a practice challenge. The flag is simply: <span className="text-amber-400 font-bold">WELCOME</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-2">
                    Remember to wrap it in the correct flag format!
                  </p>
                </div>

                {error && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-xs font-mono flex items-center gap-2">
                    <X className="w-4 h-4" />
                    {error}
                  </div>
                )}

                {demoComplete && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-300 text-xs font-mono flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Correct! You&apos;ve got the hang of it!
                  </div>
                )}

                {!demoComplete && (
                  <div>
                    <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">
                      Submit Flag
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="FLAG{...}"
                        value={demoAnswer}
                        onChange={(e) => setDemoAnswer(e.target.value)}
                        className="flex-1 px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
                      />
                      <button
                        onClick={handleDemoSubmit}
                        className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 text-slate-950 font-bold font-mono text-sm rounded-xl transition-all"
                      >
                        SUBMIT
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-mono text-sm rounded-xl transition-colors"
                >
                  BACK
                </button>
                {demoComplete && (
                  <button
                    onClick={() => setStep(4)}
                    className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold font-mono text-sm tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all"
                  >
                    <span>CONTINUE</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center text-emerald-400 mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold font-mono text-white mb-2">Ready to Begin?</h3>
                <p className="text-sm text-slate-300">
                  Once you click &quot;START ROUND 1&quot;, the timer will begin and you can start solving challenges.
                </p>
              </div>

              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                <p className="text-xs font-mono text-amber-300 text-center">
                  ⏰ Make sure all team members are ready before starting!
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onComplete}
                  className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-mono text-sm rounded-xl transition-colors"
                >
                  NOT YET
                </button>
                <button
                  onClick={handleStartRound}
                  className="flex-1 py-4 bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 text-slate-950 font-black font-mono text-base tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
                >
                  <Clock className="w-5 h-5" />
                  <span>START ROUND 1</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
