'use client';

import { AuthLayout } from '@/components/auth/auth-layout';
import { SignupForm } from '@/components/auth/signup-form';

export function SignupView({ chromeless }: { chromeless: boolean }) {
  return (
    <AuthLayout chromeless={chromeless}>
      <SignupForm />
    </AuthLayout>
  );
}
