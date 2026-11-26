"use client";

import React, { useState } from "react";
import { StatusBanner } from "@/components/auth/StatusBanner";
import { SubmitButton } from "@/components/auth/SubmitButton";
import {
  AiServiceError,
  aiService,
  type DateItineraryItem,
} from "@/services/ai/aiService";
import type { DatePlanChatPayload } from "@/services/chat/types";

interface DatePlannerDrawerProps {
  conversationId: string;
  matchName: string;
  initialLocation?: string;
  onSharePlan: (plan: DatePlanChatPayload) => void;
  onClose: () => void;
}

const BUDGET_PRESETS = [
  "Under ₹1,500",
  "₹1,500 – ₹3,500",
  "₹3,500 – ₹7,000",
  "Flexible",
] as const;

const VIBE_OPTIONS = [
  "Romantic",
  "Casual",
  "Adventure",
  "Food & Dining",
  "Relaxing",
  "Fun & Entertainment",
] as const;

const LOCATION_SUGGESTIONS = [
  "Bengaluru",
  "Mumbai",
  "Delhi",
  "Pune",
  "Hyderabad",
] as const;

export function DatePlannerDrawer({
  conversationId,
  matchName,
  initialLocation = "",
  onSharePlan,
  onClose,
}: DatePlannerDrawerProps) {
  const [budgetPreset, setBudgetPreset] = useState<string>("₹1,500 – ₹3,500");
  const [customBudget, setCustomBudget] = useState("");
  const [location, setLocation] = useState(initialLocation);
  const [vibe, setVibe] = useState<string>("Casual");
  const [date, setDate] = useState(() => {
    const tomorrow = new Date(Date.now() + 86400000);
    return tomorrow.toISOString().slice(0, 10);
  });
  const [time, setTime] = useState("18:30");
  const [duration, setDuration] = useState("2–3 hours");

  const [formError, setFormError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [planTitle, setPlanTitle] = useState("");
  const [items, setItems] = useState<DateItineraryItem[]>([]);
  const [acceptedIds, setAcceptedIds] = useState<string[]>([]);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isMock, setIsMock] = useState(false);

  const effectiveBudget = customBudget.trim() || budgetPreset;

  const handleGenerate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (generating) return;

    setFormError(null);
    if (!location.trim()) {
      setFormError("Please enter or choose a date location.");
      return;
    }
    if (!effectiveBudget) {
      setFormError("Please select or enter a budget.");
      return;
    }
    if (!date || !time) {
      setFormError("Please choose your preferred date and time.");
      return;
    }

    setGenerating(true);
    try {
      const response = await aiService.generateDatePlan({
        conversationId,
        budget: effectiveBudget,
        location: location.trim(),
        vibe,
        date,
        time,
        duration,
        matchName,
      });
      setPlanTitle(
        response.planTitle ?? `${vibe} Date Plan in ${location.trim()}`
      );
      setItems(response.items ?? []);
      setAcceptedIds((response.items ?? []).map((item) => item.id));
      setEditingItemId(null);
      setIsMock(Boolean(response.isMockResponse));
    } catch (err) {
      setFormError(
        err instanceof AiServiceError
          ? err.message
          : "Unable to generate a date plan. Your planning details were kept."
      );
    } finally {
      setGenerating(false);
    }
  };

  const toggleAccepted = (id: string) => {
    setAcceptedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const updateItemField = (
    id: string,
    field: keyof DateItineraryItem,
    value: string
  ) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleShareAccepted = () => {
    const selectedItems = items.filter((item) => acceptedIds.includes(item.id));
    if (selectedItems.length === 0) {
      setFormError("Accept at least one activity card before sharing to chat.");
      return;
    }

    onSharePlan({
      planTitle: planTitle || `${vibe} Date Plan in ${location.trim()}`,
      vibe,
      location: location.trim(),
      budget: effectiveBudget,
      schedule: `${date} at ${time} (${duration})`,
      items: selectedItems,
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="date-planner-title"
      className="fixed inset-0 z-50 flex justify-end bg-brand-forest/40 backdrop-blur-sm"
    >
      <div className="flex h-full w-full max-w-xl flex-col bg-white shadow-card">
        <header className="flex items-start justify-between gap-3 border-b border-brand-border px-5 py-4 sm:px-6">
          <div>
            <h2
              id="date-planner-title"
              className="text-lg font-bold text-brand-ink"
            >
              Plan Your Perfect Date
            </h2>
            <p className="mt-0.5 text-xs text-brand-muted">
              Build a tailored itinerary with {matchName} and share it in chat.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close Date Planner"
            onClick={onClose}
            className="rounded-xl border border-brand-border px-2.5 py-1 text-xs font-semibold text-brand-muted hover:bg-brand-ice hover:text-brand-ink"
          >
            Back to Chat
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto p-5 sm:p-6">
          {formError && <StatusBanner variant="error" message={formError} />}

          <form onSubmit={handleGenerate} className="space-y-5">
            {/* 1. Budget */}
            <div className="space-y-2">
              <span className="block text-xs font-bold uppercase tracking-wider text-brand-forest">
                1. Budget
              </span>
              <div className="flex flex-wrap gap-2">
                {BUDGET_PRESETS.map((preset) => {
                  const selected = !customBudget.trim() && budgetPreset === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setCustomBudget("");
                        setBudgetPreset(preset);
                      }}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        selected
                          ? "border-brand-forest bg-brand-forest text-white"
                          : "border-brand-border bg-white text-brand-ink hover:bg-brand-ice"
                      }`}
                    >
                      {preset}
                    </button>
                  );
                })}
              </div>
              <input
                type="text"
                value={customBudget}
                onChange={(e) => setCustomBudget(e.target.value)}
                placeholder="Or enter a custom budget (e.g. ₹2,500 total)"
                aria-label="Custom budget"
                className="auth-input-base text-xs"
              />
            </div>

            {/* 2. Location */}
            <div className="space-y-2">
              <label
                htmlFor="date-planner-location"
                className="block text-xs font-bold uppercase tracking-wider text-brand-forest"
              >
                2. Location
              </label>
              <input
                id="date-planner-location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Search or enter neighborhood / city..."
                className="auth-input-base text-xs"
              />
              <div className="flex flex-wrap gap-1.5">
                {LOCATION_SUGGESTIONS.map((city) => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => setLocation(city)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      location.toLowerCase() === city.toLowerCase()
                        ? "border-brand-mint bg-brand-ice text-brand-forest"
                        : "border-brand-border bg-brand-canvas text-brand-muted hover:bg-brand-ice"
                    }`}
                  >
                    {city}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Date Vibe */}
            <div className="space-y-2">
              <span className="block text-xs font-bold uppercase tracking-wider text-brand-forest">
                3. Date Vibe
              </span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {VIBE_OPTIONS.map((option) => {
                  const selected = vibe === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setVibe(option)}
                      className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                        selected
                          ? "border-brand-forest bg-brand-ice text-brand-forest ring-2 ring-brand-mint/35"
                          : "border-brand-border bg-white text-brand-ink hover:bg-brand-canvas"
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Schedule */}
            <div className="space-y-2">
              <span className="block text-xs font-bold uppercase tracking-wider text-brand-forest">
                4. Schedule
              </span>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                <div>
                  <label
                    htmlFor="date-planner-date"
                    className="mb-1 block text-[11px] font-medium text-brand-muted"
                  >
                    Preferred Date
                  </label>
                  <input
                    id="date-planner-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="auth-input-base text-xs"
                  />
                </div>
                <div>
                  <label
                    htmlFor="date-planner-time"
                    className="mb-1 block text-[11px] font-medium text-brand-muted"
                  >
                    Preferred Time
                  </label>
                  <input
                    id="date-planner-time"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="auth-input-base text-xs"
                  />
                </div>
                <div>
                  <label
                    htmlFor="date-planner-duration"
                    className="mb-1 block text-[11px] font-medium text-brand-muted"
                  >
                    Duration
                  </label>
                  <select
                    id="date-planner-duration"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="auth-input-base text-xs"
                  >
                    <option value="1–2 hours">1–2 hours</option>
                    <option value="2–3 hours">2–3 hours</option>
                    <option value="Half day">Half day</option>
                    <option value="Evening">Evening</option>
                  </select>
                </div>
              </div>
            </div>

            <SubmitButton
              isLoading={generating}
              loadingText="Generating date plan..."
            >
              {items.length > 0 ? "Regenerate Date Plan" : "Generate Date Plan"}
            </SubmitButton>
          </form>

          {/* Generated Itinerary Cards */}
          {items.length > 0 && (
            <div className="space-y-4 border-t border-brand-border pt-5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-brand-ink">
                    {planTitle}
                  </h3>
                  <p className="text-xs text-brand-muted">
                    Review, edit, or accept stops before sharing to chat.
                  </p>
                </div>
                {isMock && (
                  <span className="rounded-full border border-brand-border bg-brand-canvas px-2.5 py-0.5 text-[10px] font-semibold text-brand-muted">
                    Simulated Plan
                  </span>
                )}
              </div>

              <div className="space-y-3">
                {items.map((item) => {
                  const isAccepted = acceptedIds.includes(item.id);
                  const isEditing = editingItemId === item.id;

                  return (
                    <div
                      key={item.id}
                      className={`rounded-2xl border p-4 transition-colors space-y-3 ${
                        isAccepted
                          ? "border-brand-forest bg-brand-ice/45"
                          : "border-brand-border bg-white"
                      }`}
                    >
                      {isEditing ? (
                        <div className="space-y-2.5">
                          <input
                            type="text"
                            value={item.activityName}
                            onChange={(e) =>
                              updateItemField(
                                item.id,
                                "activityName",
                                e.target.value
                              )
                            }
                            aria-label="Activity name"
                            className="auth-input-base text-xs font-semibold"
                          />
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <input
                              type="text"
                              value={item.location}
                              onChange={(e) =>
                                updateItemField(
                                  item.id,
                                  "location",
                                  e.target.value
                                )
                              }
                              aria-label="Activity location"
                              className="auth-input-base text-xs"
                            />
                            <input
                              type="text"
                              value={item.suggestedTime}
                              onChange={(e) =>
                                updateItemField(
                                  item.id,
                                  "suggestedTime",
                                  e.target.value
                                )
                              }
                              aria-label="Suggested time"
                              className="auth-input-base text-xs"
                            />
                          </div>
                          <textarea
                            rows={2}
                            value={item.description}
                            onChange={(e) =>
                              updateItemField(
                                item.id,
                                "description",
                                e.target.value
                              )
                            }
                            aria-label="Activity description"
                            className="auth-input-base text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => setEditingItemId(null)}
                            className="rounded-xl bg-brand-forest px-3 py-1.5 text-xs font-semibold text-white"
                          >
                            Done Editing
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="text-sm font-bold text-brand-ink">
                                {item.activityName}
                              </h4>
                              <p className="mt-0.5 text-xs font-medium text-brand-forest">
                                {item.location} · {item.suggestedTime}
                              </p>
                            </div>
                            {item.estimatedBudget && (
                              <span className="shrink-0 rounded-full bg-white px-2.5 py-0.5 text-[11px] font-semibold text-brand-muted border border-brand-border">
                                {item.estimatedBudget}
                              </span>
                            )}
                          </div>

                          <p className="text-xs leading-relaxed text-brand-muted">
                            {item.description}
                          </p>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => toggleAccepted(item.id)}
                              className={`flex-1 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                                isAccepted
                                  ? "bg-brand-forest text-white"
                                  : "border border-brand-border bg-white text-brand-forest hover:bg-brand-ice"
                              }`}
                            >
                              {isAccepted ? "Accepted ✓" : "Accept"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingItemId(item.id)}
                              className="rounded-xl border border-brand-border bg-white px-3 py-1.5 text-xs font-semibold text-brand-ink hover:bg-brand-canvas"
                            >
                              Edit
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={handleShareAccepted}
                className="w-full rounded-xl bg-brand-forest px-4 py-3 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-brand-forestHover"
              >
                Share Accepted Itinerary to Chat
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
