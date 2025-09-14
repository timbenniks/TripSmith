"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import { MapPin, Briefcase, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/auth-provider";
import { tripService } from "@/lib/trip-service";

export interface TripDetails {
  timezone: string;
  destination: string;
  travelDates: string;
  purpose: string;
}

interface TripFormProps {
  onSubmit: (data: TripDetails, tripId?: string) => void;
}

export function TripForm({ onSubmit }: TripFormProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState<TripDetails>({
    timezone: "",
    destination: "",
    travelDates: "",
    purpose: "",
  });
  const [isCreatingTrip, setIsCreatingTrip] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [autoTimezone, setAutoTimezone] = useState<string>("");
  const [editingTz, setEditingTz] = useState(false);
  const [tzDraft, setTzDraft] = useState("");
  const [tzOpen, setTzOpen] = useState(false);
  const [tzActiveIndex, setTzActiveIndex] = useState<number>(0);

  // Common timezone abbreviations mapped to representative IANA zones (note: some are ambiguous)
  const tzAbbrevEntries = useMemo(
    () => [
      { abbr: "UTC", zone: "UTC" },
      { abbr: "GMT", zone: "Etc/UTC" },
      { abbr: "BST", zone: "Europe/London" },
      { abbr: "CET", zone: "Europe/Paris" },
      { abbr: "CEST", zone: "Europe/Paris" },
      { abbr: "EET", zone: "Europe/Athens" },
      { abbr: "EEST", zone: "Europe/Athens" },
      { abbr: "EST", zone: "America/New_York" },
      { abbr: "EDT", zone: "America/New_York" },
      { abbr: "CST", zone: "America/Chicago" }, // Ambiguous (China Standard Time); we choose NA Central
      { abbr: "CDT", zone: "America/Chicago" },
      { abbr: "MST", zone: "America/Denver" },
      { abbr: "MDT", zone: "America/Denver" },
      { abbr: "PST", zone: "America/Los_Angeles" },
      { abbr: "PDT", zone: "America/Los_Angeles" },
      { abbr: "AKST", zone: "America/Anchorage" },
      { abbr: "AKDT", zone: "America/Anchorage" },
      { abbr: "HST", zone: "Pacific/Honolulu" },
      { abbr: "IST", zone: "Asia/Kolkata" }, // Ambiguous (Israel / Irish); using India Standard Time
      { abbr: "JST", zone: "Asia/Tokyo" },
      { abbr: "KST", zone: "Asia/Seoul" },
      { abbr: "SGT", zone: "Asia/Singapore" },
      { abbr: "HKT", zone: "Asia/Hong_Kong" },
      { abbr: "AEST", zone: "Australia/Sydney" },
      { abbr: "AEDT", zone: "Australia/Sydney" },
      { abbr: "ACST", zone: "Australia/Adelaide" },
      { abbr: "ACDT", zone: "Australia/Adelaide" },
      { abbr: "AWST", zone: "Australia/Perth" },
    ],
    []
  );
  const zoneToAbbr = useMemo(() => {
    const m = new Map<string, string>();
    tzAbbrevEntries.forEach((e) => {
      if (!m.has(e.zone)) m.set(e.zone, e.abbr);
    });
    return m;
  }, [tzAbbrevEntries]);
  const abbrToZone = useMemo(() => {
    const m = new Map<string, string>();
    tzAbbrevEntries.forEach((e) => m.set(e.abbr, e.zone));
    return m;
  }, [tzAbbrevEntries]);

  // Try to get supported time zones (ES2024); fallback to a curated subset
  const allTimezones = useMemo(() => {
    let zones: string[] = [];
    try {
      // @ts-ignore - supportedValuesOf may not exist in TS lib yet
      zones = Intl.supportedValuesOf ? Intl.supportedValuesOf("timeZone") : [];
    } catch (e) {
      zones = [];
    }
    if (!zones || zones.length === 0) {
      zones = [
        "UTC",
        "Europe/London",
        "Europe/Amsterdam",
        "Europe/Paris",
        "Europe/Berlin",
        "America/New_York",
        "America/Chicago",
        "America/Denver",
        "America/Los_Angeles",
        "America/Toronto",
        "America/Sao_Paulo",
        "Asia/Tokyo",
        "Asia/Singapore",
        "Asia/Hong_Kong",
        "Asia/Seoul",
        "Asia/Shanghai",
        "Asia/Dubai",
        "Australia/Sydney",
        "Australia/Melbourne",
      ];
    }
    return zones;
  }, []);

  const filteredTimezones = useMemo(() => {
    if (!tzDraft) return allTimezones.slice(0, 20);
    const query = tzDraft.trim();
    const lower = query.toLowerCase();
    const upper = query.toUpperCase();
    // Abbreviation priority
    const abbrMatches = tzAbbrevEntries
      .filter((e) => e.abbr.startsWith(upper) || e.abbr === upper)
      .map((e) => e.zone);
    const zoneMatches = allTimezones.filter((z) =>
      z.toLowerCase().includes(lower)
    );
    const combined: string[] = [];
    for (const z of abbrMatches) if (!combined.includes(z)) combined.push(z);
    for (const z of zoneMatches) if (!combined.includes(z)) combined.push(z);
    return combined.slice(0, 20);
  }, [tzDraft, allTimezones, tzAbbrevEntries]);

  const commitTimezone = useCallback(
    (zoneOrAbbr: string) => {
      const trimmed = zoneOrAbbr.trim();
      const mapped = abbrToZone.get(trimmed.toUpperCase()) || trimmed;
      setFormData((prev) => ({ ...prev, timezone: mapped }));
      setTzDraft(mapped);
      setTzOpen(false);
    },
    [setFormData, abbrToZone]
  );
  const [parsedPreview, setParsedPreview] = useState<{
    destination?: string;
    purpose?: string;
  }>({});

  // Infer timezone from browser once (client only)
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setAutoTimezone(tz);
      setFormData((prev) => ({ ...prev, timezone: tz }));
    } catch (e) {
      // Fallback noop; user can still proceed
    }
  }, []);

  // Heuristic parser: attempt to split destination & purpose
  function parseDestinationPurpose(raw: string): {
    destination: string;
    purpose: string;
  } {
    const text = raw.trim();
    if (!text) return { destination: "", purpose: "" };
    // Pattern 1: "City for purpose"
    let m = text.match(/^(.+?)\s+for\s+(.+)/i);
    if (m) {
      return { destination: m[1].trim(), purpose: m[2].trim() };
    }
    // Pattern 2: comma / dash separators -> first segment destination, rest purpose
    m = text.match(/^([^,;:\-–—]+)[,;:\-–—]\s*(.+)$/);
    if (m) {
      return { destination: m[1].trim(), purpose: m[2].trim() };
    }
    // Pattern 3: "to attend" phrasing
    m = text.match(/^(.+?)\s+to\s+attend\s+(.+)/i);
    if (m) {
      return { destination: m[1].trim(), purpose: m[2].trim() };
    }
    // Fallback: whole string as destination
    return { destination: text, purpose: "" };
  }

  // Update parsed preview as user types
  useEffect(() => {
    const { destination, purpose } = parseDestinationPurpose(inputValue);
    setParsedPreview({ destination, purpose });
    setFormData((prev) => ({
      ...prev,
      destination,
      purpose,
      travelDates: "", // now deferred to suggestion bubbles
    }));
  }, [inputValue]);

  const handleSubmit = async () => {
    if (!user) {
      console.error("User not authenticated");
      return;
    }

    setIsCreatingTrip(true);

    try {
      // Create trip in database
      const trip = await tripService.createTrip(user, formData);

      if (trip) {
        // Pass both trip data and trip ID to parent
        onSubmit(formData, trip.id);
      } else {
        console.error("Failed to create trip");
        // Still allow them to continue without saving
        onSubmit(formData);
      }
    } catch (error) {
      console.error("Error creating trip:", error);
      // Still allow them to continue without saving
      onSubmit(formData);
    } finally {
      setIsCreatingTrip(false);
    }
  };

  return (
    <section
      className="flex flex-col items-center justify-center space-y-6"
      role="region"
      aria-labelledby="trip-form-heading"
    >
      <header className="text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full mb-5 mx-auto overflow-hidden">
          <Image
            src="/images/tripsmith-logo.png"
            alt="TripSmith - AI Travel Planner Logo"
            width={64}
            height={64}
            className="w-full h-full object-cover"
          />
        </div>
        <h1
          id="trip-form-heading"
          className="text-[1.65rem] leading-tight font-semibold tracking-tight mb-3 text-white"
        >
          Welcome to TripSmith
        </h1>
        <p className="max-w-md mx-auto text-[13.5px] leading-[1.5] text-white/70 font-medium">
          Start with one concise line. We'll gather dates, flights & hotel later
          via smart suggestions.
        </p>
      </header>

      <Card
        className="w-full max-w-md p-6 space-y-6 bg-black/20 backdrop-blur-2xl border border-white/30 shadow-2xl ring-1 ring-white/20"
        role="form"
        aria-labelledby="trip-details-heading"
      >
        <h2
          id="trip-details-heading"
          className="text-base font-semibold text-white/90 tracking-wide uppercase mb-2"
        >
          Trip Overview
        </h2>
        <div className="space-y-6">
          <div className="space-y-3">
            <label
              htmlFor="overview-input"
              className="flex items-center gap-2 text-[13px] font-semibold text-white cursor-pointer"
            >
              <MapPin className="h-4 w-4" aria-hidden="true" />
              Destination & Purpose
            </label>
            <Input
              id="overview-input"
              placeholder="e.g. Tokyo for a fintech conference"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              aria-describedby="overview-help overview-preview"
              className="bg-white/12 backdrop-blur-md border-white/30 focus:border-white/60 focus:bg-white/20 transition-colors duration-300 text-white placeholder:placeholder-contrast shadow-inner text-[14px] h-11"
            />
            <div className="grid gap-3">
              <div
                id="overview-help"
                className="text-[11px] leading-relaxed text-white/55"
              >
                <div className="uppercase tracking-wide text-[10px] font-semibold text-white/35 mb-1">
                  Format Examples
                </div>
                <ul className="space-y-0.5 text-white/60 font-medium">
                  <li className="flex gap-2">
                    <span className="text-white/30">•</span>
                    <span>Paris for partner meetings</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-white/30">•</span>
                    <span>Berlin, client onboarding workshop</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-white/30">•</span>
                    <span>NYC to attend SaaS summit</span>
                  </li>
                </ul>
              </div>
              <div
                id="overview-preview"
                className="text-[11px] font-medium text-white/50 flex flex-wrap gap-x-4 gap-y-1 items-center min-h-[1.25rem]"
              >
                <div>
                  <span className="text-white/35 uppercase tracking-wide mr-1">
                    Destination
                  </span>
                  <span className="text-white/70">
                    {parsedPreview.destination || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-white/35 uppercase tracking-wide mr-1">
                    Purpose
                  </span>
                  <span className="text-white/70">
                    {parsedPreview.purpose || "—"}
                  </span>
                </div>
              </div>
            </div>
            {autoTimezone && !editingTz && (
              <div className="flex items-center gap-2 text-[11px] text-white/40 flex-wrap mt-1">
                <span className="uppercase tracking-wide text-[10px] text-white/35 font-semibold">
                  Timezone
                </span>
                <span className="text-white/65 font-medium">
                  {formData.timezone || autoTimezone}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEditingTz(true);
                    setTzDraft(formData.timezone || autoTimezone);
                  }}
                  className="px-2 py-0.5 rounded-full bg-white/8 hover:bg-white/15 border border-white/15 text-white/55 hover:text-white/80 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 text-[10px] font-medium"
                  aria-label="Edit timezone"
                >
                  Edit timezone
                </button>
              </div>
            )}
            {editingTz && (
              <div className="w-full space-y-2">
                <div className="flex items-center gap-2 flex-wrap text-[11px] relative">
                  <input
                    value={tzDraft}
                    onChange={(e) => {
                      setTzDraft(e.target.value);
                      setTzOpen(true);
                      setTzActiveIndex(0);
                    }}
                    onFocus={() => {
                      setTzOpen(true);
                    }}
                    onKeyDown={(e) => {
                      if (
                        !tzOpen &&
                        (e.key === "ArrowDown" || e.key === "ArrowUp")
                      )
                        setTzOpen(true);
                      if (tzOpen) {
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setTzActiveIndex((i) =>
                            Math.min(filteredTimezones.length - 1, i + 1)
                          );
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault();
                          setTzActiveIndex((i) => Math.max(0, i - 1));
                        } else if (e.key === "Enter") {
                          e.preventDefault();
                          commitTimezone(filteredTimezones[tzActiveIndex]);
                        } else if (e.key === "Escape") {
                          setTzOpen(false);
                        }
                      }
                    }}
                    placeholder="Search timezone e.g. Europe/Amsterdam"
                    className="w-full text-[11px] bg-white/8 border border-white/25 rounded-md px-2 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder:text-white/30"
                    aria-label="Timezone override"
                    aria-expanded={tzOpen}
                    aria-activedescendant={
                      tzOpen ? `tzopt-${tzActiveIndex}` : undefined
                    }
                    role="combobox"
                    aria-autocomplete="list"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      commitTimezone(tzDraft.trim());
                      setEditingTz(false);
                    }}
                    className="px-2 py-0.5 rounded-md bg-purple-600/70 hover:bg-purple-600 text-white text-[10px] font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTz(false);
                      setTzDraft("");
                      setTzOpen(false);
                    }}
                    className="px-2 py-0.5 rounded-md bg-white/8 hover:bg-white/15 border border-white/15 text-white/55 hover:text-white/80 text-[10px] focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                  >
                    Cancel
                  </button>
                </div>
                {tzOpen && filteredTimezones.length > 0 && (
                  <ul
                    role="listbox"
                    className="max-h-52 overflow-auto rounded-md border border-white/15 bg-black/70 backdrop-blur-xl shadow-lg divide-y divide-white/5 text-[11px] text-white/75 focus:outline-none"
                  >
                    {filteredTimezones.map((z, idx) => {
                      const abbr = zoneToAbbr.get(z);
                      return (
                        <li
                          id={`tzopt-${idx}`}
                          key={z}
                          role="option"
                          aria-selected={idx === tzActiveIndex}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            commitTimezone(z);
                            setEditingTz(false);
                          }}
                          className={`px-3 py-1.5 cursor-pointer hover:bg-white/10 transition-colors ${
                            idx === tzActiveIndex
                              ? "bg-purple-600/40 text-white"
                              : ""
                          }`}
                        >
                          {abbr ? (
                            <span>
                              <span className="font-semibold text-white">
                                {abbr}
                              </span>
                              <span className="text-white/40"> – {z}</span>
                            </span>
                          ) : (
                            z
                          )}
                        </li>
                      );
                    })}
                    {filteredTimezones.length === 20 && (
                      <li
                        className="px-3 py-1.5 text-white/35 italic"
                        aria-hidden="true"
                      >
                        …refine to see more
                      </li>
                    )}
                    {/* Ambiguity notes */}
                    {(() => {
                      const upper = tzDraft.trim().toUpperCase();
                      if (upper === "CST") {
                        return (
                          <li className="px-3 py-1.5 text-[10px] text-white/45">
                            CST here maps to North American Central Time. For
                            China Standard Time type "Asia/Shanghai".
                          </li>
                        );
                      }
                      if (upper === "IST") {
                        return (
                          <li className="px-3 py-1.5 text-[10px] text-white/45">
                            IST is ambiguous; using India Standard Time. For
                            Israel Standard Time type "Asia/Jerusalem".
                          </li>
                        );
                      }
                      return null;
                    })()}
                  </ul>
                )}
              </div>
            )}
          </div>
          <div className="text-[11px] text-white/45 leading-relaxed border-t border-white/10 pt-4 -mt-2">
            <span className="font-medium text-white/60">Next:</span> Dates,
            flights & hotel details arrive via smart suggestions. Timezone
            preferences will be editable in account settings (future feature).
          </div>
          <Button
            onClick={handleSubmit}
            disabled={isCreatingTrip}
            className="w-full h-10 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 backdrop-blur-sm border-purple-500/40 text-white font-medium shadow-lg hover:shadow-purple-500/25 transition-all duration-500 relative overflow-hidden group cursor-pointer mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreatingTrip ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Trip...
              </>
            ) : (
              <>
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 opacity-0 group-hover:opacity-100 transition-all duration-700 transform -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%]" />
                Start Planning My Trip
              </>
            )}
          </Button>
        </div>
      </Card>
    </section>
  );
}
