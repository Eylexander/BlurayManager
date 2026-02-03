"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import useRouteProtection, { ROUTES } from "@/hooks/useRouteProtection";
import { LoaderCircle } from "@/components/common/LoaderCircle";

export default function Home() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, checkAuth } = useAuthStore();

  // Use route protection
  useRouteProtection(pathname, false);

  useEffect(() => {
    if (isAuthenticated) {
      router.push(ROUTES.DASHBOARD.HOME);
    } else {
      router.push(ROUTES.AUTH.LOGIN);
    }
  }, [isAuthenticated, router]);

  return <LoaderCircle />;
}
