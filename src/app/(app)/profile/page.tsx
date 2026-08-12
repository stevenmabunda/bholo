'use client';
import { useAuth } from '@/hooks/use-auth';
import { redirect } from 'next/navigation';
import { useEffect } from 'react';

export default function MyProfilePage() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        redirect(`/profile/${user.id}`);
      } else {
        // If for some reason user is not logged in, redirect to login
        redirect('/login');
      }
    }
  }, [user, loading]);

  // You can return a loading spinner here while redirecting
  return (
    <div className="flex h-screen items-center justify-center">
      <p>Loading profile...</p>
    </div>
  );
}
