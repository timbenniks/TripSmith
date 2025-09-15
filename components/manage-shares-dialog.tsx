"use client";

import { useEffect, useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
// Calendar/Popover removed in favor of native date input

type ShareItem = {
  token: string;
  url: string;
  createdAt: string;
  expiresAt?: string | null;
};

export function ManageSharesDialog({
  tripId,
  open,
  onClose,
}: {
  tripId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [shares, setShares] = useState<ShareItem[]>([]);
  const [creating, setCreating] = useState(false);
  const [expiresOn, setExpiresOn] = useState<string>("");

  const fetchShares = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/share?tripId=${encodeURIComponent(tripId)}`
      );
      if (!res.ok) throw new Error("Failed to load shares");
      const data = (await res.json()) as { shares: ShareItem[] };
      setShares(data.shares || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchShares();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tripId]);

  const createShare = async () => {
    setCreating(true);
    try {
      let expiresAt: string | null = null;
      if (expiresOn) {
        const [y, m, d] = expiresOn.split("-").map((v) => parseInt(v, 10));
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
          const end = new Date(y, m - 1, d, 23, 59, 59, 999); // end of day local
          expiresAt = end.toISOString();
        }
      }
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId, expiresAt }),
      });
      if (!res.ok) throw new Error("Failed to create share");
      await fetchShares();
      setExpiresOn("");
    } catch (e) {
      console.error(e);
      alert("Failed to create share");
    } finally {
      setCreating(false);
    }
  };

  const revokeShare = async (token: string) => {
    try {
      const res = await fetch(`/api/share?token=${encodeURIComponent(token)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to revoke share");
      setShares((prev) => prev.filter((s) => s.token !== token));
    } catch (e) {
      console.error(e);
      alert("Failed to revoke share");
    }
  };

  const content = (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm text-white/80">Optional expiry date</label>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={expiresOn}
            onChange={(e) => setExpiresOn(e.target.value)}
            className="bg-white/10 text-white/80 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400/50 border border-white/20"
            aria-label="Expiry date"
          />
          {expiresOn && (
            <Button
              variant="ghost"
              className="px-3 py-2 text-white/70 hover:text-white hover:bg-white/10"
              onClick={() => setExpiresOn("")}
            >
              Clear
            </Button>
          )}
        </div>
        <div className="flex gap-2 mt-1">
          <Button
            onClick={createShare}
            disabled={creating}
            className="px-3 py-2"
          >
            {creating ? "Creating…" : "Create new link"}
          </Button>
          <Button
            variant="ghost"
            onClick={fetchShares}
            disabled={loading}
            className="px-3 py-2"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
        <p className="text-xs text-white/50">
          Tip: Leave empty for no expiry. If a date is selected, links expire at
          the end of that day.
        </p>
      </div>

      <div className="max-h-64 overflow-auto space-y-2">
        {shares.length === 0 && (
          <p className="text-sm text-white/60">No shares yet.</p>
        )}
        {shares.map((s) => (
          <div key={s.token} className="flex items-center gap-2">
            <Input
              value={s.url}
              readOnly
              onFocus={(e) => e.currentTarget.select()}
              className="text-sm"
              aria-label="Share link"
            />
            <Button
              variant="ghost"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(s.url);
                } catch {}
              }}
              className="px-3 py-2"
            >
              Copy
            </Button>
            <Button
              variant="ghost"
              className="text-red-300 hover:text-red-200 hover:bg-red-500/20"
              onClick={() => revokeShare(s.token)}
            >
              Revoke
            </Button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <ConfirmDialog
      open={open}
      title="Manage share links"
      description="Create new share links, copy them, or revoke access."
      confirmLabel="Close"
      cancelLabel=""
      hideCancel
      onConfirm={onClose}
      onCancel={onClose}
    >
      {content}
    </ConfirmDialog>
  );
}
