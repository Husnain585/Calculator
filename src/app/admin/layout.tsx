"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { getAuth, signOut } from "firebase/auth";
import { app } from "@/lib/firebase";
import { Button } from "@/components/ui/button";

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname(); // To highlight active link
  const auth = getAuth(app);
  const [isAdmin, setIsAdmin] = useState(false);

  // ------------------ Verify Admin ------------------ //
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else {
        user.getIdTokenResult().then((idTokenResult) => {
          if (idTokenResult.claims.admin) {
            setIsAdmin(true);
          } else {
            router.push("/"); // Non-admin redirect
          }
        });
      }
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  if (loading || !user || !isAdmin) return null;

  // ------------------ Helper: Active Link ------------------ //
  const isActive = (path: string) => {
    if (path === "/admin") {
      return pathname === "/admin";
    }
    return pathname.startsWith(path);
  };

  return (
    <div className="flex min-h-screen w-full bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 h-screen bg-white border-r border-gray-200 flex flex-col justify-between fixed left-0 top-0 z-10">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-8">Admin Panel</h2>
          <nav className="flex flex-col space-y-3">
            <Button
              variant={isActive("/admin") ? "default" : "ghost"}
              className="justify-start w-full"
              onClick={() => router.push("/admin")}
            >
              Dashboard
            </Button>
            <Button
              variant={isActive("/admin/users") ? "default" : "ghost"}
              className="justify-start w-full"
              onClick={() => router.push("/admin/users")}
            >
              Users
            </Button>
            <Button
              variant={isActive("/admin/calculators") ? "default" : "ghost"}
              className="justify-start w-full"
              onClick={() => router.push("/admin/calculators")}
            >
              Calculators
            </Button>
            <Button
              variant={isActive("/admin/settings") ? "default" : "ghost"}
              className="justify-start w-full"
              onClick={() => router.push("/admin/settings")}
            >
              Settings
            </Button>
          </nav>
        </div>

        <div className="p-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-3 truncate">{user?.email}</p>
          <Button variant="destructive" className="w-full" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8 min-h-screen">{children}</main>
    </div>
  );
}
