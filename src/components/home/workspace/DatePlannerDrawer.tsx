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
      className="fixed inset-0 z-50 flex justify-end bg-date2-midnight/50 font-helvetica backdrop-blur-sm"
    >
      <div className="flex h-full w-full max-w-xl flex-col bg-date2-white shadow-indigoCard">
        <header className="flex items-start justify-between gap-3 border-b border-date2-border px-4 py-3.5 xs:px-5 xs:py-4 sm:px-6">
          <div>
            <h2
              id="date-planner-title"
              className="text-lg font-bold text-date2-ink"
            >
              Plan Your Perfect Date
            </h2>
            <p className="mt-0.5 text-xs text-date2-slate">
              Build a tailored itinerary with {matchName} and share it in chat.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close Date Planner"
            onClick={onClose}
            className="shrink-0 rounded-xl border border-date2-border px-2.5 py-1 text-xs font-bold text-date2-slate hover:bg-date2-lavenderMist hover:text-date2-midnight"
          >
            Back to Chat
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] xs:p-5 sm:p-6">
          {formError && <StatusBanner variant="error" message={formError} />}

          <form onSubmit={handleGenerate} className="space-y-5">
            {/* 1. Budget */}
            <div className="space-y-2">
              <span className="block text-xs font-bold uppercase tracking-wider text-date2-deepIndigo">
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
                      className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                        selected
                          ? "border-date2-midnight bg-date2-midnight text-date2-white"
                          : "border-date2-border bg-date2-white text-date2-ink hover:bg-date2-lavenderMist"
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
                className="date2-input-base text-xs"
              />
            </div>

            {/* 2. Location */}
            <div className="space-y-2">
              <label
                htmlFor="date-planner-location"
                className="block text-xs font-bold uppercase tracking-wider text-date2-deepIndigo"
              >
                2. Location
              </label>
              <input
                id="date-planner-location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Search or enter neighborhood / city..."
                className="date2-input-base text-xs"
              />
              <div className="flex flex-wrap gap-1.5">
                {LOCATION_SUGGESTIONS.map((city) => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => setLocation(city)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors ${
                      location.toLowerCase() === city.toLowerCase()
                        ? "border-date2-violet bg-date2-lavenderMist text-date2-midnight"
                        : "border-date2-border bg-date2-canvas text-date2-slate hover:bg-date2-lavenderMist"
                    }`}
                  >
                    {city}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Date Vibe */}
            <div className="space-y-2">
              <span className="block text-xs font-bold uppercase tracking-wider text-date2-deepIndigo">
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
                      className={`rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${
                        selected
                          ? "border-date2-midnight bg-date2-lavenderMist text-date2-midnight ring-2 ring-date2-paleLavender"
                          : "border-date2-border bg-date2-white text-date2-ink hover:bg-date2-canvas"
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
              <span className="block text-xs font-bold uppercase tracking-wider text-date2-deepIndigo">
                4. Schedule
              </span>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                <div>
                  <label
                    htmlFor="date-planner-date"
                    className="mb-1 block text-[11px] font-bold text-date2-slate"
                  >
                    Preferred Date
                  </label>
                  <input
                    id="date-planner-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="date2-input-base text-xs"
                  />
                </div>
                <div>
                  <label
                    htmlFor="date-planner-time"
                    className="mb-1 block text-[11px] font-bold text-date2-slate"
                  >
                    Preferred Time
                  </label>
                  <input
                    id="date-planner-time"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="date2-input-base text-xs"
                  />
                </div>
                <div>
                  <label
                    htmlFor="date-planner-duration"
                    className="mb-1 block text-[11px] font-bold text-date2-slate"
                  >
                    Duration
                  </label>
                  <select
                    id="date-planner-duration"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="date2-input-base text-xs"
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
            <div className="space-y-4 border-t border-date2-border pt-5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-date2-ink">
                    {planTitle}
                  </h3>
                  <p className="text-xs text-date2-slate">
                    Review, edit, or accept stops before sharing to chat.
                  </p>
                </div>
                {isMock && (
                  <span className="rounded-full border border-date2-border bg-date2-canvas px-2.5 py-0.5 text-[10px] font-bold text-date2-slate">
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
                      className={`space-y-3 rounded-2xl border p-4 transition-colors ${
                        isAccepted
                          ? "border-date2-violet bg-date2-lavenderMist/60"
                          : "border-date2-border bg-date2-white"
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
                            className="date2-input-base text-xs font-bold"
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
                              className="date2-input-base text-xs"
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
                              className="date2-input-base text-xs"
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
                            className="date2-input-base text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => setEditingItemId(null)}
                            className="rounded-xl bg-date2-midnight px-3 py-1.5 text-xs font-bold text-date2-white"
                          >
                            Done Editing
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="text-sm font-bold text-date2-ink">
                                {item.activityName}
                              </h4>
                              <p className="mt-0.5 text-xs font-bold text-date2-deepIndigo">
                                {item.location} · {item.suggestedTime}
                              </p>
                            </div>
                            {item.estimatedBudget && (
                              <span className="shrink-0 rounded-full border border-date2-border bg-date2-white px-2.5 py-0.5 text-[11px] font-bold text-date2-slate">
                                {item.estimatedBudget}
                              </span>
                            )}
                          </div>

                          <p className="text-xs leading-relaxed text-date2-slate">
                            {item.description}
                          </p>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => toggleAccepted(item.id)}
                              className={`flex-1 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
                                isAccepted
                                  ? "bg-date2-midnight text-date2-white"
                                  : "border border-date2-border bg-date2-white text-date2-midnight hover:bg-date2-lavenderMist"
                              }`}
                            >
                              {isAccepted ? "Accepted ✓" : "Accept"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingItemId(item.id)}
                              className="rounded-xl border border-date2-border bg-date2-white px-3 py-1.5 text-xs font-bold text-date2-ink hover:bg-date2-canvas"
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
                className="w-full rounded-[14px] bg-date2-midnight px-4 py-3 text-sm font-bold text-date2-white shadow-indigoSoft transition-colors hover:bg-date2-deepIndigo"
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
