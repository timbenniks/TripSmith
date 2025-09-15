"use client";
import { useEffect } from "react";

export interface HotelFormState {
  hotelName?: string;
  checkIn?: string;
  checkOut?: string;
}

interface HotelDetailsFormProps {
  value: HotelFormState;
  onChange: (v: HotelFormState) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onClose: () => void;
  firstFieldRef: React.RefObject<HTMLInputElement>;
  active: boolean;
  inferDates: () => { start?: string; end?: string };
  announce: (msg: string) => void;
}

export function HotelDetailsForm({
  value,
  onChange,
  onSubmit,
  onCancel,
  onClose,
  firstFieldRef,
  active,
  inferDates,
  announce,
}: HotelDetailsFormProps) {
  // Prefill when opened
  useEffect(() => {
    if (active && !value.checkIn && !value.checkOut) {
      const inferred = inferDates();
      if (inferred.start || inferred.end) {
        onChange({
          ...value,
          checkIn: inferred.start || value.checkIn,
          checkOut: inferred.end || value.checkOut,
        });
        announce(
          `Prefilled hotel stay ${inferred.start || ""}${
            inferred.end ? " to " + inferred.end : ""
          }`
        );
      }
    }
  }, [active]);

  // Auto-correct reversed range
  useEffect(() => {
    if (value.checkIn && value.checkOut) {
      const inDate = new Date(value.checkIn);
      const outDate = new Date(value.checkOut);
      if (outDate < inDate) {
        onChange({
          hotelName: value.hotelName,
          checkIn: value.checkOut,
          checkOut: value.checkIn,
        });
        announce("Swapped check-in and check-out to fix reversed stay");
      }
    }
  }, [value.checkIn, value.checkOut]);

  return (
    <div
      className="mt-3 p-4 rounded-xl bg-black/40 border border-white/15 backdrop-blur-xl space-y-3 relative z-30"
      aria-label="Hotel details form"
      role="group"
      aria-describedby="hotel-form-desc"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
        }
      }}
    >
      <div className="flex items-center justify-between">
        <h5 className="text-[12px] font-semibold text-white/80">
          Add Hotel Details
        </h5>
        <button
          type="button"
          onClick={onClose}
          className="text-[11px] text-white/50 hover:text-white/80 cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-400/50 rounded"
          aria-label="Close hotel details form"
        >
          Close
        </button>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1 md:col-span-1">
          <label className="text-[11px] uppercase tracking-wide text-white/40">
            Hotel Name
          </label>
          <input
            ref={firstFieldRef}
            value={value.hotelName || ""}
            onChange={(e) => onChange({ ...value, hotelName: e.target.value })}
            placeholder="e.g. Park Hyatt"
            className="w-full text-[12px] bg-white/5 border border-white/15 rounded-md px-2 py-1.5 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] uppercase tracking-wide text-white/40">
            Check-in
          </label>
          <input
            type="date"
            value={value.checkIn || ""}
            onChange={(e) => onChange({ ...value, checkIn: e.target.value })}
            className="w-full text-[12px] bg-white/5 border border-white/15 rounded-md px-2 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] uppercase tracking-wide text-white/40">
            Check-out
          </label>
          <input
            type="date"
            value={value.checkOut || ""}
            onChange={(e) => onChange({ ...value, checkOut: e.target.value })}
            className="w-full text-[12px] bg-white/5 border border-white/15 rounded-md px-2 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="text-[11px] px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white/80 cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-400/50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSubmit}
          className="text-[11px] px-3 py-1.5 rounded-md bg-purple-600/70 hover:bg-purple-600 border border-purple-400/40 text-white font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-400/50"
        >
          Apply Hotel
        </button>
      </div>
      <p id="hotel-form-desc" className="sr-only">
        Provide hotel name and optional check-in / check-out dates.
      </p>
      {value.checkIn && (value.checkOut || !value.checkOut) && (
        <p className="text-[11px] text-white/30">
          Prefilled from existing itinerary (you can adjust).
        </p>
      )}
    </div>
  );
}
