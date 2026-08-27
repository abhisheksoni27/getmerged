"use client";

import React, { useState } from "react";
import { Briefcase, Send, CheckCircle2, X } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

interface RecruiterInterestModalProps {
  username: string;
  isOpen: boolean;
  onClose: () => void;
}

export function RecruiterInterestModal({ username, isOpen, onClose }: RecruiterInterestModalProps) {
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !company.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/user/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          repo_id: `recruiter-interest:${username}`,
          full_name: `hire/@${username}`,
          maintainer_rating: 5,
          review_speed_rating: 5,
          beginner_rating: 5,
          comment: `[Recruiter Hire Signal for @${username}] Company: ${company.trim()} | Email: ${email.trim()} | Note: ${message.trim()}`,
        }),
      });

      if (res.ok) {
        setSent(true);
      } else {
        setError("Failed to register hiring inquiry. Please try again.");
      }
    } catch {
      setError("Network error submitting hiring signal.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl glass-panel p-6 sm:p-8 shadow-2xl border border-white/[0.12] text-white font-sans">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {sent ? (
          <div className="text-center py-6 space-y-4">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold font-space text-white">Hiring Signal Registered</h3>
            <p className="text-xs text-zinc-300 leading-relaxed max-w-sm mx-auto">
              Your inquiry for <span className="text-orange-400 font-mono font-bold">@{username}</span> has been securely logged on GetMerged. We will notify the contributor of your opportunity.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 px-6 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-xs font-mono font-bold text-white transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Briefcase className="h-4 w-4 text-orange-400" />
              <span className="text-xs font-mono font-bold uppercase text-orange-400">Recruiter Direct Signal</span>
            </div>
            <h3 className="text-lg font-bold font-space text-white">
              Connect with @{username}
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed font-sans">
              Register verified hiring interest directly through GetMerged talent pass.
            </p>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-[11px] font-mono text-zinc-300 mb-1">Your Work Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="recruiter@company.com"
                  className="w-full rounded-xl glass-panel border border-white/[0.1] px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-300 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-zinc-300 mb-1">Company / Organization</label>
                <input
                  type="text"
                  required
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Acme Corp / Vercel"
                  className="w-full rounded-xl glass-panel border border-white/[0.1] px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-300 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-zinc-300 mb-1">Role / Opportunity Brief (Optional)</label>
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell @username about the role, tech stack, or open-source sponsorship..."
                  className="w-full rounded-xl glass-panel border border-white/[0.1] px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-300 focus:outline-none focus:border-orange-500 resize-none"
                />
              </div>
            </div>

            {error && <p className="text-xs font-mono text-rose-400">{error}</p>}

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 px-5 py-3 text-xs font-mono font-bold text-white transition-all disabled:opacity-50 cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{loading ? "Registering..." : "Send Hiring Signal"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
