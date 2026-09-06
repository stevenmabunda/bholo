'use client';

import { Button, type ButtonProps } from '@/components/ui/button';
import { useAuthModal } from '@/contexts/auth-modal-context';

/**
 * A landing-page CTA that opens the auth modal instead of navigating —
 * same visual API as Button (variant/size/className) so it drops into
 * spots that used to be `<Button asChild><Link href="/login">…</Link></Button>`
 * without any layout changes.
 */
export function AuthTriggerButton({
  mode,
  children,
  ...buttonProps
}: { mode: 'login' | 'signup' } & Omit<ButtonProps, 'onClick'>) {
  const { openLogin, openSignup } = useAuthModal();
  return (
    <Button {...buttonProps} onClick={mode === 'login' ? openLogin : openSignup}>
      {children}
    </Button>
  );
}
