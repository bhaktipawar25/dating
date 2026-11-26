"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AuthServiceError,
  authService,
  type AuthUser,
} from "@/services/auth/authService";
import { profileService } from "@/services/profile/profileService";
import {
  SecurityServiceError,
  securityService,
} from "@/services/security/securityService";

export type OnboardingStageRequirement =
  | "security-check"
  | "personal-info"
  | "completed";

interface OnboardingGuardProps {
  requiredStage: OnboardingStageRequirement;
  children:
    | React.ReactNode
    | ((context: { user?: AuthUser }) => React.ReactNode);
}

/**
 * Coordinates continuous route protection across Feature 1 (Auth + Email OTP),
 * Feature 2 (Security Check KYC), and Feature 3 (Personal Info Onboarding).
 */
export function OnboardingGuard({
  requiredStage,
  children,
}: OnboardingGuardProps) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [sessionUser, setSessionUser] = useState<AuthUser | undefined>(
    undefined
  );

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function verifyAccess() {
      try {
        const session = await authService.getSession(controller.signal);
        if (!active) return;

        if (!session.authenticated) {
          router.replace("/login");
          return;
        }

        if (session.user && !session.user.emailVerified) {
          const emailQuery = session.user.email
            ? `?email=${encodeURIComponent(session.user.email)}`
            : "";
          router.replace(`/verify-email${emailQuery}`);
          return;
        }

        setSessionUser(session.user);

        // Verify session cookie + KYC status via backend contract
        const kycStatus = await securityService.getKycStatus(controller.signal);
        if (!active) return;

        if (
          (requiredStage === "personal-info" ||
            requiredStage === "completed") &&
          kycStatus.overallStatus !== "VERIFIED"
        ) {
          router.replace("/security-check");
          return;
        }

        if (requiredStage === "completed") {
          const profile = await profileService.getPersonalInfo(
            controller.signal
          );
          if (!active) return;
          if (!profile?.profileCompleted) {
            router.replace("/onboarding/personal-info");
            return;
          }
        }

        if (active) {
          setAuthorized(true);
        }
      } catch (err) {
        if (!active) return;
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        if (
          (err instanceof AuthServiceError ||
            err instanceof SecurityServiceError) &&
          err.status === 401
        ) {
          router.replace("/login");
          return;
        }
        if (
          (err instanceof AuthServiceError ||
            err instanceof SecurityServiceError) &&
          err.status === 403
        ) {
          router.replace("/verify-email");
          return;
        }
        // Fail closed for protected onboarding stages
        if (requiredStage === "security-check") {
          setAuthorized(true);
        } else {
          router.replace("/security-check");
        }
      }
    }

    verifyAccess();

    return () => {
      active = false;
      controller.abort();
    };
  }, [requiredStage, router]);

  if (!authorized) {
    return (
      <div className="date2-auth-backdrop flex min-h-screen items-center justify-center px-4 font-helvetica">
        <div className="flex flex-col items-center gap-3 rounded-[24px] border border-date2-border bg-date2-white px-8 py-7 text-center shadow-indigoCard">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-date2-paleLavender border-t-date2-midnight" />
          <p className="text-sm font-bold text-date2-slate">
            Checking your Date² account progress...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>{typeof children === "function" ? children({ user: sessionUser }) : children}</>
  );
}
