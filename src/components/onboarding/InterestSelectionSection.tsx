"use client";

import React, { useMemo, useState } from "react";
import { StatusBanner } from "@/components/auth/StatusBanner";
import type { InterestCategory, InterestTag } from "@/services/profile/types";

interface InterestSelectionSectionProps {
  categories: InterestCategory[];
  loading: boolean;
  loadError: string | null;
  onRetryLoad: () => void;
  selectedInterestIds: string[];
  onChangeSelected: (nextIds: string[]) => void;
  validationError?: string | null;
  disabled?: boolean;
}

export function InterestSelectionSection({
  categories,
  loading,
  loadError,
  onRetryLoad,
  selectedInterestIds,
  onChangeSelected,
  validationError,
  disabled = false,
}: InterestSelectionSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState<string>("all");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const tagMap = useMemo(() => {
    const map = new Map<string, InterestTag>();
    for (const category of categories) {
      for (const tag of category.tags) {
        map.set(tag.id, tag);
      }
    }
    return map;
  }, [categories]);

  const filteredCategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return categories
      .filter(
        (cat) => activeCategoryId === "all" || cat.id === activeCategoryId
      )
      .map((cat) => ({
        ...cat,
        tags: query
          ? cat.tags.filter(
              (tag) =>
                tag.label.toLowerCase().includes(query) ||
                cat.name.toLowerCase().includes(query)
            )
          : cat.tags,
      }))
      .filter((cat) => cat.tags.length > 0);
  }, [categories, activeCategoryId, searchQuery]);

  const toggleInterest = (tagId: string) => {
    if (disabled) return;
    if (selectedInterestIds.includes(tagId)) {
      onChangeSelected(selectedInterestIds.filter((id) => id !== tagId));
    } else {
      onChangeSelected([...selectedInterestIds, tagId]);
    }
  };

  const removeInterest = (tagId: string) => {
    if (disabled) return;
    onChangeSelected(selectedInterestIds.filter((id) => id !== tagId));
  };

  const moveInterest = (fromIndex: number, toIndex: number) => {
    if (
      disabled ||
      toIndex < 0 ||
      toIndex >= selectedInterestIds.length ||
      fromIndex === toIndex
    ) {
      return;
    }
    const next = [...selectedInterestIds];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    onChangeSelected(next);
  };

  return (
    <section
      aria-labelledby="interests-section-heading"
      className="space-y-5 font-helvetica"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2
            id="interests-section-heading"
            className="text-xl font-bold tracking-tight text-date2-ink xs:text-2xl sm:text-[26px]"
          >
            What Do You Like?
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-date2-slate">
            Search and choose your favourite lifestyle topics so Date² can
            highlight what you share in common.
          </p>
        </div>

        <span className="inline-flex w-fit items-center rounded-full border border-date2-paleLavender bg-date2-lavenderMist px-3 py-1 text-xs font-bold text-date2-midnight">
          {selectedInterestIds.length} selected
        </span>
      </div>

      {/* Search Bar (with Clear Search option) & Category Filter Tabs */}
      <div className="space-y-3">
        <div className="relative">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-date2-muted"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path
                fillRule="evenodd"
                d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
                clipRule="evenodd"
              />
            </svg>
          </span>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search interests (e.g. Coffee, Travelling, Cricket)..."
            aria-label="Search interests"
            disabled={disabled || loading}
            className="date2-input-base pl-10 pr-20"
          />
          {searchQuery.trim().length > 0 && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-1.5 right-1.5 rounded-lg border border-date2-border bg-date2-surface px-2.5 text-xs font-bold text-date2-deepIndigo hover:bg-date2-lavenderMist"
            >
              Clear
            </button>
          )}
        </div>

        {categories.length > 0 && (
          <div
            role="tablist"
            aria-label="Interest categories"
            className="flex flex-wrap gap-1.5"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeCategoryId === "all"}
              onClick={() => setActiveCategoryId("all")}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
                activeCategoryId === "all"
                  ? "bg-date2-midnight text-date2-white shadow-sm"
                  : "border border-date2-border bg-date2-white text-date2-slate hover:bg-date2-lavenderMist hover:text-date2-midnight"
              }`}
            >
              All
            </button>
            {categories.map((category) => {
              const isActive = activeCategoryId === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveCategoryId(category.id)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
                    isActive
                      ? "bg-date2-midnight text-date2-white shadow-sm"
                      : "border border-date2-border bg-date2-white text-date2-slate hover:bg-date2-lavenderMist hover:text-date2-midnight"
                  }`}
                >
                  {category.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Categorized Pills */}
      {loadError ? (
        <StatusBanner
          variant="error"
          message={loadError}
          action={
            <button
              type="button"
              onClick={onRetryLoad}
              className="text-xs font-bold underline underline-offset-2"
            >
              Retry loading interests
            </button>
          }
        />
      ) : loading ? (
        <div className="space-y-3 rounded-[16px] border border-date2-border bg-date2-canvas p-5">
          <p className="text-xs font-bold text-date2-deepIndigo">
            Loading interest categories...
          </p>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="h-8 w-24 animate-pulse rounded-full bg-date2-lavenderMist"
              />
            ))}
          </div>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="space-y-3 rounded-[16px] border border-date2-border bg-date2-canvas p-6 text-center text-sm text-date2-slate">
          <p>
            No interests match &ldquo;{searchQuery}&rdquo;. Try another keyword
            or switch category.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setActiveCategoryId("all");
            }}
            className="rounded-xl border border-date2-softBorder bg-date2-white px-4 py-2 text-xs font-bold text-date2-deepIndigo hover:border-date2-violet hover:bg-date2-lavenderMist"
          >
            Clear search &amp; show all
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCategories.map((category) => (
            <div
              key={category.id}
              className="space-y-2.5 rounded-[16px] border border-date2-border bg-date2-canvas p-3 sm:p-4"
            >
              <h3 className="text-[11px] font-bold uppercase tracking-[0.11em] text-date2-deepIndigo">
                {category.name}
              </h3>

              <div className="flex flex-wrap gap-2">
                {category.tags.map((tag) => {
                  const isSelected = selectedInterestIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      aria-pressed={isSelected}
                      disabled={disabled}
                      onClick={() => toggleInterest(tag.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-date2-violet disabled:cursor-not-allowed disabled:opacity-60 ${
                        isSelected
                          ? "border-date2-midnight bg-date2-midnight text-date2-white shadow-sm"
                          : "border-date2-border bg-date2-white text-date2-ink hover:border-date2-violet hover:bg-date2-lavenderMist"
                      }`}
                    >
                      <span>{tag.label}</span>
                      <span
                        aria-hidden="true"
                        className={`text-[11px] ${
                          isSelected
                            ? "text-date2-limeMark"
                            : "text-date2-deepIndigo"
                        }`}
                      >
                        {isSelected ? "✓" : "+"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {validationError && (
        <p role="alert" className="text-xs font-bold text-rose-600">
          {validationError}
        </p>
      )}

      {/* Selected Interests Preview & Reordering */}
      <div className="space-y-3 rounded-[18px] border border-date2-border bg-date2-surface p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-date2-ink">
              Selected Interests ({selectedInterestIds.length})
            </h3>
            <p className="text-xs text-date2-slate">
              Drag and drop or use the arrow buttons to reorder your favourites.
            </p>
          </div>

          {selectedInterestIds.length > 0 && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChangeSelected([])}
              className="rounded-lg border border-date2-softBorder bg-date2-white px-2.5 py-1 text-xs font-bold text-rose-700 transition-colors hover:bg-rose-50 disabled:opacity-50"
            >
              Clear all
            </button>
          )}
        </div>

        {selectedInterestIds.length === 0 ? (
          <p className="rounded-xl border border-dashed border-date2-softBorder bg-date2-white px-4 py-3 text-xs text-date2-slate">
            Select interests above to build your ordered list.
          </p>
        ) : (
          <ul className="space-y-2" aria-label="Ordered selected interests">
            {selectedInterestIds.map((tagId, index) => {
              const label = tagMap.get(tagId)?.label ?? tagId;
              return (
                <li
                  key={tagId}
                  draggable={!disabled}
                  onDragStart={() => setDraggedIndex(index)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (draggedIndex !== null) {
                      moveInterest(draggedIndex, index);
                      setDraggedIndex(null);
                    }
                  }}
                  onDragEnd={() => setDraggedIndex(null)}
                  className={`flex items-center justify-between gap-2 rounded-xl border bg-date2-white px-3 py-2 text-xs shadow-sm transition-colors ${
                    draggedIndex === index
                      ? "border-date2-violet opacity-70"
                      : "border-date2-border"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      aria-hidden="true"
                      className="cursor-grab select-none text-date2-muted"
                      title="Drag to reorder"
                    >
                      ⋮⋮
                    </span>
                    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-date2-lavenderMist text-[11px] font-bold text-date2-midnight">
                      {index + 1}
                    </span>
                    <span className="truncate font-bold text-date2-ink">
                      {label}
                    </span>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      disabled={disabled || index === 0}
                      aria-label={`Move ${label} up`}
                      onClick={() => moveInterest(index, index - 1)}
                      className="rounded-lg border border-date2-border px-2 py-1 text-[11px] font-bold text-date2-deepIndigo hover:bg-date2-lavenderMist disabled:opacity-35"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={
                        disabled || index === selectedInterestIds.length - 1
                      }
                      aria-label={`Move ${label} down`}
                      onClick={() => moveInterest(index, index + 1)}
                      className="rounded-lg border border-date2-border px-2 py-1 text-[11px] font-bold text-date2-deepIndigo hover:bg-date2-lavenderMist disabled:opacity-35"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      disabled={disabled}
                      aria-label={`Remove ${label}`}
                      onClick={() => removeInterest(tagId)}
                      className="rounded-lg border border-rose-200 px-2 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-35"
                    >
                      ×
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
