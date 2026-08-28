import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    paid: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    paid?: boolean;
    email?: string;
    name?: string | null;
    picture?: string | null;
  }
}
