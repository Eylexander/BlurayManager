"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";
import { LoaderCircle } from "@/components/common/LoaderCircle";
import { ROUTES } from "@/hooks/useRouteProtection";

const noopSubscribe = () => () => {};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, checkAuth } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  // False on the server and during hydration, where the persisted session
  // isn't readable yet; true once running in the browser
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

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

  // A persisted session renders the app (and the page's skeletons) right
  // away while checkAuth revalidates it; a failed check logs out and redirects.
  if (!hydrated || !isAuthenticated) {
    return <LoaderCircle />;
  }

  return (
    <div className="min-h-screen w-full bg-background">
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
