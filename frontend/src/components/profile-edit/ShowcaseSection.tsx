import { Image as ImageIcon, Lock, Plus, Trash2 } from "lucide-react";
import type { ShowcaseProject } from "@/lib/public-profile";

interface ShowcaseSectionProps {
  projects: ShowcaseProject[];
  onAdd: () => void;
  onUpdate: (index: number, updated: Partial<ShowcaseProject>) => void;
  onRemove: (index: number) => void;
}

interface ShowcaseProjectCardProps {
  proj: ShowcaseProject;
  onUpdate: (updated: Partial<ShowcaseProject>) => void;
  onRemove: () => void;
}

function ShowcaseProjectCard({ proj, onUpdate, onRemove }: ShowcaseProjectCardProps) {
  return (
    <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-black/40 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <input
          type="text"
          value={proj.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Project Title"
          className="font-bold text-sm bg-transparent border-b border-[var(--border-subtle)] focus:border-amber-400 text-white pb-1 flex-1 focus:outline-none"
        />
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove project"
          className="p-1.5 rounded text-[var(--text-tertiary)] hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <textarea
        value={proj.description}
        onChange={(e) => onUpdate({ description: e.target.value })}
        rows={2}
        placeholder="What problem does this solve? What architecture did you use?"
        className="w-full text-xs p-2 rounded bg-black/60 border border-[var(--border-subtle)] text-[var(--text-secondary)] placeholder-zinc-500 focus:outline-none focus:border-amber-400"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div>
          <label className="block text-[11px] font-mono text-[var(--text-secondary)] mb-1">
            Live Demo URL
          </label>
          <input
            type="url"
            value={proj.demo_url || ""}
            onChange={(e) => onUpdate({ demo_url: e.target.value })}
            placeholder="https://myapp.com"
            className="w-full p-2 rounded bg-black/60 border border-[var(--border-subtle)] text-[var(--text-secondary)] placeholder-zinc-500 focus:outline-none focus:border-amber-400"
          />
        </div>
        <div>
          <label className="block text-[11px] font-mono text-[var(--text-secondary)] mb-1">
            GitHub Repository URL (Optional)
          </label>
          <input
            type="url"
            value={proj.repo_url || ""}
            onChange={(e) => onUpdate({ repo_url: e.target.value })}
            placeholder="https://github.com/username/repo"
            className="w-full p-2 rounded bg-black/60 border border-[var(--border-subtle)] text-[var(--text-secondary)] placeholder-zinc-500 focus:outline-none focus:border-amber-400"
          />
        </div>
      </div>

      {/* Screenshot / Photo URLs */}
      <div>
        <label className="block text-[11px] font-mono text-[var(--text-secondary)] mb-1 flex items-center gap-1.5">
          <ImageIcon className="h-3.5 w-3.5 text-blue-400" />
          Screenshot & Photo URLs (comma separated)
        </label>
        <input
          type="text"
          value={(proj.image_urls || []).join(", ")}
          onChange={(e) =>
            onUpdate({
              image_urls: e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
          placeholder="https://mycdn.com/shot1.png, https://mycdn.com/shot2.png"
          className="w-full p-2 rounded bg-black/60 border border-[var(--border-subtle)] text-xs font-mono text-[var(--text-secondary)] placeholder-zinc-500 focus:outline-none focus:border-amber-400"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={(proj.tags || []).join(", ")}
            onChange={(e) =>
              onUpdate({
                tags: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            placeholder="Tags: Go, Docker, React"
            className="p-1.5 rounded bg-black/60 border border-[var(--border-subtle)] text-xs font-mono text-[var(--text-secondary)] placeholder-zinc-500 focus:outline-none focus:border-amber-400"
          />
        </div>

        <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-mono text-[var(--text-secondary)]">
          <input
            type="checkbox"
            checked={proj.is_private || false}
            onChange={(e) => onUpdate({ is_private: e.target.checked })}
            className="rounded bg-black border-white/20 text-amber-500 focus:ring-0"
          />
          <span className="flex items-center gap-1">
            <Lock className="h-3 w-3 text-amber-400" /> Private Project Showcase
          </span>
        </label>
      </div>
    </div>
  );
}

export function ShowcaseSection({ projects, onAdd, onUpdate, onRemove }: ShowcaseSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold font-sans text-white">Featured Project Showcases</h3>
          <p className="text-xs text-[var(--text-secondary)] font-sans mt-0.5">
            Showcase public or private work with screenshots, live demo links, and descriptions.
          </p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold font-mono inline-flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" /> Add Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="p-8 rounded-xl border border-dashed border-[var(--border-subtle)] text-center text-xs text-[var(--text-secondary)] font-sans">
          No showcase projects added yet. Click &quot;Add Project&quot; above to feature your top apps or private client work!
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map((proj, idx) => (
            <ShowcaseProjectCard
              key={proj.id || idx}
              proj={proj}
              onUpdate={(updated) => onUpdate(idx, updated)}
              onRemove={() => onRemove(idx)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
