import { useState } from 'react';
import { Wand2 } from 'lucide-react';
import { useFenceConfig } from '../../context/FenceConfigContext';
import { parseJobDescription } from '../../utils/parseJobDescription';

export function JobDescriptionParser() {
  const { dispatch } = useFenceConfig();
  const [text, setText] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleParse = () => {
    if (!text.trim()) return;
    const { config, detected } = parseJobDescription(text);

    if (detected.length === 0) {
      setStatus({ type: 'error', message: '⚠ Nothing detected — fill the form manually.' });
      return;
    }

    dispatch({ type: 'SET_CONFIG', config });
    setStatus({
      type: 'success',
      message: `✓ Detected: ${detected.join(', ')}`,
    });
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-brand-muted">
        Describe the job in plain English — run length, height, colour, system type, post mounting, etc.
        Matching fields will be filled automatically.
      </p>
      <textarea
        value={text}
        onChange={(e) => { setText(e.target.value); setStatus(null); }}
        onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleParse(); }}
        placeholder={`e.g. "20m run of 65mm QSHS horizontal slat fence, 1800mm high, surfmist matt, concreted in ground, post-to-post, 2 corners"`}
        rows={3}
        className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-md text-sm text-brand-text placeholder:text-brand-muted focus:outline-none focus:border-brand-accent resize-y"
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleParse}
          className="flex items-center gap-2 px-4 py-2 bg-brand-accent hover:bg-brand-accent-hover text-white text-sm font-medium rounded-md transition-colors"
        >
          <Wand2 size={14} />
          Parse Description
        </button>
        {status && (
          <p className={`text-sm font-medium ${status.type === 'success' ? 'text-green-700' : 'text-amber-700'}`}>
            {status.message}
          </p>
        )}
      </div>
    </div>
  );
}
