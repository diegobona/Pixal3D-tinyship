import * as React from "react";
import { Button } from "./button";
import { cn } from "@libs/ui/utils/cn";
import GoogleIcon from "@libs/ui/icons/google.svg";
import { useSharedApp } from "../providers/app-context";

export type SocialProvider = "google";

interface SocialButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  provider: SocialProvider;
  loading?: boolean;
}

export function SocialButton({ provider: _provider, className, onClick, loading, disabled, ...props }: SocialButtonProps) {
  const { t } = useSharedApp();

  return (
    <Button
      variant="outline"
      className={cn("w-full bg-background hover:bg-accent hover:text-accent-foreground", className)}
      onClick={onClick}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
      ) : (
        <GoogleIcon className="mr-2 h-4 w-4" />
      )}
      {t.auth.signin.socialProviders.google}
    </Button>
  );
}
