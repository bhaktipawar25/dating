"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { COUNTRIES, type CountryOption } from "@/lib/security/countries";

interface CountrySelectProps {
  id: string;
  value: string;
  onChange: (countryCode: string) => void;
  disabled?: boolean;
  error?: string | null;
}

export function CountrySelect({
  id,
  value,
  onChange,
  disabled = false,
  error,
}: CountrySelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const selectedCountry: CountryOption | undefined = useMemo(
    () => COUNTRIES.find((c) => c.code === value),
    [value]
  );

  const filteredCountries = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [query]);

  useEffect(() => {
    if (!open) return;

    searchInputRef.current?.focus();

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative font-helvetica">
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={`date2-input-base flex items-center justify-between text-left ${
          error
            ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/15"
            : ""
        }`}
      >
        <span
          className={
            selectedCountry
              ? "font-bold text-date2-ink"
              : "text-date2-muted"
          }
        >
          {selectedCountry
            ? `${selectedCountry.name} (${selectedCountry.code})`
            : "Select issuing country"}
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-4 w-4 text-date2-muted transition-transform ${
            open ? "rotate-180" : ""
          }`}
        >
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-full rounded-[18px] border border-date2-border bg-date2-white p-2.5 shadow-indigoCard">
          <div className="pb-2">
            <input
              ref={searchInputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search country or ISO code..."
              aria-label="Search issuing country"
              className="date2-input-base py-2 text-xs"
            />
          </div>

          <ul
            role="listbox"
            aria-label="Issuing countries"
            className="max-h-56 divide-y divide-date2-border/60 overflow-y-auto"
          >
            {filteredCountries.length === 0 ? (
              <li className="px-3 py-3 text-center text-xs text-date2-muted">
                No matching country found.
              </li>
            ) : (
              filteredCountries.map((country) => {
                const isSelected = country.code === value;
                return (
                  <li key={country.code} role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(country.code);
                        setOpen(false);
                        setQuery("");
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                        isSelected
                          ? "bg-date2-lavenderMist font-bold text-date2-midnight"
                          : "text-date2-ink hover:bg-date2-canvas"
                      }`}
                    >
                      <span>{country.name}</span>
                      <span className="rounded-md bg-date2-surface px-1.5 py-0.5 text-[11px] font-bold text-date2-deepIndigo">
                        {country.code}
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
