'use client';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useAuthModal } from '@/contexts/auth-modal-context';
import { LoginForm } from './login-form';
import { SignupForm } from './signup-form';

/**
 * Renders once, at the top of the landing page (see AuthModalProvider) —
 * every "Log in" / "Join BHOLO" button on the page just flips this open in
 * whichever mode it needs rather than navigating to /login or /signup.
 */
export function AuthModal() {
  const { isOpen, mode, close, openLogin, openSignup } = useAuthModal();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-w-sm border-border bg-background p-6">
        {/* Radix requires an accessible title even when the form itself
            already renders its own heading — visually hidden so it isn't
            doubled up on screen. */}
        <DialogTitle className="sr-only">
          {mode === 'login' ? 'Log in to BHOLO' : 'Create your BHOLO account'}
        </DialogTitle>
        {mode === 'login' ? (
          <LoginForm onSwitchToSignup={openSignup} />
        ) : (
          <SignupForm onSwitchToLogin={openLogin} />
        )}
      </DialogContent>
    </Dialog>
  );
}
