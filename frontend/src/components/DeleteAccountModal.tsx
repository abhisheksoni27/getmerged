"use client";

import React, { useState } from "react";
import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
}

const CONFIRMATION_PHRASE = "DELETE MY ACCOUNT";

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  isOpen,
  onClose,
  username,
}) => {
  const [phrase, setPhrase] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    if (isDeleting) return;
    setPhrase("");
    setError(null);
    onClose();
  };

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phrase.trim() !== CONFIRMATION_PHRASE) {
      setError(`Please type "${CONFIRMATION_PHRASE}" exactly to confirm.`);
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/me/data`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          confirm: true,
          delete_confirmation_phrase: CONFIRMATION_PHRASE,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to delete account");
      }

      // Explicitly expire cookie locally as well
      document.cookie = "opendoor_token=; Path=/; Max-Age=0; SameSite=Lax";

      // Redirect immediately to home page
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete account. Please try again.");
      setIsDeleting(false);
    }
  };

  const isConfirmed = phrase.trim() === CONFIRMATION_PHRASE;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-md bg-slate-900 border border-rose-500/30 rounded-2xl shadow-2xl p-6 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle red accent glow */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-600 via-rose-500 to-red-600" />

        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 id="delete-modal-title" className="text-base font-bold text-white font-sans">
                Delete Account
              </h2>
              <p className="text-xs text-zinc-400 font-mono">@{username}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isDeleting}
            className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-xs font-sans text-zinc-300 space-y-2 mb-5">
          <p>
            This action is <strong className="text-rose-400">permanent and irreversible</strong>.
            Under global GDPR and privacy rights, this will:
          </p>
          <ul className="list-disc list-inside text-zinc-400 space-y-1 pl-1">
            <li>Anonymize and soft-delete your user record immediately</li>
            <li>Purge all your OAuth tokens and saved watchlists</li>
            <li>Revoke access and invalidate your active session</li>
          </ul>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-mono">
            {error}
          </div>
        )}

        <form onSubmit={handleDelete} className="space-y-4">
          <div>
            <label
              htmlFor="delete-confirm-input"
              className="block text-xs font-mono text-zinc-300 mb-1.5"
            >
              To confirm, type <span className="text-rose-400 font-bold select-all">{CONFIRMATION_PHRASE}</span> below:
            </label>
            <input
              id="delete-confirm-input"
              type="text"
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              disabled={isDeleting}
              placeholder={CONFIRMATION_PHRASE}
              autoComplete="off"
              className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-sm text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-rose-500/60 focus:ring-1 focus:ring-rose-500/60 transition-all"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isDeleting}
              className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white border border-white/10 text-xs font-mono font-medium transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isConfirmed || isDeleting}
              className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:bg-rose-950 disabled:text-zinc-500 disabled:border-rose-900/40 text-white border border-rose-500/30 text-xs font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:cursor-not-allowed shadow-sm"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Permanently Delete</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
