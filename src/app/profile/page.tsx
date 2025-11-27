"use client";

import { useAuth } from '@/hooks/use-auth';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { FilePenLine } from 'lucide-react';

function getInitials(name: string | null | undefined): string {
  if (!name) return 'U';
  const names = name.split(' ');
  const initials = names.map(n => n[0]).join('');
  return initials.slice(0, 2).toUpperCase();
}

export default function ProfilePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
        <div>
            <h1 className="text-4xl font-bold font-headline mb-8">My Profile</h1>
             <Card>
                <CardHeader className="flex flex-row items-center gap-4">
                    <Skeleton className="h-16 w-16 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                </CardContent>
            </Card>
        </div>
    );
  }

  if (!user) {
    return redirect('/login');
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold font-headline">My Profile</h1>
        <Button asChild variant="outline">
          <Link href="/profile/edit">
            <FilePenLine className="mr-2 h-4 w-4" />
            Edit Profile
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-6 space-y-0 pb-6">
            <Avatar className="h-20 w-20">
                {user.photoURL ? (
                    <AvatarImage src={user.photoURL} alt={user.displayName || user.email || 'User'} />
                ) : (
                    <AvatarFallback className="text-3xl">
                        {getInitials(user.displayName) || getInitials(user.email)}
                    </AvatarFallback>
                )}
            </Avatar>
            <div className="grid gap-1">
                <CardTitle className="text-2xl">{user.displayName || 'No display name'}</CardTitle>
                <CardDescription>{user.email}</CardDescription>
            </div>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="grid gap-2">
                <div className="font-semibold">User ID</div>
                <p className="text-muted-foreground font-mono text-sm">{user.uid}</p>
            </div>
            <div className="grid gap-2">
                <div className="font-semibold">Account Created</div>
                <p className="text-muted-foreground">{user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleString() : 'N/A'}</p>
            </div>
             <div className="grid gap-2">
                <div className="font-semibold">Last Signed In</div>
                <p className="text-muted-foreground">{user.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleString() : 'N/A'}</p>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
