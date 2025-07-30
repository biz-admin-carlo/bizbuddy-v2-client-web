// components/Dashboard/DashboardContent/CompanyPanel/Settings/CompanyConfigurations.jsx
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState, useCallback } from "react";
import { Building2, Loader2, Save, Clock, User, CheckSquare, AlertCircle, Pencil, Trash2 } from "lucide-react";
import { toast, Toaster } from "sonner";
import useAuthStore from "@/store/useAuthStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export default function CompanyConfigurations() {
  const { token, role } = useAuthStore();
  const API = process.env.NEXT_PUBLIC_API_URL;
  useEffect(() => {
    if (role && !["admin", "superadmin", "supervisor"].includes(role.toLowerCase())) window.location.href = "/dashboard";
    if (!token) {
      toast.error("Session expired. Please log in again.");
      window.location.href = "/login";
    }
  }, [role, token]);

  const [leaveTypes, setLeaveTypes] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [matrix, setMatrix] = useState([]);
  const [loadingMatrix, setLoadingMatrix] = useState(true);
  const [draft, setDraft] = useState(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const loadSettings = async () => {
    setLoadingSettings(true);
    try {
      const r = await fetch(`${API}/api/company-settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await r.json();
      if (r.ok) setDraft(j.data || {});
      else toast.error(j.message || "Failed to load settings");
    } catch {
      toast.error("Network error while loading settings");
    }
    setLoadingSettings(false);
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      const r = await fetch(`${API}/api/company-settings`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(draft),
      });
      const j = await r.json();
      if (r.ok) toast.success("Settings saved");
      else toast.error(j.message || "Failed to save settings");
    } catch {
      toast.error("Network error while saving settings");
    }
    setSavingSettings(false);
  };

  const loadData = async (retry = 0) => {
    setLoadingMatrix(true);
    setErrorMessage(null);
    try {
      const [mRes, pRes] = await Promise.all([
        fetch(`${API}/api/leave-balances/matrix?cb=${Date.now()}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }),
        fetch(`${API}/api/leave-policies`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }),
      ]);
      const [mData, pData] = await Promise.all([mRes.json(), pRes.json()]);
      if (!mRes.ok || !pRes.ok) {
        const msg = mData.message || pData.message || "Failed to load data from server";
        setErrorMessage(msg);
        toast.error(msg);
        if (retry < 2) {
          await new Promise((r) => setTimeout(r, 1000 * (retry + 1)));
          return loadData(retry + 1);
        }
      }
      const rows = Array.isArray(mData.data) ? mData.data : [];
      const policiesArr = Array.isArray(pData.data) ? pData.data : [];
      const types = policiesArr.map((p) => p.leaveType);
      const validated = rows.map((row) => {
        const balObj = {};
        types.forEach((t) => {
          const credits = Number(row.balances?.[t] || 0);
          const used = Number(row.usedBalances?.[t] || 0);
          const available = Math.max(credits - used, 0);
          balObj[t] = { credits, used, available };
        });
        return { ...row, balances: balObj };
      });
      setMatrix(validated);
      setPolicies(policiesArr);
      setLeaveTypes(types);
    } catch {
      const msg = "Network error while loading data";
      setErrorMessage(msg);
      toast.error(msg);
    }
    setLoadingMatrix(false);
  };

  useEffect(() => {
    if (token) {
      loadSettings();
      loadData();
    }
  }, [token]);

  return (
    <TooltipProvider>
      <div className="container mx-auto p-4 lg:p-8 space-y-6">
        <Toaster position="top-center" />
        <h2 className="text-3xl font-bold flex items-center gap-3">
          <Building2 className="h-8 w-8 text-orange-500" />
          Company Configurations
        </h2>
        <TimeDefaultsCard loading={loadingSettings} draft={draft} setDraft={setDraft} />
        <LeaveTypesCard API={API} token={token} policies={policies} reload={loadData} />
        <LeaveAdminCard
          token={token}
          API={API}
          leaveTypes={leaveTypes}
          matrix={matrix}
          loadingMatrix={loadingMatrix}
          errorMessage={errorMessage}
          reload={loadData}
        />
        <div className="flex justify-end">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={saveSettings}
                disabled={savingSettings || loadingSettings}
                className="bg-orange-500 hover:bg-orange-600 text-white font-semibold gap-2"
              >
                {savingSettings ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                Save Settings
              </Button>
            </TooltipTrigger>
            <TooltipContent>Save all configuration changes</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}

function TimeDefaultsCard({ loading, draft, setDraft }) {
  return (
    <Card className="border-2 shadow-lg">
      <div className="h-1 w-full bg-orange-500" />
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl font-semibold">
          <Clock className="h-6 w-6 text-orange-500" />
          Time-keeping Defaults
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <>
            <NumberField
              label="Default Shift Hours"
              value={draft?.defaultShiftHours}
              onChange={(v) => setDraft((o) => ({ ...o, defaultShiftHours: v }))}
              step="0.25"
            />
            <NumberField
              label="Minimum Lunch Deduction (minutes)"
              value={draft?.minimumLunchMinutes}
              onChange={(v) => setDraft((o) => ({ ...o, minimumLunchMinutes: v }))}
              step="5"
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}

function NumberField({ label, value, onChange, step }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <Input
        type="number"
        step={step}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      />
    </div>
  );
}

function LeaveTypesCard({ API, token, policies, reload }) {
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");

  const startEdit = (id, name) => {
    setEditId(id);
    setEditName(name);
  };

  const saveEdit = async () => {
    if (!editName.trim()) {
      toast.error("Name required");
      return;
    }
    try {
      const r = await fetch(`${API}/api/leave-policies/${editId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ leaveType: editName.trim() }),
      });
      const j = await r.json();
      if (r.ok) {
        toast.success("Leave type updated");
        setEditId(null);
        setEditName("");
        reload();
      } else toast.error(j.message || "Update failed");
    } catch {
      toast.error("Network error");
    }
  };

  const deleteType = async (id) => {
    if (!confirm("Delete this leave type?")) return;
    try {
      const r = await fetch(`${API}/api/leave-policies/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await r.json();
      if (r.ok) {
        toast.success("Deleted");
        reload();
      } else toast.error(j.message || "Delete failed");
    } catch {
      toast.error("Network error");
    }
  };

  return (
    <Card className="border-2 shadow-lg">
      <div className="h-1 w-full bg-orange-500" />
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Manage Leave Types</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Table>
          <TableHeader className="sticky top-0 dark:bg-neutral-950">
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {policies.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  {editId === p.id ? <Input value={editName} onChange={(e) => setEditName(e.target.value)} /> : p.leaveType}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  {editId === p.id ? (
                    <>
                      <Button size="sm" onClick={saveEdit} className="bg-orange-500 text-white">
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditId(null)}>
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="icon" variant="outline" onClick={() => startEdit(p.id, p.leaveType)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="outline" onClick={() => deleteType(p.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function LeaveAdminCard({ token, API, leaveTypes, matrix, loadingMatrix, errorMessage, reload }) {
  const userOptions = matrix.map((r) => ({
    value: r.userId,
    label: `${r.fullName} (${r.email})`,
  }));
  const [userId, setUserId] = useState("");
  const [typesSel, setTypesSel] = useState([]);
  const [hours, setHours] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => setTypesSel(leaveTypes), [leaveTypes]);
  const debouncedSetUserId = useCallback((v) => setUserId(v), []);
  const handleTypeToggle = (t) => setTypesSel((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));

  const applyAdjust = async () => {
    const hrs = Number(hours);
    if (!userId || hrs === 0 || isNaN(hrs)) {
      toast.error("Select employee and hours ≠ 0");
      return;
    }
    if (!typesSel.length) {
      toast.error("Choose at least one leave type");
      return;
    }
    setSaving(true);
    try {
      const r = await fetch(`${API}/api/leave-balances/adjust`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetUserId: userId,
          leaveTypes: typesSel,
          hours: hrs,
        }),
      });
      const j = await r.json();
      if (r.ok) {
        toast.success("Balances adjusted");
        setHours("");
        reload();
      } else toast.error(j.message || "Failed");
    } catch {
      toast.error("Network error");
    }
    setSaving(false);
  };

  return (
    <Card className="border-2 shadow-lg">
      <div className="h-1 w-full bg-orange-500" />
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Leave Credits</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-4 gap-4 items-end">
          <div className="space-y-2">
            <label className="text-sm font-medium flex gap-1 items-center">
              <User className="h-5 w-5 text-orange-500" /> Employee
            </label>
            <Select value={userId} onValueChange={debouncedSetUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {userOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium flex gap-1 items-center">
              <CheckSquare className="h-5 w-5 text-orange-500" /> Leave Types
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full">
                  {typesSel.length === leaveTypes.length && leaveTypes.length
                    ? "All types"
                    : typesSel.length
                    ? `${typesSel.length} selected`
                    : "Select leave types"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64">
                <div className="space-y-2">
                  {leaveTypes.map((t) => (
                    <div key={t} className="flex items-center space-x-2">
                      <Checkbox checked={typesSel.includes(t)} onCheckedChange={() => handleTypeToggle(t)} />
                      <label className="text-sm">{t}</label>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Adjust Hours (±)</label>
            <Input type="number" step="0.25" value={hours} onChange={(e) => setHours(e.target.value)} />
          </div>
          <div className="flex justify-end">
            <Button
              disabled={saving || loadingMatrix}
              onClick={applyAdjust}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : "Apply"}
            </Button>
          </div>
        </div>
        {loadingMatrix ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : errorMessage ? (
          <div className="flex justify-center items-center text-red-500 gap-2">
            <AlertCircle className="h-5 w-5" /> {errorMessage}
          </div>
        ) : matrix.length === 0 ? (
          <div className="text-center text-neutral-500">No leave balance data available</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="sticky top-0 dark:bg-neutral-950">
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Email</TableHead>
                  {leaveTypes.map((t) => (
                    <TableHead key={t} className="text-center">
                      <div>{t}</div>
                      <div className="text-xs flex justify-center gap-2 ">
                        <span>Credits</span>
                        <span>Used</span>
                        <span>Available</span>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {matrix.map((row) => (
                  <TableRow key={row.userId}>
                    <TableCell>{row.fullName}</TableCell>
                    <TableCell>{row.email}</TableCell>
                    {leaveTypes.map((t) => {
                      const cell = row.balances[t];
                      return (
                        <TableCell key={t} className="text-center">
                          <div className="flex justify-center gap-4 bg-neutral-300 rounded-md p-1 dark:bg-neutral-950">
                            <span>{cell.credits.toFixed(2)}</span>
                            <span>{cell.used.toFixed(2)}</span>
                            <span>{cell.available.toFixed(2)}</span>
                          </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
