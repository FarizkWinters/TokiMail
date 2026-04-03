import { useEffect } from "react";
import { useLocation } from "wouter";
import { isAdminLoggedIn } from "@/lib/admin-auth";

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isAdminLoggedIn()) {
      navigate("/admin/login");
    }
  }, [navigate]);

  if (!isAdminLoggedIn()) return null;

  return <>{children}</>;
}
