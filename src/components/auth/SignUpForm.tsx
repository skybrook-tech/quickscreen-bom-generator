import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../../lib/supabase';

const signUpSchema = z.object({
  fullName: z.string().min(2, 'Enter your full name'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type SignUpFormData = z.infer<typeof signUpSchema>;

interface SignUpFormProps {
  onSuccess?: () => void;
}

export function SignUpForm({ onSuccess }: SignUpFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormData>({ resolver: zodResolver(signUpSchema) });

  const onSubmit = async (data: SignUpFormData) => {
    setServerError(null);
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { full_name: data.fullName },
      },
    });
    if (error) {
      setServerError(error.message);
    } else {
      setEmailSent(true);
      onSuccess?.();
    }
  };

  if (emailSent) {
    return (
      <div className="text-center text-brand-text">
        <p className="text-lg font-medium mb-2">Check your email</p>
        <p className="text-sm text-brand-muted">
          We sent a confirmation link. Click it to activate your account.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-brand-text mb-1">
          Full name
        </label>
        <input
          {...register('fullName')}
          type="text"
          autoComplete="name"
          className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-md text-brand-text placeholder-brand-muted focus:outline-none focus:border-brand-accent"
          placeholder="Jane Smith"
        />
        {errors.fullName && (
          <p className="mt-1 text-xs text-red-400">{errors.fullName.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-text mb-1">
          Email
        </label>
        <input
          {...register('email')}
          type="email"
          autoComplete="email"
          className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-md text-brand-text placeholder-brand-muted focus:outline-none focus:border-brand-accent"
          placeholder="you@example.com"
        />
        {errors.email && (
          <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-text mb-1">
          Password
        </label>
        <input
          {...register('password')}
          type="password"
          autoComplete="new-password"
          className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-md text-brand-text placeholder-brand-muted focus:outline-none focus:border-brand-accent"
          placeholder="••••••••"
        />
        {errors.password && (
          <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>
        )}
      </div>

      {serverError && (
        <p className="text-sm text-red-400">{serverError}</p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-2 px-4 bg-brand-accent hover:bg-brand-accent-hover disabled:opacity-50 text-white font-medium rounded-md transition-colors"
      >
        {isSubmitting ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  );
}
