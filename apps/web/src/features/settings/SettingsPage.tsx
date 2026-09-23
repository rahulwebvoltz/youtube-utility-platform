import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, KeyRound, Trash2, UserRound } from 'lucide-react';
import {
  changePasswordSchema,
  updateProfileSchema,
  type ChangePasswordInput,
  type UpdateProfileInput,
} from '@ytp/validators';
import { Button, Card, Dialog, Input, useToast } from '@ytp/ui';
import { useAuthStore } from '@/stores/auth-store.js';
import { changePassword, deleteAccount, updateProfile } from '@/features/auth/auth.api.js';
import { PasswordInput } from '@/features/auth/components/PasswordInput.js';

function ProfileSection() {
  const user = useAuthStore((state) => state.user);
  const { show } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { name: user?.name ?? '' },
  });

  const onSubmit = async (input: UpdateProfileInput) => {
    try {
      await updateProfile(input);
      show({ title: 'Profile updated', variant: 'success' });
    } catch (err) {
      show({
        title: 'Could not update profile',
        description: err instanceof Error ? err.message : 'Something went wrong',
        variant: 'error',
      });
    }
  };

  return (
    <Card className="space-y-4 p-6">
      <div className="flex items-center gap-2">
        <UserRound size={18} className="text-brand-600" />
        <h2 className="text-lg font-semibold text-zinc-900">Profile</h2>
      </div>

      <form
        className="space-y-3"
        onSubmit={(e) => {
          void handleSubmit(onSubmit)(e);
        }}
      >
        <div className="space-y-1">
          <label htmlFor="name" className="text-sm font-medium text-zinc-700">
            Name
          </label>
          <Input id="name" {...register('name')} />
          {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
        </div>

        <Button type="submit" disabled={isSubmitting || !isDirty}>
          {isSubmitting ? 'Saving...' : 'Save changes'}
        </Button>
      </form>
    </Card>
  );
}

const changePasswordFormSchema = changePasswordSchema
  .extend({ confirmPassword: z.string().min(1, 'Please confirm your new password') })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type ChangePasswordFormValues = z.infer<typeof changePasswordFormSchema>;

function PasswordSection() {
  const { show } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({ resolver: zodResolver(changePasswordFormSchema) });

  const onSubmit = async (input: ChangePasswordFormValues) => {
    const payload: ChangePasswordInput = {
      currentPassword: input.currentPassword,
      newPassword: input.newPassword,
    };
    try {
      await changePassword(payload);
      reset();
      show({ title: 'Password changed', variant: 'success' });
    } catch (err) {
      show({
        title: 'Could not change password',
        description: err instanceof Error ? err.message : 'Something went wrong',
        variant: 'error',
      });
    }
  };

  return (
    <Card className="space-y-4 p-6">
      <div className="flex items-center gap-2">
        <KeyRound size={18} className="text-brand-600" />
        <h2 className="text-lg font-semibold text-zinc-900">Password</h2>
      </div>

      <form
        className="space-y-3"
        onSubmit={(e) => {
          void handleSubmit(onSubmit)(e);
        }}
      >
        <div className="space-y-1">
          <label htmlFor="currentPassword" className="text-sm font-medium text-zinc-700">
            Current password
          </label>
          <PasswordInput id="currentPassword" {...register('currentPassword')} />
          {errors.currentPassword && (
            <p className="text-xs text-red-600">{errors.currentPassword.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="newPassword" className="text-sm font-medium text-zinc-700">
            New password
          </label>
          <PasswordInput id="newPassword" {...register('newPassword')} />
          {errors.newPassword && (
            <p className="text-xs text-red-600">{errors.newPassword.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="confirmPassword" className="text-sm font-medium text-zinc-700">
            Confirm new password
          </label>
          <PasswordInput id="confirmPassword" {...register('confirmPassword')} />
          {errors.confirmPassword && (
            <p className="text-xs text-red-600">{errors.confirmPassword.message}</p>
          )}
        </div>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Updating...' : 'Update password'}
        </Button>
      </form>
    </Card>
  );
}

function DangerZoneSection() {
  const navigate = useNavigate();
  const { show } = useToast();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const closeDialog = () => {
    setOpen(false);
    setPassword('');
  };

  const handleDelete = async () => {
    if (!password) return;
    setIsDeleting(true);
    try {
      await deleteAccount({ password });
      navigate('/login', { replace: true });
    } catch (err) {
      show({
        title: 'Could not delete account',
        description: err instanceof Error ? err.message : 'Something went wrong',
        variant: 'error',
      });
      setIsDeleting(false);
    }
  };

  return (
    <Card className="space-y-4 border-red-200 bg-red-50/40 p-6">
      <div className="flex items-center gap-2">
        <AlertTriangle size={18} className="text-red-600" />
        <h2 className="text-lg font-semibold text-zinc-900">Danger zone</h2>
      </div>
      <p className="text-sm text-zinc-600">
        Permanently delete your account and everything in it - jobs, collections, and media files.
        This cannot be undone.
      </p>
      <Button
        variant="danger"
        onClick={() => {
          setOpen(true);
        }}
      >
        <Trash2 size={14} />
        Delete account
      </Button>

      <Dialog open={open} onClose={closeDialog} title="Delete your account?">
        <div className="space-y-3">
          <p className="text-sm text-zinc-500">
            This will permanently delete your account and everything in it. Enter your password to
            confirm.
          </p>
          <PasswordInput
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
            }}
            placeholder="Password"
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleDelete();
            }}
          />
          <Button
            variant="danger"
            className="w-full"
            disabled={!password || isDeleting}
            onClick={() => {
              void handleDelete();
            }}
          >
            {isDeleting ? 'Deleting...' : 'Permanently delete account'}
          </Button>
        </div>
      </Dialog>
    </Card>
  );
}

export function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold text-zinc-900">Settings</h1>
      <ProfileSection />
      <PasswordSection />
      <DangerZoneSection />
    </div>
  );
}
