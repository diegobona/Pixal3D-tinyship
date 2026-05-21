"use client";

import { useState } from "react";
import { authClientReact } from "@libs/auth/authClient";
import { SocialButton, type SocialProvider } from "@libs/react-shared/ui/social-button";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import { notify as toast } from "@/lib/notify";

interface SocialAuthProps extends React.HTMLAttributes<HTMLDivElement> {
  providers?: SocialProvider[];
}

const defaultProviders: SocialProvider[] = ["google"];

export function SocialAuth({
  className,
  providers = defaultProviders,
  ...props
}: SocialAuthProps) {
  const { t } = useTranslation();
  const [loadingProvider, setLoadingProvider] = useState<SocialProvider | null>(null);

  const handleProviderClick = async (provider: SocialProvider) => {
    if (loadingProvider) return;

    const params = new URLSearchParams(window.location.search);
    const returnTo = params.get("returnTo");
    const callbackURL = returnTo ? `${window.location.origin}${returnTo}` : undefined;

    setLoadingProvider(provider);

    try {
      const { error } = await authClientReact.signIn.social({
        provider,
        ...(callbackURL && { callbackURL }),
      });

      if (error) {
        console.error("Social login error:", error);
        toast.error(error.message || t.common.unexpectedError);
      }
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <div className={cn("grid grid-cols-1 gap-3", className)} {...props}>
      {providers.map((provider) => (
        <SocialButton
          key={provider}
          provider={provider}
          onClick={() => handleProviderClick(provider)}
          loading={loadingProvider === provider}
          disabled={loadingProvider !== null && loadingProvider !== provider}
        />
      ))}
    </div>
  );
}
