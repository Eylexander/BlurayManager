"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";
import { LoaderCircle } from "@/components/common/LoaderCircle";
import { ROUTES } from "@/hooks/useRouteProtection";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, checkAuth } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const verifyAuth = async () => {
      await checkAuth();
      setIsLoading(false);
    };

    verifyAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(ROUTES.AUTH.LOGIN);
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) {
    return <LoaderCircle />;
  }

  return (
    <div className="min-h-screen w-full bg-gray-50 dark:bg-dark-950">
      <Navbar />
      <div className="flex w-full overflow-x-hidden">
        <Sidebar />
        <main className="flex-1 w-full overflow-x-hidden p-4 sm:p-6 ml-0 lg:ml-64 mt-16 pb-24 lg:pb-6">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
