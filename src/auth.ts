import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { authSecret, googleAuthConfigured } from "@/lib/auth-env";
import { emailHasPaidSheetshot } from "@/lib/polar";

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  secret: authSecret(),
  trustHost: true,
  session: { strategy: "jwt" },
  providers: googleAuthConfigured() ? [Google] : [],
  callbacks: {
    async jwt({ token, user, trigger }) {
      const email = user?.email ?? token.email ?? undefined;
      if (user) {
        token.email = user.email ?? undefined;
        token.name = user.name ?? undefined;
        token.picture = user.image ?? undefined;
      }
      if (email && (user || trigger === "signIn" || trigger === "update")) {
        token.paid = await emailHasPaidSheetshot(email);
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.email = token.email ?? session.user.email;
        session.user.name = token.name ?? session.user.name;
        session.user.image = token.picture ?? session.user.image;
      }
      session.paid = token.paid === true;
      return session;
    },
  },
});
