"use client";

import React from "react";

interface ProfileAvatarProps {
  name: string;
  photoUrl?: string;
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASSES: Record<NonNullable<ProfileAvatarProps["size"]>, string> = {
  sm: "h-10 w-10 text-sm",
  md: "h-12 w-12 text-base",
  lg: "h-16 w-16 text-xl",
};

export function ProfileAvatar({
  name,
  photoUrl,
  size = "md",
}: ProfileAvatarProps) {
  const initial = (name?.trim()[0] ?? "D").toUpperCase();

  if (photoUrl) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={photoUrl}
        alt={name}
        className={`${SIZE_CLASSES[size]} shrink-0 rounded-full border border-brand-border object-cover bg-brand-ice`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`${SIZE_CLASSES[size]} inline-flex shrink-0 items-center justify-center rounded-full border border-brand-border bg-brand-ice font-bold text-brand-forest`}
    >
      {initial}
    </span>
  );
}
