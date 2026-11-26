"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/auth/authService";
import { profileService } from "@/services/profile/profileService";
import { securityService } from "@/services/security/securityService";
import { Date2Logo } from "./Date2Logo";

/**
 * Animated entry splash screen mirroring Flutter's SplashScreen (`splash_screen.dart`).
 * Resolves the user's current auth & verification stage and navigates cleanly.
 */
export function SplashScreen() {
  const router = useRouter();
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    let cancelled = false;

    const resolveDestination = async () => {
      const waitMin = new Promise<void>((resolve) =>
        setTimeout(resolve, 1800)
      );

      let destination = "/welcome";

      try {
        const session = await authService.getSession();
        if (session.authenticated && session.user) {
          if (!session.user.emailVerified) {
            destination = `/verify-email?email=${encodeURIComponent(
              session.user.email
            )}`;
          } else {
            try {
              const kyc = await securityService.getKycStatus();
              if (kyc.overallStatus === "VERIFIED") {
                const profile = await profileService.getPersonalInfo();
                destination = profile?.profileCompleted
                  ? "/home"
                  : "/onboarding/personal-info";
              } else {
                destination = "/security-check";
              }
            } catch {
              destination = "/security-check";
            }
          }
        }
      } catch {
        destination = "/welcome";
      }

      await waitMin;
      if (!cancelled) {
        router.replace(destination);
      }
    };

    void resolveDestination();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [router]);

  return (
    <main className="date2-auth-backdrop flex min-h-screen flex-col items-center justify-center px-6 py-12 font-helvetica text-date2-ink">
      <div
        className={`flex max-w-md flex-col items-center text-center transition-all duration-1000 ease-out ${
          entered ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
      >
        <Date2Logo height={64} showContainer={true} />

        <h1 className="mt-7 font-helvetica text-lg font-bold tracking-tight text-date2-midnight sm:text-xl">
          Date Smart • Connect Meaningfully
        </h1>

        <p className="mt-2 font-helvetica text-sm font-normal text-date2-slate">
          Inclusive Romance &amp; Verified Companionship
        </p>

        <div className="mt-8 flex items-center gap-2.5" aria-label="Loading">
          <span className="h-2 w-2 animate-pulse rounded-full bg-date2-violet" />
          <span className="h-2 w-2 animate-pulse rounded-full bg-date2-indigo [animation-delay:180ms]" />
          <span className="h-2 w-2 animate-pulse rounded-full bg-date2-softPeriwinkle [animation-delay:360ms]" />
        </div>
      </div>
    </main>
  );
}
