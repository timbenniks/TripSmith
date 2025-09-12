"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Share2, Trash2, FileText } from "lucide-react";
import { motion } from "framer-motion";

interface TripActionsHeaderProps {
  tripName: string;
  destination: string;
  onDelete: () => void;
  onDownloadPDF: () => void;
  onShare: () => void;
  onBackToTrips?: () => void;
}

export function TripActionsHeader({
  tripName,
  destination,
  onDelete,
  onDownloadPDF,
  onShare,
  onBackToTrips,
}: TripActionsHeaderProps) {
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [isPDFLoading, setIsPDFLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setIsDeleteLoading(true);
    try {
      await onDelete();
    } catch (error) {
      console.error("Delete failed:", error);
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

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-0 z-50 bg-black/20 backdrop-blur-2xl border-b border-white/30 shadow-lg"
    >
      <div className="flex items-center justify-between px-6 py-4">
        {/* Left side - Logo and Trip Info */}
        <div className="flex items-center gap-4">
          {/* Back Button */}
          <Button
            onClick={handleBackToTrips}
            variant="ghost"
            size="sm"
            className="text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {/* Logo */}
          <div className="flex h-8 w-8 items-center justify-center rounded-full overflow-hidden bg-black/20 backdrop-blur-xl border border-white/30 shadow-lg ring-1 ring-white/20">
            <Image
              src="/images/tripsmith-logo.png"
              alt="TripSmith Logo"
              width={32}
              height={32}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Trip Info */}
          <div>
            <h1 className="text-xl font-semibold text-white truncate max-w-md">
              {tripName}
            </h1>
            <p className="text-sm text-white/60 truncate max-w-md">
              {destination}
            </p>
          </div>
        </div>

        {/* Right side - Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Share Button */}
          <Button
            onClick={onShare}
            variant="ghost"
            size="sm"
            className="text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            title="Share trip (Coming soon)"
          >
            <Share2 className="h-4 w-4" />
            <span className="hidden sm:inline ml-2">Share</span>
          </Button>

          {/* Download PDF Button */}
          <Button
            onClick={handleDownloadPDF}
            variant="ghost"
            size="sm"
            className="text-white/70 hover:text-white hover:bg-white/10 transition-colors"
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
