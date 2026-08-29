import React from "react";

export interface LangLogoProps {
  language?: string;
  className?: string;
  size?: number;
}

export function LangLogo({ language, className = "h-4 w-4", size = 16 }: LangLogoProps) {
  if (!language) return null;

  const key = language.toLowerCase().trim();

  switch (key) {
    case "javascript":
    case "js":
      return (
        <svg
          viewBox="0 0 24 24"
          width={size}
          height={size}
          className={`${className} shrink-0 select-none rounded-xs`}
          aria-label="JavaScript"
          role="img"
        >
          <path fill="#F7DF1E" d="M0 0h24v24H0z" />
          <path
            fill="#000000"
            d="M6.02 18.06c.65 1.05 1.54 1.76 2.94 1.76 1.25 0 2.05-.62 2.05-1.5 0-1.04-.82-1.42-2.2-2.02l-.76-.32c-2.18-.94-3.62-2.12-3.62-4.63 0-2.3 1.76-4.04 4.53-4.04 1.98 0 3.42.74 4.38 2.4l-2.05 1.32c-.52-.86-1.12-1.22-2.33-1.22-1.05 0-1.74.6-1.74 1.38 0 .86.56 1.24 1.83 1.78l.76.32c2.56 1.1 4.04 2.24 4.04 4.9 0 2.8-2.2 4.3-4.98 4.3-2.77 0-4.57-1.34-5.46-3.13l2.6-1.3zm11.37.19c.47.8 1.07 1.37 2.07 1.37.9 0 1.48-.35 1.48-1.7V7.5h2.8v10.3c0 2.96-1.73 4.3-4.24 4.3-2.3 0-3.68-1.2-4.4-2.65l2.29-1.2z"
          />
        </svg>
      );

    case "typescript":
    case "ts":
      return (
        <svg
          viewBox="0 0 24 24"
          width={size}
          height={size}
          className={`${className} shrink-0 select-none rounded-xs`}
          aria-label="TypeScript"
          role="img"
        >
          <path fill="#3178C6" d="M0 0h24v24H0z" />
          <path
            fill="#FFFFFF"
            d="M13.62 18.06c.65 1.05 1.54 1.76 2.94 1.76 1.25 0 2.05-.62 2.05-1.5 0-1.04-.82-1.42-2.2-2.02l-.76-.32c-2.18-.94-3.62-2.12-3.62-4.63 0-2.3 1.76-4.04 4.53-4.04 1.98 0 3.42.74 4.38 2.4l-2.05 1.32c-.52-.86-1.12-1.22-2.33-1.22-1.05 0-1.74.6-1.74 1.38 0 .86.56 1.24 1.83 1.78l.76.32c2.56 1.1 4.04 2.24 4.04 4.9 0 2.8-2.2 4.3-4.98 4.3-2.77 0-4.57-1.34-5.46-3.13l2.6-1.3zM2.5 7.5h8.5v2.5H8v10.5H5.2V10H2.5V7.5z"
          />
        </svg>
      );

    case "python":
    case "py":
      return (
        <svg
          viewBox="0 0 24 24"
          width={size}
          height={size}
          className={`${className} shrink-0 select-none`}
          aria-label="Python"
          role="img"
        >
          <path
            fill="#3776AB"
            d="M11.92 2C6.44 2 6.78 4.38 6.78 4.38l.01 2.47h5.22v.74H4.5S2 7.32 2 12.8c0 5.47 2.18 5.27 2.18 5.27h1.3v-1.83s-.07-2.18 2.15-2.18h5.18s2.08.03 2.08-2.04V7.5s.3-2.5-3-2.5h-.07zm-2.8 1.48c.5 0 .9.4.9.9s-.4.9-.9.9-.9-.4-.9-.9.4-.9.9-.9z"
          />
          <path
            fill="#FFD43B"
            d="M12.08 22c5.48 0 5.14-2.38 5.14-2.38l-.01-2.47H12v-.74h7.51S22 16.68 22 11.2c0-5.47-2.18-5.27-2.18-5.27h-1.3v1.83s.07 2.18-2.15 2.18h-5.18s-2.08-.03-2.08 2.04v4.52s-.3 2.5 3 2.5h.07zm2.8-1.48c-.5 0-.9-.4-.9-.9s.4-.9.9-.9.9.4.9.9-.4.9-.9.9z"
          />
        </svg>
      );

    case "go":
    case "golang":
      return (
        <svg
          viewBox="0 0 24 24"
          width={size}
          height={size}
          className={`${className} shrink-0 select-none`}
          aria-label="Go"
          role="img"
        >
          <path
            fill="#00ADD8"
            d="M1.81 9.47h3.33a.47.47 0 0 0 .47-.46V7.4a.47.47 0 0 0-.47-.47H1.81a.47.47 0 0 0-.47.47v1.61c0 .26.21.46.47.46zm-.47 3.52c0 .25.21.46.47.46h5.36a.47.47 0 0 0 .47-.46v-1.61a.47.47 0 0 0-.47-.47H1.81a.47.47 0 0 0-.47.47v1.61zm2.4 3.98h3.32a.47.47 0 0 0 .47-.47v-1.6a.47.47 0 0 0-.47-.47H3.74a.47.47 0 0 0-.47.47v1.6c0 .26.21.47.47.47zm13.12-7.53c-1.36 0-2.39.4-3.08 1.18-.54.63-.84 1.48-.84 2.45 0 .97.3 1.83.84 2.46.68.79 1.71 1.2 3.08 1.2 1.05 0 1.89-.25 2.52-.75.46-.38.76-.89.9-1.53h-3.42v-1.74h5.66c.07.45.1.92.1 1.41 0 1.63-.56 2.97-1.68 4.02-1.12 1.05-2.58 1.58-4.38 1.58-1.89 0-3.41-.57-4.57-1.71-1.15-1.14-1.73-2.67-1.73-4.59 0-1.92.58-3.45 1.73-4.59 1.16-1.14 2.68-1.71 4.57-1.71 1.66 0 3.04.47 4.14 1.41l-1.48 1.47c-.77-.63-1.66-.95-2.66-.95z"
          />
        </svg>
      );

    case "rust":
    case "rs":
      return (
        <svg
          viewBox="0 0 24 24"
          width={size}
          height={size}
          className={`${className} shrink-0 select-none text-white fill-current`}
          aria-label="Rust"
          role="img"
        >
          <path d="M23.834 11.23a1.988 1.988 0 0 0-.25-.333l-1.528-.432a9.144 9.144 0 0 0-.585-1.408l.942-1.289a1.98 1.98 0 0 0-.055-.414l-1.047-1.047a1.98 1.98 0 0 0-.414-.055l-1.289.942a9.144 9.144 0 0 0-1.408-.585l-.432-1.528a1.988 1.988 0 0 0-.333-.25l-1.48-.052a1.988 1.988 0 0 0-.333.25l-.432 1.528a9.144 9.144 0 0 0-1.408.585l-1.289-.942a1.98 1.98 0 0 0-.414.055L9.53 7.336a1.98 1.98 0 0 0-.055.414l.942 1.289a9.144 9.144 0 0 0-.585 1.408l-1.528.432a1.988 1.988 0 0 0-.25.333l-.052 1.48c.05.12.13.23.25.333l1.528.432c.16.5.36.98.585 1.408l-.942 1.289c.03.14.05.28.055.414l1.047 1.047c.14.03.28.05.414.055l1.289-.942c.45.23.92.43 1.408.585l.432 1.528c.1.12.21.2.333.25l1.48.052c.12-.05.23-.13.333-.25l.432-1.528c.5-.16.98-.36 1.408-.585l1.289.942c.14-.03.28-.05.414-.055l1.047-1.047c.03-.14.05-.28.055-.414l-.942-1.289c.23-.45.43-.92.585-1.408l1.528-.432c.12-.1.2-.21.25-.333l.052-1.48a1.988 1.988 0 0 0-.25-.333zM12 17.5a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11z" />
          <path d="M10.8 9.2h2.4a1.8 1.8 0 0 1 1.8 1.8c0 1-.8 1.8-1.8 1.8h-1.2v2.4h-1.2V9.2zm1.2 2.4h1.2a.6.6 0 0 0 .6-.6.6.6 0 0 0-.6-.6h-1.2v1.2z" />
        </svg>
      );

    case "java":
      return (
        <svg
          viewBox="0 0 24 24"
          width={size}
          height={size}
          className={`${className} shrink-0 select-none`}
          aria-label="Java"
          role="img"
        >
          <path
            fill="#5382A1"
            d="M8.85 17.14c0 .08 1.47.46 3.03.11 1.77-.39 1.72-1.09 1.72-1.09-.9.46-2.9.36-3.69-.17-.4-.28-.7-.28-1.06 1.15zm.6-3.05c-1.39.2-2.14.73-1.63 1.25.68.68 2.58.55 4.31.25 1.5-.26 2.37-.89 1.77-1.39-.75-.62-2.8-.35-4.45-.11zM18.8 18.2c-.37-.36-1.57-.48-3.18-.28-2.33.28-4.8.78-6.9.11-1.33-.42-1.35-.91-1.12-1.25-1.1.72.06 1.63 2.06 1.95 3.32.53 7.82.52 9.14-.53z"
          />
          <path
            fill="#E76F00"
            d="M12.92 2.05s2.4 2.1-1.34 5.37c-3.1 2.68-.69 4.2.37 5.76-2.18-2.61-3.32-4.14-1.36-5.83 2.23-1.92 2.33-5.3 2.33-5.3zm-1.87 3.51s2.21 2.45-1.74 5.4c-2.45 1.83-.49 3.8.31 5.38-2.07-2.19-2.95-4.14-1.18-5.59 2.01-1.65 2.61-5.19 2.61-5.19z"
          />
        </svg>
      );

    case "c++":
    case "cpp":
      return (
        <svg
          viewBox="0 0 24 24"
          width={size}
          height={size}
          className={`${className} shrink-0 select-none`}
          aria-label="C++"
          role="img"
        >
          <path
            fill="#00599C"
            d="M11.5 2.1a1 1 0 0 0-1 0L2.5 6.7a1 1 0 0 0-.5.9v9.2a1 1 0 0 0 .5.9l8 4.6a1 1 0 0 0 1 0l8-4.6a1 1 0 0 0 .5-.9V7.6a1 1 0 0 0-.5-.9l-8-4.6z"
          />
          <path
            fill="#FFFFFF"
            d="M11.5 8.5c-2 0-3.5 1.5-3.5 3.5s1.5 3.5 3.5 3.5c1.4 0 2.5-.7 3.1-1.8l-1.7-1c-.3.6-.8.9-1.4.9-1 0-1.7-.7-1.7-1.6s.7-1.6 1.7-1.6c.6 0 1.1.3 1.4.9l1.7-1c-.6-1.1-1.7-1.8-3.1-1.8zm4.5 2.5h1v1h1v1h-1v1h-1v-1h-1v-1h1v-1zm4 0h1v1h1v1h-1v1h-1v-1h-1v-1h1v-1z"
          />
        </svg>
      );

    case "c#":
    case "csharp":
    case "cs":
      return (
        <svg
          viewBox="0 0 24 24"
          width={size}
          height={size}
          className={`${className} shrink-0 select-none`}
          aria-label="C#"
          role="img"
        >
          <path
            fill="#239120"
            d="M11.5 2.1a1 1 0 0 0-1 0L2.5 6.7a1 1 0 0 0-.5.9v9.2a1 1 0 0 0 .5.9l8 4.6a1 1 0 0 0 1 0l8-4.6a1 1 0 0 0 .5-.9V7.6a1 1 0 0 0-.5-.9l-8-4.6z"
          />
          <path
            fill="#FFFFFF"
            d="M10 8.5c-2 0-3.5 1.5-3.5 3.5s1.5 3.5 3.5 3.5c1.4 0 2.5-.7 3.1-1.8l-1.7-1c-.3.6-.8.9-1.4.9-1 0-1.7-.7-1.7-1.6s.7-1.6 1.7-1.6c.6 0 1.1.3 1.4.9l1.7-1c-.6-1.1-1.7-1.8-3.1-1.8zm5.5 1.5h1v1.5h1.5v1H16.5v1.5h-1v-1.5H14v-1h1.5V10zm2.5 0h1v1.5h1.5v1H19v1.5h-1v-1.5H16.5v-1H18V10z"
          />
        </svg>
      );

    case "php":
      return (
        <svg
          viewBox="0 0 24 24"
          width={size}
          height={size}
          className={`${className} shrink-0 select-none`}
          aria-label="PHP"
          role="img"
        >
          <path
            fill="#777BB4"
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-4.7 13.5H5.8l1.4-7h2.3c1.5 0 2.3.8 2 2.3-.3 1.6-1.5 2.7-3 2.7h-1.2l-.6 2zm6.2 0h-1.5l1.4-7h2.3c1.5 0 2.3.8 2 2.3-.3 1.6-1.5 2.7-3 2.7h-1.2l-.6 2zm5.7-4.7c-.2.9-.8 1.7-1.7 1.7h-.8l.6-3h.8c.8 0 1.3.4 1.1 1.3zm-6.2 0c-.2.9-.8 1.7-1.7 1.7h-.8l.6-3h.8c.8 0 1.3.4 1.1 1.3z"
          />
        </svg>
      );

    case "ruby":
    case "rb":
      return (
        <svg
          viewBox="0 0 24 24"
          width={size}
          height={size}
          className={`${className} shrink-0 select-none`}
          aria-label="Ruby"
          role="img"
        >
          <path
            fill="#CC342D"
            d="M19.7 7.2l-3.9-4.8c-.3-.4-.8-.6-1.3-.6H9.5c-.5 0-1 .2-1.3.6L4.3 7.2c-.4.5-.4 1.2 0 1.7l7 8.7c.4.5 1 .5 1.4 0l7-8.7c.4-.5.4-1.2 0-1.7z"
          />
          <path
            fill="#FFFFFF"
            opacity="0.3"
            d="M8.5 2.4L4.8 7.3l7.2 9 7.2-9-3.7-4.9H8.5zm3.5 1.4l3.1 3.5h-6.2l3.1-3.5zm-4.4.6l-2.4 2.9h3.7l-1.3-2.9zm8.8 0l-1.3 2.9h3.7l-2.4-2.9z"
          />
        </svg>
      );

    case "kotlin":
    case "kt":
      return (
        <svg
          viewBox="0 0 24 24"
          width={size}
          height={size}
          className={`${className} shrink-0 select-none rounded-xs`}
          aria-label="Kotlin"
          role="img"
        >
          <path fill="url(#kotlin-grad)" d="M24 0H0v24h24L12 12z" />
          <defs>
            <linearGradient id="kotlin-grad" x1="0" y1="24" x2="24" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0095D5" />
              <stop offset="50%" stopColor="#7F52FF" />
              <stop offset="100%" stopColor="#C711E1" />
            </linearGradient>
          </defs>
        </svg>
      );

    case "swift":
    case "sw":
      return (
        <svg
          viewBox="0 0 24 24"
          width={size}
          height={size}
          className={`${className} shrink-0 select-none`}
          aria-label="Swift"
          role="img"
        >
          <path
            fill="#F05138"
            d="M21.5 17.8c-1.3 2.3-3.6 4.1-6.4 4.8 4.2-2.9 6.2-7.5 4.5-12.2-.1-.2-.2-.5-.3-.7 1.8 2.7 2.7 5.7 2.2 8.1zm-3.6-9.6c-.6-1.1-1.4-2.2-2.3-3.1 3.4 3.7 4.2 8.9 2.1 13.4-1.7 3.5-5.1 5.5-9 5.5-2.2 0-4.3-.6-6.2-1.7 4.7.7 9.8-1.5 12.3-5.7 2.3-3.9 1.4-8.8-1.5-11.8 1.8.8 3.4 2 4.6 3.4zM2.5 16.4C4.3 12.2 8.2 8.5 12.8 6.5c-3.7 2.6-6.7 6.4-8.3 10.8-.7 1.9-1 3.9-1 5.9.1-2.3-.3-4.7-1-6.8z"
          />
        </svg>
      );

    case "dart":
      return (
        <svg
          viewBox="0 0 24 24"
          width={size}
          height={size}
          className={`${className} shrink-0 select-none`}
          aria-label="Dart"
          role="img"
        >
          <path fill="#0175C2" d="M4.5 13.5L12 21l7.5-7.5L12 6z" />
          <path fill="#02569B" d="M12 6l7.5 7.5h-4.5L12 10.5z" />
          <path fill="#29B6F6" d="M4.5 13.5L12 6v4.5L7.5 15z" />
          <path fill="#00B4AB" d="M12 21l4.5-4.5H9z" />
        </svg>
      );

    case "zig":
      return (
        <svg
          viewBox="0 0 24 24"
          width={size}
          height={size}
          className={`${className} shrink-0 select-none`}
          aria-label="Zig"
          role="img"
        >
          <path
            fill="#EC915C"
            d="M3 5h18v3.5l-9.5 7.5H21V19H3v-3.5l9.5-7.5H3V5z"
          />
        </svg>
      );

    case "elixir":
    case "ex":
      return (
        <svg
          viewBox="0 0 24 24"
          width={size}
          height={size}
          className={`${className} shrink-0 select-none`}
          aria-label="Elixir"
          role="img"
        >
          <path
            fill="#4B275F"
            d="M12 2C8.5 7 6 11 6 15c0 3.3 2.7 6 6 6s6-2.7 6-6c0-4-2.5-8-6-13z"
          />
          <path
            fill="#A37ACC"
            d="M12 5c-2 3.5-3.5 6.5-3.5 9.5 0 2 1.5 3.5 3.5 3.5s3.5-1.5 3.5-3.5c0-3-1.5-6-3.5-9.5z"
          />
        </svg>
      );

    default:
      return (
        <span
          className={`${className} inline-flex items-center justify-center font-mono font-bold text-[8px] rounded-xs bg-zinc-800 border border-white/[0.1] text-zinc-300 shrink-0 select-none`}
          title={language}
        >
          {language.slice(0, 2).toUpperCase()}
        </span>
      );
  }
}
