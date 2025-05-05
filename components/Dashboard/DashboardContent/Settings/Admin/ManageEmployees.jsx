/* eslint-disable react-hooks/exhaustive-deps */
"use client";

/**
 * ManageEmployees
 * -------------------------------------------------
 * • Full CRUD for employees
 * • Filters, sorting, CSV export + **CSV import**
 * • Employee-ID-first column + ID filter
 */

import { useEffect, useRef, useState } from "react";
import {
  Trash2,
  Edit3,
  ChevronDown,
  ChevronUp,
  Search,
  Users,
  RefreshCw,
  XCircle,
  Filter,
  AlertCircle,
  UserPlus,
  Building,
  Mail,
  UserCog,
  Download,
  UploadCloud,
  Info,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import Papa from "papaparse";
import useAuthStore from "@/store/useAuthStore";

/* ---------- shadcn/ui ---------- */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

/* ========================================================================= */
/*  Helper: CSV export                                                      */
/* ========================================================================= */
const buildCSV = (rows) => {
  const header = ["ID", "Name", "Email", "Department", "Role"];
  const body = rows.map((e) => [
    `"${e.id}"`,
    `"${`${e.profile?.firstName || ""} ${e.profile?.lastName || ""}`.trim()}"`,
    `"${e.email}"`,
    `"${e.department?.name || ""}"`,
    `"${e.role}"`,
  ]);
  return [header, ...body].map((l) => l.join(",")).join("\r\n");
};

/* CSV template for the info dialog */
const CSV_TEMPLATE = `firstName,lastName,email,password,role,departmentId
John,Doe,john.doe@example.com,Pa55word!,employee,
Jane,Smith,jane.smith@example.com,S3cret12,supervisor,dep123
Alice,Brown,alice.brown@example.com,Qwerty!23,admin,
`;

export default function ManageEmployees() {
  /* --------------------------------------------------------------------- */
  /*  Stores / config                                                      */
  /* --------------------------------------------------------------------- */
  const { token } = useAuthStore();
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  /* --------------------------------------------------------------------- */
  /*  Core data                                                            */
  /* --------------------------------------------------------------------- */
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);

  /* --------------------------------------------------------------------- */
  /*  UI state                                                             */
  /* --------------------------------------------------------------------- */
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  /* CSV import */
  const fileRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [importReport, setImportReport] = useState({ total: 0, success: 0, failed: [], processed: 0 });
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showInfoDialog, setShowInfoDialog] = useState(false);

  /* Create modal */
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "employee",
    departmentId: "",
  });
  const [createLoading, setCreateLoading] = useState(false);

  /* Edit modal */
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    id: null,
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "employee",
    departmentId: "",
  });
  const [editLoading, setEditLoading] = useState(false);

  /* Delete modal */
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  /* Sorting + filters */
  const [sortConfig, setSortConfig] = useState({ key: "name", direction: "ascending" });
  const [filters, setFilters] = useState({ id: "", name: "", department: "", role: "" });

  /* --------------------------------------------------------------------- */
  /*  Fetches                                                              */
  /* --------------------------------------------------------------------- */
  useEffect(() => {
    if (token) {
      fetchEmployees();
      fetchDepartments();
    }
  }, [token]);

  async function fetchEmployees() {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/employee`, { headers: { Authorization: `Bearer ${token}` } });
      const j = await res.json();
      if (res.ok) setEmployees(j.data || []);
      else toast.error(j.error || "Failed to fetch employees");
    } catch {
      toast.error("Failed to fetch employees");
    }
    setLoading(false);
  }

  async function fetchDepartments() {
    try {
      const res = await fetch(`${API_URL}/api/departments`, { headers: { Authorization: `Bearer ${token}` } });
      const j = await res.json();
      if (res.ok) setDepartments(j.data || []);
    } catch {
      /* ignore */
    }
  }

  async function refreshData() {
    setRefreshing(true);
    await Promise.all([fetchEmployees(), fetchDepartments()]);
    toast.message("Data refreshed");
    setRefreshing(false);
  }

  /* --------------------------------------------------------------------- */
  /*  Filters + sort helpers                                               */
  /* --------------------------------------------------------------------- */
  const handleFilterChange = (f, v) => setFilters({ ...filters, [f]: v });
  const clearFilters = () => setFilters({ id: "", name: "", department: "", role: "" });

  const requestSort = (key) =>
    setSortConfig((p) => ({
      key,
      direction: p.key === key && p.direction === "ascending" ? "descending" : "ascending",
    }));

  const getFilteredAndSortedEmployees = () => {
    const filtered = employees.filter((e) => {
      const idMatch = !filters.id || e.id.toLowerCase().includes(filters.id.toLowerCase());
      const name = `${e.profile?.firstName || ""} ${e.profile?.lastName || ""}`.trim().toLowerCase();
      const dept = e.department?.name?.toLowerCase() || "";
      const role = (e.role || "").toLowerCase();
      const nameMatch = !filters.name || name.includes(filters.name.toLowerCase());
      const deptMatch = !filters.department || dept.includes(filters.department.toLowerCase());
      const roleMatch = !filters.role || role.includes(filters.role.toLowerCase());
      return idMatch && nameMatch && deptMatch && roleMatch;
    });

    if (!sortConfig.key) return filtered;

    return [...filtered].sort((a, b) => {
      let aVal, bVal;
      switch (sortConfig.key) {
        case "id":
          aVal = a.id;
          bVal = b.id;
          break;
        case "name":
          aVal = `${a.profile?.firstName || ""} ${a.profile?.lastName || ""}`.toLowerCase();
          bVal = `${b.profile?.firstName || ""} ${b.profile?.lastName || ""}`.toLowerCase();
          break;
        case "email":
          aVal = (a.email || "").toLowerCase();
          bVal = (b.email || "").toLowerCase();
          break;
        case "role":
          aVal = (a.role || "").toLowerCase();
          bVal = (b.role || "").toLowerCase();
          break;
        case "department":
          aVal = (a.department?.name || "").toLowerCase();
          bVal = (b.department?.name || "").toLowerCase();
          break;
        default:
          aVal = 0;
          bVal = 0;
      }
      if (aVal < bVal) return sortConfig.direction === "ascending" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "ascending" ? 1 : -1;
      return 0;
    });
  };

  /* --------------------------------------------------------------------- */
  /*  Role badge                                                            */
  /* --------------------------------------------------------------------- */
  const RoleBadge = ({ role }) => {
    switch ((role || "").toLowerCase()) {
      case "admin":
        return (
          <Badge className="bg-purple-500 hover:bg-purple-600 text-white">
            <UserCog className="h-3 w-3 mr-1" />
            Admin
          </Badge>
        );
      case "supervisor":
        return (
          <Badge className="bg-blue-500 hover:bg-blue-600 text-white">
            <UserCog className="h-3 w-3 mr-1" />
            Supervisor
          </Badge>
        );
      default:
        return (
          <Badge className="bg-orange-500 hover:bg-orange-600 text-white">
            <Users className="h-3 w-3 mr-1" />
            Employee
          </Badge>
        );
    }
  };

  /* --------------------------------------------------------------------- */
  /*  CRUD                                                                 */
  /* --------------------------------------------------------------------- */
  function openCreate() {
    setCreateForm({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      role: "employee",
      departmentId: "",
    });
    setShowCreateModal(true);
  }

  async function handleCreateEmployee() {
    if (!createForm.firstName.trim()) return toast.error("First name required");
    if (!createForm.lastName.trim()) return toast.error("Last name required");
    if (!createForm.email.trim()) return toast.error("Email required");
    if (!createForm.password.trim()) return toast.error("Password required");

    setCreateLoading(true);
    try {
      const payload = {
        username: `${createForm.firstName}.${createForm.lastName}`.toLowerCase(),
        email: createForm.email,
        password: createForm.password,
        firstName: createForm.firstName,
        lastName: createForm.lastName,
        role: createForm.role,
      };
      if (createForm.departmentId && createForm.departmentId !== "none") payload.departmentId = createForm.departmentId;

      const res = await fetch(`${API_URL}/api/employee`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (res.ok) {
        toast.success("Employee created");
        setShowCreateModal(false);
        fetchEmployees();
      } else toast.error(j.error || "Failed");
    } catch {
      toast.error("Failed");
    }
    setCreateLoading(false);
  }

  function openEdit(e) {
    setEditForm({
      id: e.id,
      firstName: e.profile?.firstName || "",
      lastName: e.profile?.lastName || "",
      email: e.email,
      password: "",
      role: e.role,
      departmentId: e.department?.id || "",
    });
    setShowEditModal(true);
  }

  async function handleSaveEdit() {
    if (!editForm.firstName.trim()) return toast.error("First name required");
    if (!editForm.lastName.trim()) return toast.error("Last name required");
    if (!editForm.email.trim()) return toast.error("Email required");

    setEditLoading(true);
    try {
      const payload = {
        email: editForm.email,
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        role: editForm.role,
      };
      if (editForm.password) payload.password = editForm.password;
      if (editForm.departmentId && editForm.departmentId !== "none") payload.departmentId = editForm.departmentId;

      const res = await fetch(`${API_URL}/api/employee/${editForm.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (res.ok) {
        toast.success("Employee updated");
        setShowEditModal(false);
        fetchEmployees();
      } else toast.error(j.error || "Failed");
    } catch {
      toast.error("Failed");
    }
    setEditLoading(false);
  }

  function openDelete(emp) {
    setEmployeeToDelete(emp);
    setShowDeleteModal(true);
  }

  async function confirmDelete() {
    if (!employeeToDelete) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/employee/${employeeToDelete.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await res.json();
      if (res.ok) {
        toast.success("Employee deleted");
        setEmployees((prev) => prev.filter((e) => e.id !== employeeToDelete.id));
      } else toast.error(j.error || "Failed");
    } catch {
      toast.error("Failed");
    }
    setDeleteLoading(false);
    setShowDeleteModal(false);
  }

  /* --------------------------------------------------------------------- */
  /*  CSV Import helpers                                                   */
  /* --------------------------------------------------------------------- */
  const openFilePicker = () => fileRef.current?.click();

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data, errors }) => {
        if (errors.length) return toast.error("CSV parse error");
        if (!data.length || !data[0].firstName) return toast.error("CSV header invalid");
        setShowImportDialog(true);
        importCsvRows(data);
      },
      error: () => toast.error("CSV read error"),
    });
  };

  const importCsvRows = async (rows) => {
    setImporting(true);
    const summary = { total: rows.length, success: 0, failed: [], processed: 0 };
    setImportReport(summary);

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.firstName || !r.lastName || !r.email || !r.password || !r.role) {
        summary.failed.push({ row: i + 1, reason: "Required column empty" });
        summary.processed = i + 1;
        setImportReport({ ...summary });
        continue;
      }

      const payload = {
        username: `${r.firstName}.${r.lastName}`.toLowerCase(),
        email: r.email,
        password: r.password,
        firstName: r.firstName,
        lastName: r.lastName,
        role: r.role.toLowerCase(),
      };
      /* <-- FIX: only include departmentId when non-blank */
      if (r.departmentId && r.departmentId.trim()) payload.departmentId = r.departmentId.trim();

      try {
        const res = await fetch(`${API_URL}/api/employee`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
        const j = await res.json();
        if (res.ok) summary.success += 1;
        else summary.failed.push({ row: i + 1, reason: j.error || "API error" });
      } catch {
        summary.failed.push({ row: i + 1, reason: "Network error" });
      }

      summary.processed = i + 1;
      setImportReport({ ...summary });
    }

    setImporting(false);
    fetchEmployees();
  };

  /* --------------------------------------------------------------------- */
  /*  Render                                                               */
  /* --------------------------------------------------------------------- */
  return (
    <div className="max-w-7xl mx-auto p-4 space-y-8">
      <Toaster position="top-center" />

      {/* ======================= HEADER ======================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-7 w-7 text-orange-500" />
            Manage Employees
          </h2>
          <p className="text-muted-foreground mt-1">Create, import, and manage employees</p>
        </div>

        <div className="flex gap-2">
          {/* refresh */}
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

          {/* export */}
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const rows = getFilteredAndSortedEmployees();
                    if (!rows.length) return toast.message("No data to export");
                    setExporting(true);
                    try {
                      const d = new Date();
                      const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
                      const blob = new Blob([buildCSV(rows)], { type: "text/csv;charset=utf-8;" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `Employees_${date}.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                      toast.message("CSV exported");
                    } finally {
                      setExporting(false);
                    }
                  }}
                  disabled={exporting}
                  className="border-orange-500/30 text-orange-700 hover:bg-orange-500/10 dark:border-orange-500/30 dark:text-orange-400 dark:hover:bg-orange-500/20"
                >
                  <Download className={`h-4 w-4 ${exporting ? "animate-spin" : ""}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export current table</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* upload */}
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={openFilePicker}
                  className="border-orange-500/30 text-orange-700 hover:bg-orange-500/10 dark:border-orange-500/30 dark:text-orange-400 dark:hover:bg-orange-500/20"
                >
                  <UploadCloud className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Upload CSV</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* info */}
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowInfoDialog(true)}
                  className="border-orange-500/30 text-orange-700 hover:bg-orange-500/10 dark:border-orange-500/30 dark:text-orange-400 dark:hover:bg-orange-500/20"
                >
                  <Info className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>CSV format</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* create */}
          <Button onClick={openCreate} className="bg-orange-500 hover:bg-orange-600 text-white font-semibold">
            <UserPlus className="mr-2 h-4 w-4" />
            Create Employee
          </Button>
        </div>
      </div>

      {/* ======================= FILTERS CARD ======================= */}
      <Card className="border-2 shadow-md overflow-hidden dark:border-white/10">
        <div className="h-1 w-full bg-orange-500" />
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-orange-500/10 text-orange-500 dark:bg-orange-500/20 dark:text-orange-500">
              <Filter className="h-5 w-5" />
            </div>
            Search &amp; Filter
          </CardTitle>
          <CardDescription>Find employees by ID, name, department, or role</CardDescription>
        </CardHeader>

        <CardContent>
          <div className="flex flex-wrap gap-3 mb-4">
            {/* ID */}
            <div className="flex-1 min-w-[180px]">
              <div className="flex items-center border rounded-md px-3 py-2 bg-black/5 dark:bg-white/5">
                <Search className="h-4 w-4 mr-2 text-muted-foreground" />
                <Input
                  placeholder="Filter by ID"
                  value={filters.id}
                  onChange={(e) => handleFilterChange("id", e.target.value)}
                  className="border-0 h-8 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                {filters.id && (
                  <Button variant="ghost" size="icon" onClick={() => handleFilterChange("id", "")} className="h-6 w-6 p-0 text-muted-foreground">
                    <XCircle className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* name */}
            <div className="flex-1 min-w-[180px]">
              <div className="flex items-center border rounded-md px-3 py-2 bg-black/5 dark:bg-white/5">
                <Search className="h-4 w-4 mr-2 text-muted-foreground" />
                <Input
                  placeholder="Filter by name"
                  value={filters.name}
                  onChange={(e) => handleFilterChange("name", e.target.value)}
                  className="border-0 h-8 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                {filters.name && (
                  <Button variant="ghost" size="icon" onClick={() => handleFilterChange("name", "")} className="h-6 w-6 p-0 text-muted-foreground">
                    <XCircle className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* department */}
            <div className="flex-1 min-w-[180px]">
              <div className="flex items-center border rounded-md px-3 py-2 bg-black/5 dark:bg-white/5">
                <Building className="h-4 w-4 mr-2 text-muted-foreground" />
                <Input
                  placeholder="Filter by department"
                  value={filters.department}
                  onChange={(e) => handleFilterChange("department", e.target.value)}
                  className="border-0 h-8 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                {filters.department && (
                  <Button variant="ghost" size="icon" onClick={() => handleFilterChange("department", "")} className="h-6 w-6 p-0 text-muted-foreground">
                    <XCircle className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* role */}
            <div className="flex-1 min-w-[180px]">
              <div className="flex items-center border rounded-md px-3 py-2 bg-black/5 dark:bg-white/5">
                <UserCog className="h-4 w-4 mr-2 text-muted-foreground" />
                <Input
                  placeholder="Filter by role"
                  value={filters.role}
                  onChange={(e) => handleFilterChange("role", e.target.value)}
                  className="border-0 h-8 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                {filters.role && (
                  <Button variant="ghost" size="icon" onClick={() => handleFilterChange("role", "")} className="h-6 w-6 p-0 text-muted-foreground">
                    <XCircle className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              Showing {getFilteredAndSortedEmployees().length} of {employees.length} employees
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Sort by:</span>

              {["id", "name", "role"].map((key) => (
                <TooltipProvider key={key} delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => requestSort(key)}
                        className={sortConfig.key === key ? "border-orange-500 bg-orange-500/10 text-orange-700 dark:text-orange-400" : ""}
                      >
                        {key.charAt(0).toUpperCase() + key.slice(1)}{" "}
                        {sortConfig.key === key &&
                          (sortConfig.direction === "ascending" ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />)}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Sort by {key}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ======================= TABLE ======================= */}
      <Card className="border-2 shadow-md overflow-hidden dark:border-white/10">
        <div className="h-1 w-full bg-orange-500" />
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-orange-500/10 text-orange-500 dark:bg-orange-500/20 dark:text-orange-500">
              <Users className="h-5 w-5" />
            </div>
            Employees
          </CardTitle>
          <CardDescription>Manage your organization’s employees</CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer" onClick={() => requestSort("id")}>
                    <div className="flex items-center">
                      ID{" "}
                      {sortConfig.key === "id" &&
                        (sortConfig.direction === "ascending" ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />)}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => requestSort("name")}>
                    <div className="flex items-center">
                      Name{" "}
                      {sortConfig.key === "name" &&
                        (sortConfig.direction === "ascending" ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />)}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => requestSort("email")}>
                    <div className="flex items-center">
                      Email{" "}
                      {sortConfig.key === "email" &&
                        (sortConfig.direction === "ascending" ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />)}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => requestSort("role")}>
                    <div className="flex items-center">
                      Role{" "}
                      {sortConfig.key === "role" &&
                        (sortConfig.direction === "ascending" ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />)}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => requestSort("department")}>
                    <div className="flex items-center">
                      Department{" "}
                      {sortConfig.key === "department" &&
                        (sortConfig.direction === "ascending" ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />)}
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      {Array(6)
                        .fill(0)
                        .map((__, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-6 w-full" />
                          </TableCell>
                        ))}
                    </TableRow>
                  ))
                ) : getFilteredAndSortedEmployees().length ? (
                  <AnimatePresence>
                    {getFilteredAndSortedEmployees().map((emp) => {
                      const fullName = `${emp.profile?.firstName || ""} ${emp.profile?.lastName || ""}`.trim();
                      return (
                        <motion.tr
                          key={emp.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border-b transition-colors hover:bg-muted/50"
                        >
                          <TableCell className="font-mono text-orange-700 dark:text-orange-400">{emp.id}</TableCell>
                          <TableCell className="font-medium capitalize">{fullName}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Mail className="h-3 w-3 mr-1 text-orange-500" />
                              {emp.email}
                            </div>
                          </TableCell>
                          <TableCell>
                            <RoleBadge role={emp.role} />
                          </TableCell>
                          <TableCell>
                            {emp.department ? (
                              <Badge
                                variant="outline"
                                className="border-orange-500/30 text-orange-700 hover:bg-orange-500/10 dark:border-orange-500/30 dark:text-orange-400 dark:hover:bg-orange-500/20"
                              >
                                <Building className="h-3 w-3 mr-1" />
                                {emp.department.name}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {/* edit */}
                              <TooltipProvider delayDuration={300}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openEdit(emp)}
                                      className="text-orange-700 hover:bg-orange-500/10 dark:text-orange-400 dark:hover:bg-orange-500/20"
                                    >
                                      <Edit3 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Edit employee</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                              {/* delete */}
                              <TooltipProvider delayDuration={300}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openDelete(emp)}
                                      className="text-red-500 hover:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Delete employee</TooltipContent>
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
                    <TableCell colSpan={6} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <div className="w-16 h-16 bg-black/5 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Users className="h-8 w-8 text-orange-500/50" />
                        </div>
                        <p>No employees match your filters.</p>
                        {(filters.id || filters.name || filters.department || filters.role) && (
                          <Button variant="link" onClick={clearFilters} className="text-orange-500 hover:text-orange-600 mt-2">
                            Clear all filters
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

      {/* ==================== CREATE MODAL ==================== */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="border-2 dark:border-white/10">
          <div className="h-1 w-full bg-orange-500 -mt-6 mb-4" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-orange-500/10 text-orange-500 dark:bg-orange-500/20 dark:text-orange-500">
                <UserPlus className="h-5 w-5" />
              </div>
              Create New Employee
            </DialogTitle>
            <DialogDescription>Add a new employee</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="c-first">
                  First Name
                </label>
                <Input id="c-first" value={createForm.firstName} onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="c-last">
                  Last Name
                </label>
                <Input id="c-last" value={createForm.lastName} onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="c-email">
                Email
              </label>
              <Input id="c-email" type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="c-pass">
                Password
              </label>
              <Input
                id="c-pass"
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <Select value={createForm.role} onValueChange={(v) => setCreateForm({ ...createForm, role: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Department</label>
                <Select value={createForm.departmentId} onValueChange={(v) => setCreateForm({ ...createForm, departmentId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="No Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Department</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateEmployee} disabled={createLoading} className="bg-orange-500 hover:bg-orange-600 text-white">
              {createLoading ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== EDIT MODAL ==================== */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="border-2 dark:border-white/10">
          <div className="h-1 w-full bg-orange-500 -mt-6 mb-4" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-orange-500/10 text-orange-500 dark:bg-orange-500/20 dark:text-orange-500">
                <Edit3 className="h-5 w-5" />
              </div>
              Edit Employee
            </DialogTitle>
            <DialogDescription>Update employee information</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="e-first">
                  First Name
                </label>
                <Input id="e-first" value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="e-last">
                  Last Name
                </label>
                <Input id="e-last" value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="e-email">
                Email
              </label>
              <Input id="e-email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="e-pass">
                New Password
              </label>
              <Input
                id="e-pass"
                type="password"
                value={editForm.password}
                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                placeholder="Leave blank to keep existing"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <Select value={editForm.role} onValueChange={(v) => setEditForm({ ...editForm, role: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Department</label>
                <Select value={editForm.departmentId} onValueChange={(v) => setEditForm({ ...editForm, departmentId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="No Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Department</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={editLoading} className="bg-orange-500 hover:bg-orange-600 text-white">
              {editLoading ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== DELETE MODAL ==================== */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="sm:max-w-md border-2 border-red-200 dark:border-red-800/50">
          <div className="h-1 w-full bg-red-500 -mt-6 mb-4" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400">
                <AlertCircle className="h-5 w-5" />
              </div>
              Delete Employee
            </DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>

          {employeeToDelete && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 my-4">
              <p className="text-sm text-red-600 dark:text-red-400">
                Delete{" "}
                <strong>
                  {employeeToDelete.profile?.firstName} {employeeToDelete.profile?.lastName}
                </strong>{" "}
                ({employeeToDelete.email})?
              </p>
            </div>
          )}

          <DialogFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              className="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800/50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              Cancel
            </Button>
            <Button variant="destructive" disabled={deleteLoading} onClick={confirmDelete}>
              {deleteLoading ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== IMPORT SUMMARY ==================== */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-md border-2 dark:border-white/10">
          <div className="h-1 w-full bg-orange-500 -mt-6 mb-4" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UploadCloud className="h-5 w-5 text-orange-500" />
              CSV Import Summary
            </DialogTitle>
          </DialogHeader>

          {importing ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">
                  Processing: {importReport.processed} of {importReport.total} rows
                </span>
                <span className="text-sm font-medium">{Math.round((importReport.processed / importReport.total) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 overflow-hidden">
                <div
                  className="bg-orange-500 h-2.5 rounded-full transition-all duration-300 ease-in-out"
                  style={{ width: `${(importReport.processed / importReport.total) * 100}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <div>Success: {importReport.success}</div>
                <div>Failed: {importReport.failed.length}</div>
              </div>
              <div className="flex justify-center mt-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p>
                Processed <strong>{importReport.total}</strong> rows.
                <br />
                Successfully created <strong>{importReport.success}</strong>.
              </p>

              {importReport.failed.length > 0 && (
                <Card variant="outline" className="border-red-300 dark:border-red-700">
                  <CardHeader className="pb-1">
                    <CardTitle className="text-red-600 text-sm">Failures ({importReport.failed.length})</CardTitle>
                  </CardHeader>
                  <ScrollArea className="max-h-60">
                    <ul className="text-sm px-4 pb-4 space-y-1">
                      {importReport.failed.map((f, i) => (
                        <li key={i}>
                          Employee {f.row}: {f.reason}
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                </Card>
              )}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowImportDialog(false)} disabled={importing} className="bg-orange-500 hover:bg-orange-600 text-white">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== INFO DIALOG ==================== */}
      <Dialog open={showInfoDialog} onOpenChange={setShowInfoDialog}>
        <DialogContent className="max-w-lg border-2 dark:border-white/10">
          <div className="h-1 w-full bg-orange-500 -mt-6 mb-4" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-orange-500" />
              CSV Format Guide
            </DialogTitle>
          </DialogHeader>

          <p className="mb-2 text-sm">
            Provide a <code>.csv</code> file with the <strong>exact</strong> headers shown below. <br />
            <em>departmentId</em> is optional; leave the cell blank if the employee has no department.
          </p>

          <pre className="bg-black/5 dark:bg-white/10 p-4 rounded-md text-sm overflow-x-auto">{CSV_TEMPLATE}</pre>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                const blob = new Blob([CSV_TEMPLATE], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "employees_template.csv";
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Download Sample
            </Button>
            <Button onClick={() => setShowInfoDialog(false)} className="bg-orange-500 hover:bg-orange-600 text-white">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* hidden file input */}
      <input ref={fileRef} type="file" accept=".csv" onChange={onFile} className="hidden" />
    </div>
  );
}
