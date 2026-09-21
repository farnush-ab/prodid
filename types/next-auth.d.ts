import "next-auth";
import "next-auth/jwt";
import type { UserRole } from "@/lib/roles";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      phone: string;
      name?: string | null;
      role?: UserRole;
    };
  }

  interface User {
    id: string;
    phone: string;
    name?: string | null;
    role?: UserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    phone: string;
    name?: string | null;
    role?: UserRole;
  }
}
