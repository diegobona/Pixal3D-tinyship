import { use } from 'react';
import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export default function AuthLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}>) {
  const { lang } = use(params);
  return (
    <main
      data-testid="pixal3d-auth-shell"
      className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-[#06142d] bg-[radial-gradient(circle_at_50%_0%,rgba(72,189,255,0.18),transparent_34%),linear-gradient(180deg,#071b3d_0%,#06142d_48%,#040914_100%)] p-6 text-[#f5f8ff] md:p-10"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#48bdff]/65 to-transparent" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[680px] -translate-x-1/2 rounded-full bg-[#00f08a]/10 blur-3xl" />
      <div className="relative z-10 flex w-full max-w-sm flex-col gap-6">
        <Link href={`/${lang}`} className="self-center">
          <Logo size="md" />
        </Link>
        {children}
      </div>
    </main>
  );
}
