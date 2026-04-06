import { Check } from 'lucide-react';

type WizardStep = 'entry' | 'configure' | 'bom';

const STEPS: { id: WizardStep; label: string }[] = [
  { id: 'entry',     label: 'Start' },
  { id: 'configure', label: 'Configure' },
  { id: 'bom',       label: 'Bill of Materials' },
];

interface WizardStepIndicatorProps {
  currentStep: WizardStep;
  onStepClick: (step: WizardStep) => void;
}

export function WizardStepIndicator({ currentStep, onStepClick }: WizardStepIndicatorProps) {
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <nav className="flex items-center justify-center select-none">
      {STEPS.map((step, idx) => {
        const isDone    = idx < currentIndex;
        const isActive  = idx === currentIndex;
        const isFuture  = idx > currentIndex;

        return (
          <div key={step.id} className="flex items-center">
            {/* Step node */}
            <button
              type="button"
              onClick={() => isDone && onStepClick(step.id)}
              disabled={!isDone}
              className={`flex items-center gap-2 px-2 py-1 rounded-lg text-sm font-medium transition-all duration-200
                ${isActive  ? 'text-brand-accent cursor-default' : ''}
                ${isDone    ? 'text-brand-muted hover:text-brand-text cursor-pointer hover:bg-brand-border/20 rounded-lg' : ''}
                ${isFuture  ? 'text-brand-border cursor-default' : ''}
              `}
            >
              {/* Circle indicator */}
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-200 shrink-0
                ${isActive  ? 'border-brand-accent bg-brand-accent text-white scale-110 shadow-sm shadow-brand-accent/30' : ''}
                ${isDone    ? 'border-brand-muted bg-brand-muted text-brand-bg' : ''}
                ${isFuture  ? 'border-brand-border text-brand-border' : ''}
              `}>
                {isDone ? <Check size={11} strokeWidth={3} /> : idx + 1}
              </span>

              {/* Label */}
              <span className={`${isFuture ? 'hidden sm:inline' : ''} transition-colors`}>
                {step.label}
              </span>
            </button>

            {/* Connector line */}
            {idx < STEPS.length - 1 && (
              <div className={`relative w-8 sm:w-14 h-px mx-1 overflow-hidden`}>
                <div className="absolute inset-0 bg-brand-border" />
                <div
                  className={`absolute inset-0 bg-brand-muted transition-transform duration-500 origin-left ${idx < currentIndex ? 'scale-x-100' : 'scale-x-0'}`}
                />
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
