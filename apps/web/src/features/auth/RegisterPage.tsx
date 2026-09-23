import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { registerSchema, type RegisterInput } from '@ytp/validators';
import { Button, Input } from '@ytp/ui';
import { registerUser } from '@/features/auth/auth.api.js';
import { PasswordInput } from '@/features/auth/components/PasswordInput.js';

export function RegisterPage() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (input: RegisterInput) => {
    setServerError(null);
    try {
      await registerUser(input);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Registration failed');
    }
  };

  return (
    <form
      onSubmit={(e) => {
        void handleSubmit(onSubmit)(e);
      }}
      className={serverError ? 'animate-shake space-y-4' : 'space-y-4'}
    >
      <h1 className="text-xl font-semibold text-zinc-900">Create your account</h1>

      <div className="space-y-1">
        <label htmlFor="name" className="text-sm font-medium text-zinc-700">
          Name
        </label>
        <Input id="name" type="text" {...register('name')} />
        {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
      </div>

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
        {isSubmitting ? 'Creating account...' : 'Create account'}
      </Button>

      <p className="text-center text-sm text-zinc-500">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-brand-600 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
