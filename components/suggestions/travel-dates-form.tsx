"use client";

interface DatesFormValue {
  start?: string;
  end?: string;
}

interface TravelDatesFormProps {
  value: DatesFormValue;
  onChange: (v: DatesFormValue) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onClose: () => void;
  firstFieldRef: React.RefObject<HTMLInputElement>;
  error: string;
  inferredDaySpan: number | null;
  setActiveForm: (v: null) => void;
}

export function TravelDatesForm({
  value,
  onChange,
  onSubmit,
  onCancel,
  onClose,
  firstFieldRef,
  error,
  inferredDaySpan,
  setActiveForm,
}: TravelDatesFormProps) {
  return (
    <div
      className="mt-3 p-4 rounded-xl bg-black/40 border border-white/15 backdrop-blur-xl space-y-3 relative z-30"
      aria-label="Travel dates form"
      role="group"
      aria-describedby="dates-form-desc"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          setActiveForm(null);
        }
      }}
    >
      <div className="flex items-center justify-between">
        <h5 className="text-[12px] font-semibold text-white/80">
          Set Travel Dates
        </h5>
        <button
          onClick={onClose}
          className="text-[11px] text-white/50 hover:text-white/80"
          aria-label="Close travel dates form"
        >
          Close
        </button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-[11px] uppercase tracking-wide text-white/40">
            Start Date
          </label>
          <input
            ref={firstFieldRef}
            type="date"
            value={value.start || ""}
            onChange={(e) => onChange({ ...value, start: e.target.value })}
            aria-invalid={!!error}
            className="w-full text-[12px] bg-white/5 border border-white/15 rounded-md px-2 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] uppercase tracking-wide text-white/40">
            End Date
          </label>
          <input
            type="date"
            value={value.end || ""}
            onChange={(e) => onChange({ ...value, end: e.target.value })}
            aria-invalid={!!error}
            className="w-full text-[12px] bg-white/5 border border-white/15 rounded-md px-2 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button
          onClick={onCancel}
          className="text-[11px] px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white/80"
        >
          Cancel
        </button>
        <button
          onClick={onSubmit}
          disabled={!!error}
          className="text-[11px] px-3 py-1.5 rounded-md bg-purple-600/70 hover:bg-purple-600 disabled:bg-purple-600/40 disabled:cursor-not-allowed border border-purple-400/40 text-white font-medium"
        >
          Apply Dates
        </button>
      </div>
      <p id="dates-form-desc" className="sr-only">
        Provide start and end date to populate the itinerary header and adjust
        schedule length.
      </p>
      {error && (
        <p className="text-[11px] text-red-300" role="alert">
          {error}
        </p>
      )}
      {!error && !(value.start || value.end) && (
        <p className="text-[11px] text-white/30">
          Prefilled from existing itinerary (you can adjust).
        </p>
      )}
      {inferredDaySpan && (
        <p className="text-[11px] text-white/40">
          Span: {inferredDaySpan} day{inferredDaySpan !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
