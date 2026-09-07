
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface LoginOrSignupDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoginOrSignupDialog({ isOpen, onOpenChange }: LoginOrSignupDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Join the conversation</DialogTitle>
          <DialogDescription className="pt-2">
            To like, reply, or follow, you need an account. Join BHOLO to get in on the action.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
            <Button asChild className="w-full">
                <Link href="/signup" onClick={() => onOpenChange(false)}>Create account</Link>
            </Button>
            <Button asChild variant="secondary" className="w-full">
                <Link href="/" onClick={() => onOpenChange(false)}>Sign in</Link>
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
