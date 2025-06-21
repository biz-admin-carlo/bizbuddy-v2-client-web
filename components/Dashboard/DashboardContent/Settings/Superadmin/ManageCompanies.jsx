// components/Dashboard/DashboardContent/Settings/Superadmin/ManageTimeLogs.jsx
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState } from "react";
import { Building2, Edit3, Trash2, ChevronUp, ChevronDown, Search, CreditCard, AlertCircle, RefreshCw, Download } from "lucide-react";
import { toast, Toaster } from "sonner";
import useAuthStore from "@/store/useAuthStore";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion, AnimatePresence } from "framer-motion";

const COUNTRY_OPTS = ["Philippines", "United States", "Canada", "Japan"];
const CURRENCY_OPTS = ["PHP", "USD", "CAD", "JPY", "EUR"];
const LANGUAGE_OPTS = ["English", "Filipino", "Japanese", "French"];
const BLANK_FORM = {
  name: "",
  country: null,
  currency: null,
  language: null,
};

const arrow = (on, dir) => (on ? dir === "ascending" ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" /> : null);

const buildCSV = (rows) => {
  const header = ["ID", "Name", "Country", "Currency", "Language", "Start Date", "Expiration"];
  const body = rows.map((c) => {
    const sub = firstRelevantSub(c.Subscription);
    const start = sub?.startDate ? new Date(sub.startDate).toISOString() : "";
    const end = sub?.endDate ? new Date(sub.endDate).toISOString() : "";
    return [`"${c.id}"`, `"${c.name}"`, `"${c.country || ""}"`, `"${c.currency || ""}"`, `"${c.language || ""}"`, `"${start}"`, `"${end}"`];
  });
  return [header, ...body].map((l) => l.join(",")).join("\r\n");
};

function firstRelevantSub(subs) {
  if (!subs?.length) return null;
  return subs.find((s) => s.active) || subs.slice().sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())[0];
}

function ManageCompanies() {
  const { token } = useAuthStore();
  const API = process.env.NEXT_PUBLIC_API_URL;
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ ...BLANK_FORM, id: "" });
  const [showDelete, setShowDelete] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [details, setDetails] = useState(null);
  const [detailsLoad, setDetailsLoad] = useState(false);
  const [sort, setSort] = useState({ key: "name", direction: "ascending" });
  const [filterName, setFilterName] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (token) fetchCompanies();
  }, [token]);

  async function fetchCompanies() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/company/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (res.ok) setCompanies(json.data || []);
      else toast.error(json.message || "Failed to load companies");
    } catch {
      toast.error("Network error");
    }
    setLoading(false);
  }

  async function refreshData() {
    setRefreshing(true);
    await fetchCompanies();
    toast.message("Data refreshed");
    setRefreshing(false);
  }

  function exportCSV() {
    const rows = listed();
    if (!rows.length) return toast.message("No rows to export");
    setExporting(true);
    try {
      const d = new Date();
      const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
      const blob = new Blob([buildCSV(rows)], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Companies_${date}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.message("CSV exported");
    } finally {
      setExporting(false);
    }
  }

  const requestSort = (key) => {
    setSort((p) => ({
      key,
      direction: p.key === key && p.direction === "ascending" ? "descending" : "ascending",
    }));
  };

  const listed = () => {
    const filtered = companies.filter((c) => (filterName ? c.name.toLowerCase().includes(filterName.toLowerCase()) : true));
    if (!sort.key) return filtered;
    return [...filtered].sort((a, b) => {
      const aVal = (a[sort.key] ?? "").toString().toLowerCase();
      const bVal = (b[sort.key] ?? "").toString().toLowerCase();
      if (aVal < bVal) return sort.direction === "ascending" ? -1 : 1;
      if (aVal > bVal) return sort.direction === "ascending" ? 1 : -1;
      return 0;
    });
  };

  const renderSelect = (form, setForm, field, opts) => (
    <div className="grid grid-cols-4 items-center gap-4">
      <label htmlFor={`edit-${field}`} className="text-right font-medium text-sm capitalize">
        {field}
      </label>
      <Select value={form[field] ?? "none"} onValueChange={(v) => setForm({ ...form, [field]: v })}>
        <SelectTrigger id={`edit-${field}`} className="col-span-3">
          <SelectValue placeholder={`Select ${field}`} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">—</SelectItem>
          {opts.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  async function submitEdit() {
    const data = { ...editForm };
    ["country", "currency", "language"].forEach((f) => {
      if (data[f] === "none") data[f] = null;
    });

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/company/update/${data.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success("Company updated");
        setShowEdit(false);
        fetchCompanies();
      } else toast.error(json.message || "Update failed");
    } catch {
      toast.error("Network error");
    }
    setSubmitting(false);
  }

  async function confirmDelete() {
    if (!deleteId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/company/delete/${deleteId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (res.ok) {
        toast.success("Company deleted");
        setCompanies((p) => p.filter((c) => c.id !== deleteId));
        setShowDelete(false);
      } else toast.error(json.message || "Delete failed");
    } catch {
      toast.error("Network error");
    }
    setSubmitting(false);
  }

  async function openDetails(id) {
    setShowDetails(true);
    setDetails(null);
    setDetailsLoad(true);
    try {
      const res = await fetch(`${API}/api/company/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (res.ok) setDetails(json.data);
      else toast.error(json.message || "Failed to fetch details");
    } catch {
      toast.error("Network error");
    }
    setDetailsLoad(false);
  }

  return (
    <div className="max-w-full mx-auto p-4 lg:px-10 px-2 space-y-8">
      <Toaster position="top-center" />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-7 w-7 text-orange-500" />
            Manage Companies
          </h2>
          <p className="text-muted-foreground mt-1">Update tenant companies, subscriptions & payments</p>
        </div>
        <div className="flex gap-2">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={refreshData}
                  disabled={refreshing}
                  className="border-orange-500/30 text-orange-700 hover:bg-orange-500/10 dark:border-orange-500/30 dark:text-orange-400 dark:hover:bg-orange-500/20"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh data</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={exportCSV}
                  disabled={exporting || !listed().length}
                  className="border-orange-500/30 text-orange-700 hover:bg-orange-500/10 dark:border-orange-500/30 dark:text-orange-400 dark:hover:bg-orange-500/20"
                >
                  <Download className={`h-4 w-4 ${exporting ? "animate-spin" : ""}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export CSV</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      <Card className="border-2 shadow-md overflow-hidden dark:border-white/10">
        <div className="h-1 w-full bg-orange-500" />
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-orange-500/10 text-orange-500 dark:bg-orange-500/20 dark:text-orange-500">
              <Search className="h-5 w-5" />
            </div>
            Search & Filter
          </CardTitle>
          <CardDescription>Find companies by name</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex-1 min-w-[200px]">
              <div className="flex items-center border rounded-md px-3 py-2 bg-black/5 dark:bg-white/5">
                <Search className="h-4 w-4 mr-2 text-muted-foreground" />
                <Input
                  placeholder="Filter by company name"
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  className="border-0 h-8 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            </div>
            {filterName && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilterName("")}
                className="border-orange-500/30 text-orange-700 hover:bg-orange-500/10 dark:border-orange-500/30 dark:text-orange-400 dark:hover:bg-orange-500/20"
              >
                Clear Filter
              </Button>
            )}
          </div>

          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              Showing {listed().length} of {companies.length} companies
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              Sort by:
              {["name", "country", "startDate", "endDate"].map((key) => (
                <Button
                  key={key}
                  variant="outline"
                  size="sm"
                  onClick={() => requestSort(key)}
                  className={sort.key === key ? "border-orange-500 bg-orange-500/10 text-orange-700 dark:text-orange-400" : ""}
                >
                  {key === "startDate" ? "Start" : key === "endDate" ? "Expiration" : key.charAt(0).toUpperCase() + key.slice(1)}{" "}
                  {arrow(sort.key === key, sort.direction)}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="border-2 shadow-md overflow-hidden dark:border-white/10">
        <div className="h-1 w-full bg-orange-500" />
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-orange-500/10 text-orange-500 dark:bg-orange-500/20 dark:text-orange-500">
              <Building2 className="h-5 w-5" />
            </div>
            Companies
          </CardTitle>
          <CardDescription>Manage tenant companies</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  {["name", "country", "currency", "language", "start", "expires"].map((h) => {
                    const isSortable = ["name", "country", "currency", "language"].includes(h);
                    const sortKey = h === "start" ? "startDate" : h === "expires" ? "endDate" : h;
                    return (
                      <TableHead
                        key={h}
                        className={isSortable || h === "start" || h === "expires" ? "cursor-pointer" : ""}
                        onClick={
                          h === "start"
                            ? () => requestSort("startDate")
                            : h === "expires"
                            ? () => requestSort("endDate")
                            : isSortable
                            ? () => requestSort(h)
                            : undefined
                        }
                      >
                        <div className="flex items-center capitalize">
                          {h === "start" ? "Start Date" : h === "expires" ? "Expiration" : h}
                          {isSortable || h === "start" || h === "expires" ? arrow(sort.key === sortKey, sort.direction) : null}
                        </div>
                      </TableHead>
                    );
                  })}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      {Array(8)
                        .fill(null)
                        .map((__, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-6 w-full" />
                          </TableCell>
                        ))}
                    </TableRow>
                  ))
                ) : listed().length ? (
                  <AnimatePresence>
                    {listed().map((c) => {
                      const sub = firstRelevantSub(c.Subscription);
                      const startDate = sub?.startDate ? new Date(sub.startDate).toLocaleDateString() : "—";
                      const endDate = sub?.endDate ? new Date(sub.endDate).toLocaleDateString() : "—";
                      return (
                        <motion.tr
                          key={c.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                        >
                          <TableCell className="text-sm font-mono text-orange-700 dark:text-orange-400">{c.id}</TableCell>
                          <TableCell className="font-medium capitalize">{c.name}</TableCell>
                          <TableCell className="capitalize">{c.country || "—"}</TableCell>
                          <TableCell>{c.currency || "—"}</TableCell>
                          <TableCell>{c.language || "—"}</TableCell>
                          <TableCell>{startDate}</TableCell>
                          <TableCell>{endDate}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <TooltipProvider delayDuration={300}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openDetails(c.id)}
                                      className="text-orange-700 hover:bg-orange-500/10 dark:text-orange-400 dark:hover:bg-orange-500/20"
                                    >
                                      <CreditCard className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>View details</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider delayDuration={300}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setEditForm({
                                          ...c,
                                          country: c.country ?? "none",
                                          currency: c.currency ?? "none",
                                          language: c.language ?? "none",
                                        });
                                        setShowEdit(true);
                                      }}
                                      className="text-orange-700 hover:bg-orange-500/10 dark:text-orange-400 dark:hover:bg-orange-500/20"
                                    >
                                      <Edit3 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Edit company</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider delayDuration={300}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setDeleteId(c.id);
                                        setShowDelete(true);
                                      }}
                                      className="text-red-500 hover:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Delete company</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </TableCell>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <div className="w-16 h-16 bg-black/5 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Building2 className="h-8 w-8 text-orange-500/50" />
                        </div>
                        <p>No companies found.</p>
                        {filterName && (
                          <Button variant="link" onClick={() => setFilterName("")} className="text-orange-500 hover:text-orange-600 mt-2">
                            Clear filter
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent className="sm:max-w-md border-2 border-red-200 dark:border-red-800/50">
          <div className="h-1 w-full bg-red-500 -mt-6 mb-4" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400">
                <AlertCircle className="h-5 w-5" />
              </div>
              Delete Company
            </DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>

          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 my-4">
            <p className="text-sm text-red-600 dark:text-red-400">Deleting a company will remove all associated data.</p>
          </div>

          <DialogFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setShowDelete(false)}
              className="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800/50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={submitting}>
              {submitting ? "Deleting…" : "Delete Company"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl border-2 dark:border-white/10 overflow-y-auto max-h-[90vh]">
          <div className="h-1 w-full bg-orange-500 -mt-6 mb-4" />
          <DialogHeader>
            <DialogTitle>Company Details</DialogTitle>
          </DialogHeader>

          {detailsLoad ? (
            <div className="space-y-4">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-56 w-full" />
            </div>
          ) : details ? (
            <>
              <section className="space-y-1 mb-6">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Building2 className="h-5 w-5" /> {details.name}
                  <span className="text-sm font-mono text-orange-600">({details.id})</span>
                </h3>
                {details.country && <p className="text-sm text-muted-foreground">Country: {details.country}</p>}
                {details.currency && <p className="text-sm text-muted-foreground">Currency: {details.currency}</p>}
                {details.language && <p className="text-sm text-muted-foreground">Language: {details.language}</p>}
              </section>
              <section className="mb-6">
                <h4 className="font-medium mb-2 flex items-center gap-1">
                  <CreditCard className="h-4 w-4 text-orange-500" /> Subscriptions
                </h4>
                {details.Subscription?.length ? (
                  <ul className="space-y-2">
                    {details.Subscription.map((sub) => (
                      <li key={sub.id} className="flex items-start gap-2 text-sm">
                        <Badge className="bg-orange-500/20 text-orange-700 dark:text-orange-400">
                          {sub.plan?.name ?? "Plan"} {sub.active ? "(Active)" : "(Expired)"}
                        </Badge>
                        <span className="text-muted-foreground">
                          {new Date(sub.startDate).toLocaleDateString()} –{sub.endDate ? ` ${new Date(sub.endDate).toLocaleDateString()}` : " —"}
                          {sub.plan?.rangeOfUsers ? ` • ${sub.plan.rangeOfUsers} users` : ""}
                          {sub.plan?.price ? ` • $${sub.plan.price.toLocaleString()}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-sm">No subscriptions</p>
                )}
              </section>
            </>
          ) : (
            <p className="text-muted-foreground">No details loaded.</p>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="border-2 dark:border-white/10 max-w-lg">
          <div className="h-1 w-full bg-orange-500 -mt-6 mb-4" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-orange-500/10 text-orange-500 dark:bg-orange-500/20 dark:text-orange-500">
                <Edit3 className="h-5 w-5" />
              </div>
              Edit Company
            </DialogTitle>
            <DialogDescription>Update company information</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="edit-name" className="text-right font-medium text-sm">
                Name
              </label>
              <Input id="edit-name" className="col-span-3 bg-muted/40 border-dashed opacity-60 cursor-not-allowed" value={editForm.name} disabled />
            </div>

            {renderSelect(editForm, setEditForm, "country", COUNTRY_OPTS)}
            {renderSelect(editForm, setEditForm, "currency", CURRENCY_OPTS)}
            {renderSelect(editForm, setEditForm, "language", LANGUAGE_OPTS)}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>
              Cancel
            </Button>
            <Button onClick={submitEdit} disabled={submitting} className="bg-orange-500 hover:bg-orange-600 text-white">
              {submitting ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ManageCompanies;
