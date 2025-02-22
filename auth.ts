// استيراد NextAuth و User من مكتبة next-auth
import NextAuth, { User } from "next-auth";
// استيراد دالة compare من مكتبة bcryptjs لمقارنة كلمات المرور
import { compare } from "bcryptjs";
// استيراد CredentialsProvider من مكتبة next-auth/providers/credentials
import CredentialsProvider from "next-auth/providers/credentials";
// استيراد db من ملف قاعدة البيانات
import { db } from "@/database/drizzle";
// استيراد users من مخطط قاعدة البيانات
import { users } from "@/database/schema";
// استيراد دالة eq من مكتبة drizzle-orm للمقارنة
import { eq } from "drizzle-orm";

// تكوين NextAuth
export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET, // تعيين السر الخاص بـ NextAuth
  session: {
    strategy: "jwt", // استخدام JWT لإدارة الجلسات
  },
  providers: [
    CredentialsProvider({
      async authorize(credentials) {
        // التحقق من وجود البريد الإلكتروني وكلمة المرور في المدخلات
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // البحث عن المستخدم في قاعدة البيانات باستخدام البريد الإلكتروني
        const user = await db
          .select()
          .from(users)
          .where(eq(users.email, credentials.email.toString()))
          .limit(1);

        // إذا لم يتم العثور على المستخدم، إرجاع null
        if (user.length === 0) return null;

        // التحقق من صحة كلمة المرور
        const isPasswordValid = await compare(
          credentials.password.toString(),
          user[0].password
        );

        // إذا كانت كلمة المرور غير صحيحة، إرجاع null
        if (!isPasswordValid) return null;

        // إرجاع معلومات المستخدم
        return {
          id: user[0].id.toString(),
          email: user[0].email,
          name: user[0].fullName,
        } as User;
      },
    }),
  ],
  pages: {
    signIn: "/sign-in", // تعيين صفحة تسجيل الدخول
  },
  callbacks: {
    async jwt({ token, user }) {
      // إذا كان هناك مستخدم، تعيين معرف المستخدم واسم المستخدم في الرمز المميز
      if (user) {
        token.id = user.id;
        token.name = user.name;
      }

      return token;
    },
    async session({ session, token }) {
      // تعيين معرف المستخدم واسم المستخدم في الجلسة
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
      }

      return session;
    },
  },
});
 