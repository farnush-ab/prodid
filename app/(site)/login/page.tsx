"use client";

import { Suspense, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/lib/icons";
import { pageHref } from "@/lib/page";
import { LoginPanel } from "@/components/LoginPanel";

function safeCallback(raw: string | null) {
  if (!raw) return pageHref("account");
  if (!raw.startsWith("/") || raw.startsWith("//")) return pageHref("account");
  return raw;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const callbackUrl = safeCallback(searchParams.get("callbackUrl"));

  useEffect(() => {
    if (status === "authenticated") router.replace(callbackUrl);
  }, [status, callbackUrl, router]);

  return <LoginPanel redirectTo={callbackUrl} />;
}

export default function LoginPage() {
  return (
    <>
      <div className="page-head">
        <div className="container">
          <h1>
            <Icon name="user" /> ورود به حساب
          </h1>
          <p>با شماره موبایل وارد شوید؛ ثبت‌نام جداگانه لازم نیست</p>
        </div>
      </div>
      <main className="container">
        <Suspense>
          <LoginForm />
        </Suspense>
      </main>
    </>
  );
}
