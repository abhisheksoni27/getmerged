"use client";

import React, { useState } from "react";
import { ExternalLink, Code2, Lock, Star, Sparkles, Image as ImageIcon, ChevronLeft, ChevronRight } from "lucide-react";
import type { ShowcaseProject } from "@/lib/public-profile";

interface ProjectCardProps {
  project: ShowcaseProject;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const images = project.image_urls && project.image_urls.length > 0 ? project.image_urls : [];
  const hasImages = images.length > 0;

  const nextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="group relative flex flex-col rounded-xl border border-white/[0.1] bg-[#141414]/90 hover:bg-[#1a1a1a] transition-all duration-300 hover:border-white/[0.2] overflow-hidden shadow-sm">
      {/* Project Image / Photo Showcase */}
      {hasImages ? (
        <div className="relative w-full h-48 sm:h-52 bg-black/60 overflow-hidden border-b border-white/[0.08]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[activeImageIndex]}
            alt={`${project.title} screenshot ${activeImageIndex + 1}`}
            className="w-full h-full object-cover object-center group-hover:scale-[1.02] transition-transform duration-500"
            loading="lazy"
          />

          {/* Carousel Arrows if multiple images */}
          {images.length > 1 && (
            <div className="absolute inset-0 flex items-center justify-between px-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={prevImage}
                aria-label="Previous screenshot"
                className="p-1 rounded-full bg-black/70 text-white/80 hover:text-white hover:bg-black transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={nextImage}
                aria-label="Next screenshot"
                className="p-1 rounded-full bg-black/70 text-white/80 hover:text-white hover:bg-black transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Photo count indicator */}
          {images.length > 1 && (
            <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/80 text-[11px] font-mono text-zinc-300 border border-white/[0.1] flex items-center gap-1">
              <ImageIcon className="h-3 w-3" />
              {activeImageIndex + 1}/{images.length}
            </div>
          )}

          {/* Private project badge over image */}
          {project.is_private && (
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-amber-950/90 border border-amber-700/80 text-amber-300 text-[10px] font-mono font-bold flex items-center gap-1">
              <Lock className="h-3 w-3" /> Private Project Showcase
            </div>
          )}
        </div>
      ) : project.is_private ? (
        <div className="px-5 pt-4">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950/80 border border-amber-700/80 text-amber-300 text-[10px] font-mono font-bold">
            <Lock className="h-3 w-3" /> Private Project Showcase
          </span>
        </div>
      ) : null}

      {/* Card Body */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className="text-base font-bold font-sans text-white group-hover:text-amber-400 transition-colors">
              {project.title}
            </h3>
            {typeof project.stars === "number" && project.stars > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-mono text-amber-400 bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                {project.stars}
              </span>
            )}
          </div>

          <p className="text-xs text-zinc-300 font-sans leading-relaxed line-clamp-3 mb-4">
            {project.description}
          </p>

          {/* Tags */}
          {project.tags && project.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {project.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-[11px] font-mono text-zinc-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Action Links */}
        <div className="flex items-center gap-3 pt-3 border-t border-white/[0.06] text-xs font-mono">
          {project.demo_url && (
            <a
              href={project.demo_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors font-semibold"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Live Demo
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {project.repo_url && (
            <a
              href={project.repo_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-zinc-300 hover:text-white transition-colors ml-auto"
            >
              <Code2 className="h-3.5 w-3.5" />
              Code
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
