"use client";
import { useEffect } from "react";

export interface FlightSegmentFormItem {
  id: string;
  direction: "outbound" | "inbound";
  flightNumber?: string;
  route?: string;
  depTime?: string;
  arrTime?: string;
}

interface FlightSegmentsFormProps {
  segments: FlightSegmentFormItem[];
  onChange: (segments: FlightSegmentFormItem[]) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onClose: () => void;
  firstFieldRef: React.RefObject<HTMLInputElement>;
  addOutboundBtnRef: React.RefObject<HTMLButtonElement>;
  addInboundBtnRef: React.RefObject<HTMLButtonElement>;
  ariaMessage: string;
  setAriaMessage: (msg: string) => void;
  setActiveForm: (val: null) => void; // used for escape handling
}

export function FlightSegmentsForm({
  segments,
  onChange,
  onSubmit,
  onCancel,
  onClose,
  firstFieldRef,
  addOutboundBtnRef,
  addInboundBtnRef,
  ariaMessage,
  setAriaMessage,
  setActiveForm,
}: FlightSegmentsFormProps) {
  // Esc to close handled at container
  const updateSegment = (id: string, patch: Partial<FlightSegmentFormItem>) =>
    onChange(segments.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  // Expose add helpers
  const addSegment = (direction: "outbound" | "inbound") => {
    const seg: FlightSegmentFormItem = {
      id: Math.random().toString(36).slice(2),
      direction,
    };
    const next = [...segments, seg];
    onChange(next);
    requestAnimationFrame(() => {
      document.getElementById(`flightnum-${seg.id}`)?.focus();
    });
    const order = next.filter((s) => s.direction === direction);
    setAriaMessage(
      `Added ${direction === "outbound" ? "outbound" : "inbound"} leg ${
        order.indexOf(seg) + 1
      }`
    );
  };

  const removeSegment = (id: string, direction: string, legIndex: number) => {
    const idxToRemove = segments.findIndex((p) => p.id === id);
    const newList = segments.filter((s) => s.id !== id);
    onChange(newList);
    requestAnimationFrame(() => {
      const fallback = newList[idxToRemove] || newList[idxToRemove - 1];
      if (fallback) {
        const input = document.getElementById(`flightnum-${fallback.id}`);
        (input as HTMLInputElement | null)?.focus();
      } else {
        (addOutboundBtnRef.current || addInboundBtnRef.current)?.focus();
      }
    });
    setAriaMessage(
      `Removed ${
        direction === "outbound" ? "outbound" : "inbound"
      } leg ${legIndex}`
    );
  };

  return (
    <div
      className="mt-3 p-4 rounded-xl bg-black/40 border border-white/15 backdrop-blur-xl space-y-4 relative z-30"
      aria-label="Flight details form"
      role="group"
      aria-describedby="flight-form-desc"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          setActiveForm(null);
        }
      }}
    >
      <div className="flex items-center justify-between">
        <h5 className="text-[12px] font-semibold text-white/80">
          Add Flight Details (Multiple Legs)
        </h5>
        <button
          type="button"
          onClick={onClose}
          className="text-[11px] text-white/50 hover:text-white/80 cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-400/50 rounded"
          aria-label="Close flight details form"
        >
          Close
        </button>
      </div>
      <div className="space-y-3">
        <ul role="list" className="space-y-3 m-0 p-0">
          {segments.map((seg, idx) => {
            const outboundOrder = segments.filter(
              (s) => s.direction === "outbound"
            );
            const inboundOrder = segments.filter(
              (s) => s.direction === "inbound"
            );
            const isFirstEditable = idx === 0;
            const legIndex =
              seg.direction === "outbound"
                ? outboundOrder.indexOf(seg) + 1
                : inboundOrder.indexOf(seg) + 1;
            return (
              <li
                key={seg.id}
                role="listitem"
                className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-2"
                aria-labelledby={`leg-${seg.id}-label`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      id={`leg-${seg.id}-label`}
                      className="text-[10px] uppercase tracking-wide text-white/40"
                      role="heading"
                      aria-level={6}
                    >
                      {seg.direction === "outbound" ? "Outbound" : "Inbound"}{" "}
                      Leg {legIndex}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={seg.direction}
                      onChange={(e) => {
                        const val = e.target.value as "outbound" | "inbound";
                        updateSegment(seg.id, { direction: val });
                        setAriaMessage(
                          `${
                            val === "outbound" ? "Outbound" : "Inbound"
                          } leg ${legIndex} direction selected`
                        );
                      }}
                      className="text-[11px] bg-white/10 border border-white/20 rounded px-1.5 py-1 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      aria-label="Flight direction"
                    >
                      <option value="outbound">Outbound</option>
                      <option value="inbound">Inbound</option>
                    </select>
                    {segments.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          removeSegment(seg.id, seg.direction, legIndex)
                        }
                        className="text-[10px] px-2 py-1 rounded bg-red-600/30 hover:bg-red-600/50 text-red-100 border border-red-500/40 cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-400/50"
                        aria-label={`Remove ${seg.direction} leg ${legIndex}`}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid md:grid-cols-5 gap-2 md:gap-3">
                  <div className="space-y-1 md:col-span-1">
                    <label className="sr-only">Flight Number</label>
                    <input
                      ref={isFirstEditable ? firstFieldRef : undefined}
                      id={`flightnum-${seg.id}`}
                      aria-labelledby={`leg-${seg.id}-label flightnum-label`}
                      value={seg.flightNumber || ""}
                      onChange={(e) =>
                        updateSegment(seg.id, { flightNumber: e.target.value })
                      }
                      placeholder="KL 861"
                      className="w-full text-[12px] bg-white/5 border border-white/15 rounded-md px-2 py-1.5 text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div className="space-y-1 md:col-span-1">
                    <label className="sr-only">Route</label>
                    <input
                      aria-labelledby={`leg-${seg.id}-label route-label`}
                      value={seg.route || ""}
                      onChange={(e) =>
                        updateSegment(seg.id, { route: e.target.value })
                      }
                      placeholder="AMS→NRT"
                      className="w-full text-[12px] bg-white/5 border border-white/15 rounded-md px-2 py-1.5 text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div className="space-y-1 md:col-span-1">
                    <label className="sr-only">Dep Time</label>
                    <input
                      aria-labelledby={`leg-${seg.id}-label deptime-label`}
                      value={seg.depTime || ""}
                      onChange={(e) =>
                        updateSegment(seg.id, { depTime: e.target.value })
                      }
                      placeholder="Dep 08:00"
                      className="w-full text-[12px] bg-white/5 border border-white/15 rounded-md px-2 py-1.5 text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div className="space-y-1 md:col-span-1">
                    <label className="sr-only">Arr Time</label>
                    <input
                      aria-labelledby={`leg-${seg.id}-label arrtime-label`}
                      value={seg.arrTime || ""}
                      onChange={(e) =>
                        updateSegment(seg.id, { arrTime: e.target.value })
                      }
                      placeholder="Arr 15:30+1"
                      className="w-full text-[12px] bg-white/5 border border-white/15 rounded-md px-2 py-1.5 text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div className="flex items-start md:col-span-1 pt-0.5">
                    <button
                      type="button"
                      onClick={() =>
                        onChange(segments.filter((s) => s.id !== seg.id))
                      }
                      className="text-[10px] w-full px-2 py-1.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white/80 cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-400/50"
                      aria-label={`Delete this ${seg.direction} leg`}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="flex flex-wrap gap-2 mt-4">
          <button
            type="button"
            ref={addOutboundBtnRef}
            onClick={() => addSegment("outbound")}
            className="text-[11px] px-2.5 py-1.5 rounded-md bg-blue-600/40 hover:bg-blue-600/60 border border-blue-400/40 text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400/50"
            aria-label="Add outbound flight leg"
          >
            + Outbound Leg
          </button>
          <button
            type="button"
            ref={addInboundBtnRef}
            onClick={() => addSegment("inbound")}
            className="text-[11px] px-2.5 py-1.5 rounded-md bg-green-600/40 hover:bg-green-600/60 border border-green-400/40 text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-400/50"
            aria-label="Add inbound flight leg"
          >
            + Inbound Leg
          </button>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
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
          Apply Flights
        </button>
      </div>
      <p id="flight-form-desc" className="sr-only">
        Enter one or more flight legs. Add multiple outbound and inbound legs
        for transfers. Only legs with a flight number are included.
      </p>
      <span aria-live="polite" className="sr-only">
        {ariaMessage}
      </span>
      <span id="flightnum-label" className="sr-only">
        Flight number
      </span>
      <span id="route-label" className="sr-only">
        Route
      </span>
      <span id="deptime-label" className="sr-only">
        Departure time
      </span>
      <span id="arrtime-label" className="sr-only">
        Arrival time
      </span>
    </div>
  );
}
