import React from "react";

interface FieldProps {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
}

/** Shared label/control/hint/error triple wrapper. */
export function Field({ label, htmlFor, hint, error, children }: FieldProps) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block text-xs font-mono text-zinc-300 uppercase tracking-wider font-bold mb-1.5"
      >
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-[11px] font-mono text-rose-400 mt-1">{error}</p>
      ) : hint ? (
        <p className="text-[11px] font-mono text-zinc-500 mt-1">{hint}</p>
      ) : null}
    </div>
  );
}

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string | null;
}

export function TextInput({ label, hint, error, id, ...inputProps }: TextInputProps) {
  return (
    <Field label={label} htmlFor={id} hint={hint} error={error}>
      <input
        id={id}
        {...inputProps}
        className="w-full px-3.5 py-2.5 rounded-lg bg-black/60 border border-white/[0.12] text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 transition-colors"
      />
    </Field>
  );
}

interface TextAreaInputProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
  error?: string | null;
}

export function TextAreaInput({ label, hint, error, id, ...areaProps }: TextAreaInputProps) {
  return (
    <Field label={label} htmlFor={id} hint={hint} error={error}>
      <textarea
        id={id}
        {...areaProps}
        className="w-full px-3.5 py-2.5 rounded-lg bg-black/60 border border-white/[0.12] text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 transition-colors leading-relaxed"
      />
    </Field>
  );
}
