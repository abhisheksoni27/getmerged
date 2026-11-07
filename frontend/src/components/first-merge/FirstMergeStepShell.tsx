import React from "react";

interface StepShellProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Shared shell for First-Merge step bodies: step heading, description,
 * optional repo badge, header action, and step content.
 */
export function StepShell({
  icon,
  title,
  description,
  badge,
  action,
  children,
}: StepShellProps) {
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          {badge ? (
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                {icon} {title}
              </h3>
              {badge}
            </div>
          ) : (
            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5">
              {icon} {title}
            </h3>
          )}
          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
