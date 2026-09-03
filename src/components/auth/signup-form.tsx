'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import Link from 'next/link';
import { AuthFormError } from './auth-form-error';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { MailCheck, Eye, EyeOff, Loader2 } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.'}),
  email: z.string().email({ message: 'Please enter a valid email.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px" {...props}>
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.223,0-9.657-3.657-11.303-8H6.399v0.11C9.469,36.52,16.223,44,24,44z"/>
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C39.99,35.536,44,30.169,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
    </svg>
);


export function SignupForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  const handleAuthError = (err: any) => {
    console.error("Signup failed:", err);
    if (err.message?.toLowerCase().includes('already registered')) {
      setError('An account with this email already exists.');
    } else {
      setError('An unexpected error occurred. Please try again.');
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    setError(null);
    setSuccess(false);

    const handle = values.email.split('@')[0] || `user${Date.now().toString(36)}`;

    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          display_name: values.name,
          handle,
        },
        // Deliberately /home, not /auth/callback: confirmed live that this
        // client never writes a PKCE code_verifier on signUp(), so the
        // confirmation link always delivers the session as a URL hash
        // fragment (#access_token=...), never a ?code=. Fragments never
        // reach the server, so routing this through /auth/callback would
        // just bounce through its "no code" branch to /login?error=... —
        // a real but pointless detour, since AuthProvider's own
        // onAuthStateChange listener (auth-context.tsx) is what actually
        // picks up the session and handles new-signup onboarding, and it
        // runs on any page. Without emailRedirectTo at all, this fell back
        // to the bare Site URL, which root page.tsx redirects to /home
        // anyway — but only by accident, and only for whatever the Site
        // URL happens to be set to.
        emailRedirectTo: `${window.location.origin}/home`,
      },
    });

    if (error) {
      handleAuthError(error);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      handleAuthError(error);
      setGoogleLoading(false);
    }
  }

  if (success) {
    return (
        <div className="space-y-4">
            <Alert variant="default" className="border-green-500/50 text-green-700 dark:text-green-400 [&>svg]:text-green-700 dark:[&>svg]:text-green-400">
                <MailCheck className="h-4 w-4" />
                <AlertTitle>Welcome to BHOLO!</AlertTitle>
                <AlertDescription>
                   Your account has been created. We've sent a verification link to your email address. Please click the link to continue.
                </AlertDescription>
            </Alert>
             <Button onClick={() => router.push('/login')} className="w-full">
                Back to Log In
            </Button>
        </div>
    )
  }

  return (
    <div className="flex flex-col gap-y-6">
        <div className="hidden lg:block text-left">
          <h1 className="text-xl font-bold">Create your account</h1>
        </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <AuthFormError message={error} />
           <fieldset disabled={loading || googleLoading} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input placeholder="Full Name" {...field} className="bg-secondary text-foreground border-border h-11"/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input placeholder="Email" {...field} className="bg-secondary text-foreground border-border h-11"/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="relative">
                      <Input type={showPassword ? "text" : "password"} placeholder="Password" {...field} className="bg-secondary text-foreground border-border h-11"/>
                      <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground"
                      >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full h-11 text-base" disabled={loading || googleLoading}>
              {loading || googleLoading ? <Loader2 className="animate-spin" /> : 'Create Account'}
            </Button>
          </fieldset>
        </form>
      </Form>
       <div className="flex items-center gap-4">
            <div className="h-px bg-border flex-1" />
            <span className="text-sm font-semibold text-muted-foreground">OR</span>
            <div className="h-px bg-border flex-1" />
       </div>

        <Button variant="outline" className="w-full h-11 text-base" onClick={handleGoogleSignIn} disabled={loading || googleLoading}>
             {googleLoading ? (
                 <>
                    <Loader2 className="mr-2 animate-spin" />
                    Checking...
                </>
            ) : (
                <>
                    <GoogleIcon className="mr-2" />
                    Sign up with Google
                </>
            )}
        </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
