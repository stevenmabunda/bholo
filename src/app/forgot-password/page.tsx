'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { AuthFormError } from '@/components/auth/auth-form-error';
import { AuthLayout } from '@/components/auth/auth-layout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { MailCheck } from 'lucide-react';
import Link from 'next/link';

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }),
});

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    setError(null);
    setSuccess(false);

    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/profile`,
    });

    if (error) {
      setError('Could not send reset email. Please check if the email address is correct.');
      console.error(error);
    } else {
      setSuccess(true);
    }
    setLoading(false);
  }

  return (
    <AuthLayout>
        {success ? (
             <div className="space-y-4">
                <Alert variant="default" className="border-green-500/50 text-green-700 dark:text-green-400 [&>svg]:text-green-700 dark:[&>svg]:text-green-400">
                    <MailCheck className="h-4 w-4" />
                    <AlertTitle>Check your email</AlertTitle>
                    <AlertDescription>
                        We've sent a password reset link to your email address.
                    </AlertDescription>
                </Alert>
                <Button asChild className="w-full">
                    <Link href="/login">Back to Log In</Link>
                </Button>
            </div>
        ) : (
            <div className="flex flex-col gap-y-6">
                <div className="text-left">
                    <h1 className="text-xl font-bold">Reset your password</h1>
                    <p className="text-muted-foreground text-sm mt-1">Enter your email and we'll send you a link to get back into your account.</p>
                </div>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <AuthFormError message={error} />
                    <fieldset disabled={loading} className="space-y-4">
                        <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                            <FormControl>
                                <Input placeholder="Email" {...field} className="bg-secondary text-foreground border-border h-11" />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <Button type="submit" className="w-full mt-2 h-11 text-base" disabled={loading}>
                        {loading ? 'Sending...' : 'Send Reset Link'}
                        </Button>
                    </fieldset>
                    </form>
                </Form>
                 <p className="text-center text-sm">
                    <Link href="/login" className="font-semibold text-primary hover:underline">
                        Back to Log in
                    </Link>
                </p>
            </div>
        )}
    </AuthLayout>
  );
}
