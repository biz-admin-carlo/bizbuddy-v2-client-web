// components/Dashboard/DashboardContent/CompanyPanel/Settings/CompanyConfigurations.jsx
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState } from "react";
import { Building2, Loader2, Save, Clock } from "lucide-react";
import { toast, Toaster } from "sonner";
import useAuthStore from "@/store/useAuthStore";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export default function CompanyConfigurations() {
  const { token, role } = useAuthStore();
  const API = process.env.NEXT_PUBLIC_API_URL;
  useEffect(() => {
    if (role && !["admin", "superadmin"].includes(role)) window.location.href = "/dashboard";
  }, [role]);
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/company-settings/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Fetch failed");
      setDraft(j.data ?? {});
    } catch (e) {
      toast.message(e.message);
      setDraft({});
    }
    setLoading(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/company-settings/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(draft),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Save failed");
      toast.message("Settings saved successfully");
      setDraft(j.data);
    } catch (e) {
      toast.message(e.message);
    }
    setSaving(false);
  };

  useEffect(() => {
    if (token) load();
  }, [token]);

  return (
    <div className="max-w-full mx-auto p-4 lg:px-10 px-2 space-y-8">
      <Toaster richColors />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-7 w-7 text-orange-500" />
            Company Configurations
          </h2>
        </div>
      </div>

      <Card className="border-2 shadow-md overflow-hidden dark:border-white/10">
        <div className="h-1 w-full bg-orange-500" />
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-orange-500/10 text-orange-500 dark:bg-orange-500/20 dark:text-orange-500">
              <Clock className="h-5 w-5" />
            </div>
            Time-keeping Defaults
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {loading ? (
            [...Array(2)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-500" />
                  Default Shift Hours (unscheduled days)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.25"
                  value={
                    draft?.defaultShiftHours === undefined || draft?.defaultShiftHours === null ? "" : draft.defaultShiftHours
                  }
                  placeholder="8"
                  onChange={(e) =>
                    setDraft((o) => ({
                      ...o,
                      defaultShiftHours: e.target.value === "" ? null : Number(e.target.value),
                    }))
                  }
                  className="pl-4"
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank to use <strong>8 hours</strong>
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-500" />
                  Minimum Lunch Deduction (minutes)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="5"
                  value={
                    draft?.minimumLunchMinutes === undefined || draft?.minimumLunchMinutes === null
                      ? ""
                      : draft.minimumLunchMinutes
                  }
                  placeholder="60"
                  onChange={(e) =>
                    setDraft((o) => ({
                      ...o,
                      minimumLunchMinutes: e.target.value === "" ? null : Number(e.target.value),
                    }))
                  }
                  className="pl-4"
                />
                <p className="text-xs text-muted-foreground">
                  <strong>0</strong> or blank disables forced lunch deduction. Recommended default:{" "}
                  <strong>60&nbsp;minutes</strong>.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button
          onClick={save}
          disabled={saving || loading}
          className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-2 flex items-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving Changes…
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
