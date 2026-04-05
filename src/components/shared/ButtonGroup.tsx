import { memo } from 'react';
import type { ReactNode } from 'react';

export interface ButtonGroupOption<T extends string> {
  value: T;
  label: string;
  description?: string;
  icon?: ReactNode;
}

interface ButtonGroupProps<T extends string> {
  options: readonly ButtonGroupOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  variant?: 'default' | 'system-type';
  'data-testid'?: string;
}

function ButtonGroupInner<T extends string>({
  options,
  value,
  onChange,
  disabled,
  variant = 'default',
  'data-testid': testId,
}: ButtonGroupProps<T>) {
  const isSystemType = variant === 'system-type';

  return (
    <div
      role="group"
      data-testid={testId}
      className={isSystemType ? 'flex gap-2' : 'flex gap-1 flex-wrap'}
    >
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            aria-pressed={isActive}
            data-testid={testId ? `${testId}-option-${opt.value}` : undefined}
            onClick={() => onChange(opt.value)}
            className={[
              'border rounded transition-colors',
              isSystemType
                ? 'flex-1 py-2.5 px-3 text-left'
                : 'py-1.5 px-3 text-sm',
              isActive
                ? 'border-brand-accent bg-brand-accent/10 text-brand-accent font-semibold'
                : 'border-brand-border bg-brand-bg text-brand-text hover:border-brand-accent',
              disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
            ].join(' ')}
          >
            {isSystemType ? (
              <>
                {opt.icon && (
                  <div className={`mb-1.5 ${isActive ? 'text-brand-accent' : 'text-brand-muted'}`}>
                    {opt.icon}
                  </div>
                )}
                <div className="text-sm font-bold leading-tight">{opt.value}</div>
                {opt.description && (
                  <div className={`text-xs mt-0.5 leading-tight ${isActive ? 'text-brand-accent/80' : 'text-brand-muted'}`}>
                    {opt.description}
                  </div>
                )}
              </>
            ) : (
              opt.label
            )}
          </button>
        );
      })}
    </div>
  );
}

export const ButtonGroup = memo(ButtonGroupInner) as typeof ButtonGroupInner;
