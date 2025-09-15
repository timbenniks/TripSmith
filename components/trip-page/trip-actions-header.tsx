"use client";

import { useState } from "react";
import { logError } from "@/lib/error-logger";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Share2, Trash2, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { useDelayedIndicator } from "@/hooks/useDelayedIndicator";

interface TripActionsHeaderProps {
  tripId: string;
  tripName: string;
  destination: string;
  status: "planning" | "booked" | "completed";
  onStatusChange: (
    newStatus: "planning" | "booked" | "completed"
  ) => Promise<void> | void;
  onDelete: () => void;
  onDownloadPDF: () => void;
  onShare: () => void;
  onBackToTrips?: () => void;
}

export function TripActionsHeader({
  tripId,
  tripName,
  destination,
  status,
  onStatusChange,
  onDelete,
  onDownloadPDF,
  onShare,
  onBackToTrips,
}: TripActionsHeaderProps) {
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [isPDFLoading, setIsPDFLoading] = useState(false);
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);
  const [localStatus, setLocalStatus] = useState(status);
  const router = useRouter();
  const showStatusDelay = useDelayedIndicator(isStatusUpdating, 1500);

  const handleDelete = async () => {
    setIsDeleteLoading(true);
    try {
      await onDelete();
    } catch (error) {
      console.error("Delete failed:", error);
      logError(error, {
        source: "TripActionsHeader",
        extra: { action: "delete", tripId },
      });
    } finally {
      setIsDeleteLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    setIsPDFLoading(true);
    try {
      await onDownloadPDF();
    } catch (error) {
      console.error("PDF download failed:", error);
      logError(error, {
        source: "TripActionsHeader",
        extra: { action: "pdf", tripId },
      });
    } finally {
      setIsPDFLoading(false);
    }
  };

  const handleBackToTrips = () => {
    if (onBackToTrips) {
      onBackToTrips();
    } else {
      router.push("/trips");
    }
  };

  const handleStatusSelect = async (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newStatus = e.target.value as "planning" | "booked" | "completed";
    if (newStatus === localStatus) return;
    setLocalStatus(newStatus); // optimistic
    setIsStatusUpdating(true);
    try {
      await onStatusChange(newStatus);
    } catch (err) {
      console.error("Failed to change status", err);
      logError(err, {
        source: "TripActionsHeader",
        extra: { action: "status", from: localStatus, to: newStatus, tripId },
      });
      // revert optimistic change on error
      setLocalStatus(status);
    } finally {
      setIsStatusUpdating(false);
    }
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-shrink-0 sticky top-0 z-50 bg-black/20 backdrop-blur-2xl border-b border-white/30 shadow-lg"
    >
      <div className="flex items-center justify-between px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
        {/* Left side - Logo and Trip Info */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
          {/* Back Button */}
          <Button
            onClick={handleBackToTrips}
            variant="ghost"
            size="sm"
            className="text-white/70 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
          >
            <ArrowLeft className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Back</span>
          </Button>

          {/* Logo */}
          <div className="flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-full overflow-hidden bg-black/20 backdrop-blur-xl border border-white/30 shadow-lg ring-1 ring-white/20 flex-shrink-0">
            <Image
              src="/images/tripsmith-logo.png"
              alt="TripSmith Logo"
              width={32}
              height={32}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Trip Info */}
          <div className="min-w-0 flex-1">
            <h1 className="text-sm sm:text-lg lg:text-xl font-semibold text-white truncate">
              {tripName}
            </h1>
            <p className="text-xs sm:text-sm text-white/60 truncate">
              {destination}
            </p>
          </div>
        </div>

        {/* Right side - Action Buttons */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {/* Status Selector (relocated) */}
          <div className="relative flex items-center">
            <label htmlFor="trip-status" className="sr-only">
              Trip status
            </label>
            <select
              id="trip-status"
              value={localStatus}
              onChange={handleStatusSelect}
              disabled={isStatusUpdating}
              aria-live="polite"
              className={`appearance-none bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors border border-white/20 rounded-md text-xs pl-2 pr-6 py-[6px] focus:outline-none focus:ring-2 focus:ring-purple-400/50 disabled:opacity-50 cursor-pointer`}
            >
              <option value="planning">Planning</option>
              <option value="booked">Booked</option>
              <option value="completed">Completed</option>
            </select>
            {/* Dropdown arrow */}
            <span className="pointer-events-none absolute right-1.5 text-white/50 text-[10px]">
              ▾
            </span>
            {showStatusDelay && (
              <span
                className="absolute -bottom-4 left-0 text-[10px] text-white/40 flex items-center gap-1"
                aria-live="polite"
              >
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-white/40" />
                updating…
              </span>
            )}
          </div>
          <span className="hidden sm:inline text-[10px] uppercase tracking-wide text-contrast-quaternary mr-1">
            {/* Visual divider label can be omitted for compactness */}
          </span>
          {/* Share Button */}
          <Button
            onClick={onShare}
            variant="ghost"
            size="sm"
            className="text-white/70 hover:text-white hover:bg-white/10 transition-colors p-2 sm:px-3"
            title="Share trip"
          >
            <Share2 className="h-4 w-4" />
            <span className="hidden lg:inline ml-2">Share</span>
          </Button>

          {/* Download PDF Button */}
          <Button
            onClick={handleDownloadPDF}
            variant="ghost"
            size="sm"
            className="text-white/70 hover:text-white hover:bg-white/10 transition-colors p-2 sm:px-3"
            disabled={isPDFLoading}
            title="Download PDF"
          >
            {isPDFLoading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            <span className="hidden sm:inline ml-2">PDF</span>
          </Button>

          {/* Delete Button */}
          <Button
            onClick={handleDelete}
            variant="ghost"
            size="sm"
            className="text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-colors"
            disabled={isDeleteLoading}
            title="Delete trip"
          >
            {isDeleteLoading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-400/20 border-t-red-400" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            <span className="hidden sm:inline ml-2">Delete</span>
          </Button>
        </div>
      </div>
    </motion.header>
  );
}
