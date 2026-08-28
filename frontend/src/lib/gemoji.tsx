import * as gemoji from "gemoji";
import React from "react";

// GitHub custom "gemoji" shortcodes with no unicode equivalent.
// Rendered as the same CDN images GitHub uses.
const CUSTOM_GEMOJI: Record<string, string> = {
  octocat: "https://github.githubassets.com/images/icons/emoji/octocat.png",
  bowtie: "https://github.githubassets.com/images/icons/emoji/bowtie.png",
  neckbeard: "https://github.githubassets.com/images/icons/emoji/neckbeard.png",
  fu: "https://github.githubassets.com/images/icons/emoji/fu.png",
  shipit: "https://github.githubassets.com/images/icons/emoji/shipit.png",
  suspect: "https://github.githubassets.com/images/icons/emoji/suspect.png",
  trollface: "https://github.githubassets.com/images/icons/emoji/trollface.png",
  hamburgler: "https://github.githubassets.com/images/icons/emoji/hamburgler.png",
  metal: "https://github.githubassets.com/images/icons/emoji/metal.png",
};

const SHORTCODE_RE = /:([a-z0-9_+-]+):/gi;

export function gemojiToReactNodes(text: string): string | React.ReactNode[] {
  if (!text) return text;
  const matches = text.match(SHORTCODE_RE);
  if (!matches) return text;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  SHORTCODE_RE.lastIndex = 0;

  let m: RegExpExecArray | null;
  while ((m = SHORTCODE_RE.exec(text)) !== null) {
    const name = m[1].toLowerCase();
    if (lastIndex < m.index) {
      parts.push(text.slice(lastIndex, m.index));
    }
    if (CUSTOM_GEMOJI[name]) {
      // eslint-disable-next-line @next/next/no-img-element
      parts.push(
        <img
          key={key++}
          src={CUSTOM_GEMOJI[name]}
          alt={`:${name}:`}
          title={`:${name}:`}
          className="inline-block h-[1em] w-[1em] align-[-0.125em]"
          aria-hidden="true"
        />
      );
    } else if (gemoji.nameToEmoji[name]) {
      parts.push(<span key={key++}>{gemoji.nameToEmoji[name]}</span>);
    } else {
      parts.push(m[0]);
    }
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

export function gemojiToUnicode(text: string): string {
  if (!text) return text;
  return text.replace(SHORTCODE_RE, (full, name: string) => {
    const n = name.toLowerCase();
    if (CUSTOM_GEMOJI[n]) return "";
    return gemoji.nameToEmoji[n] || full;
  });
}

export function GemojiText({
  children,
  className,
}: {
  children: string;
  className?: string;
}): React.ReactElement {
  return <span className={className}>{gemojiToReactNodes(children)}</span>;
}
