import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { loginSchema, type LoginInput } from '@ytp/validators';
import { Button, Input } from '@ytp/ui';
import { loginUser } from '@/features/auth/auth.api.js';
import { PasswordInput } from '@/features/auth/components/PasswordInput.js';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (input: LoginInput) => {
    setServerError(null);
    try {
      await loginUser(input);
      const state: unknown = location.state;
      const redirectTo =
        state && typeof state === 'object' && 'from' in state && typeof state.from === 'string'
          ? state.from
          : '/dashboard';
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  return (
    <form
      onSubmit={(e) => {
        void handleSubmit(onSubmit)(e);
      }}
      className={serverError ? 'animate-shake space-y-4' : 'space-y-4'}
    >
      <h1 className="text-xl font-semibold text-zinc-900">Sign in</h1>

      <div className="space-y-1">
        <label htmlFor="email" className="text-sm font-medium text-zinc-700">
          Email
        </label>
        <Input id="email" type="email" {...register('email')} />
        {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className="text-sm font-medium text-zinc-700">
          Password
        </label>
        <PasswordInput id="password" {...register('password')} />
        {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
      </div>

      {serverError && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-red-600"
        >
          {serverError}
        </motion.p>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Signing in...' : 'Sign in'}
      </Button>

      <p className="text-center text-sm text-zinc-500">
        No account?{' '}
        <Link to="/register" className="font-medium text-brand-600 hover:underline">
          Sign up
        </Link>
      </p>
    </form>
  );
}
