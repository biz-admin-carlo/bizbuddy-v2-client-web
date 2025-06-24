// components/Dashboard/DashboardContent/Settings/Admin/ManageEmployees.jsx
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useRef, useState } from "react";
import {
  TrashIcon,
  EditIcon,
  ChevronDown,
  ChevronUp,
  Users,
  RefreshCw,
  Filter,
  AlertCircle,
  UserPlus,
  Building,
  Mail,
  UserCog,
  Download,
  UploadCloud,
  Info,
  Check,
  Table2,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import Papa from "papaparse";
import useAuthStore from "@/store/useAuthStore";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

/* ───────────────────────────────────────────────────────── helpers ── */
const buildCSV = (rows, visibleColumns) => {
  const headerMap = {
    id: "ID",
    employeeId: "Employee ID",
    name: "Name",
    email: "Email",
    role: "Role",
    department: "Department",
    hireDate: "Hire Date",
    createdAt: "Created At",
    updatedAt: "Updated At",
  };
  const header = visibleColumns.map((c) => headerMap[c]);
  const body = rows.map((e) => {
    const r = [];
    if (visibleColumns.includes("id")) r.push(`"${e.id}"`);
    if (visibleColumns.includes("employeeId")) r.push(`"${e.employeeId || ""}"`);
    if (visibleColumns.includes("name")) r.push(`"${`${e.profile?.firstName || ""} ${e.profile?.lastName || ""}`.trim()}"`);
    if (visibleColumns.includes("email")) r.push(`"${e.email}"`);
    if (visibleColumns.includes("role")) r.push(`"${e.role}"`);
    if (visibleColumns.includes("department")) r.push(`"${e.department?.name || ""}"`);
    if (visibleColumns.includes("hireDate")) r.push(`"${e.hireDate ? new Date(e.hireDate).toISOString().split("T")[0] : ""}"`);
    if (visibleColumns.includes("createdAt")) r.push(`"${new Date(e.createdAt).toLocaleString()}"`);
    if (visibleColumns.includes("updatedAt")) r.push(`"${new Date(e.updatedAt).toLocaleString()}"`);
    return r;
  });
  return [header, ...body].map((l) => l.join(",")).join("\r\n");
};

const formatDate = (d) =>
  d
    ? new Date(d).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const formatDateShort = (d) =>
  d
    ? new Date(d).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

const CSV_TEMPLATE = `firstName,lastName,email,password,role,departmentId,employeeId,hireDate
John,Doe,john.doe@example.com,Pa55word!,employee,,EMP001,2025-06-19
Jane,Smith,jane.smith@example.com,S3cret12,supervisor,dep123,EMP002,2025-06-20
Alice,Brown,alice.brown@example.com,Qwerty!23,admin,,EMP003,
`;

/* ────────────────────────────────────────────── component ─────────── */
export default function ManageEmployees() {
  const { token, user } = useAuthStore();
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  /* ---------------- state ---------------- */
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fileRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [importReport, setImportReport] = useState({
    total: 0,
    success: 0,
    failed: [],
    processed: 0,
  });
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showInfoDialog, setShowInfoDialog] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "employee",
    departmentId: "none",
    employeeId: "",
    hireDate: "",
  });
  const [createLoading, setCreateLoading] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    id: null,
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "employee",
    departmentId: "none",
    employeeId: "",
    hireDate: "",
  });
  const [editLoading, setEditLoading] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [sortConfig, setSortConfig] = useState({
    key: "name",
    direction: "ascending",
  });
  const [filters, setFilters] = useState({
    ids: ["all"],
    employeeIds: ["all"],
    names: ["all"],
    emails: ["all"],
    departments: ["all"],
    roles: ["all"],
  });

  const [columnVisibility, setColumnVisibility] = useState([
    "id",
    "employeeId",
    "name",
    "email",
    "role",
    "department",
    "hireDate",
    "createdAt",
    "updatedAt",
    "actions",
  ]);

  /* ---------------- data fetch ---------------- */
  useEffect(() => {
    if (token) {
      fetchEmployees();
      fetchDepartments();
    }
  }, [token]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/api/employee`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await r.json();
      if (r.ok) setEmployees(j.data || []);
      else toast.error(j.error || "Failed to fetch employees");
    } catch {
      toast.error("Failed to fetch employees");
    }
    setLoading(false);
  };

  const fetchDepartments = async () => {
    try {
      const r = await fetch(`${API_URL}/api/departments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await r.json();
      if (r.ok) setDepartments(j.data || []);
    } catch {
      /* ignore */
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await Promise.all([fetchEmployees(), fetchDepartments()]);
    toast.message("Data refreshed");
    setRefreshing(false);
  };

  /* ---------------- helpers ---------------- */
  const requestSort = (key) =>
    setSortConfig((p) => ({
      key,
      direction: p.key === key && p.direction === "ascending" ? "descending" : "ascending",
    }));

  const handleFilterChange = (key, value) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (value === "all") next[key] = ["all"];
      else {
        let list = prev[key].filter((x) => x !== "all");
        list = list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
        if (!list.length) list = ["all"];
        next[key] = list;
      }
      return next;
    });
  };

  const clearFilters = () =>
    setFilters({
      ids: ["all"],
      employeeIds: ["all"],
      names: ["all"],
      emails: ["all"],
      departments: ["all"],
      roles: ["all"],
    });

  const getFilteredAndSortedEmployees = () => {
    const filtered = employees.filter((e) => {
      if (user?.id && e.id === user.id) return false;
      const idMatch = filters.ids.includes("all") || filters.ids.includes(e.id);
      const empIdMatch = filters.employeeIds.includes("all") || filters.employeeIds.includes(e.employeeId || "none");
      const nameVal = `${e.profile?.firstName || ""} ${e.profile?.lastName || ""}`.trim().toLowerCase();
      const nameMatch = filters.names.includes("all") || filters.names.includes(nameVal);
      const emailMatch = filters.emails.includes("all") || filters.emails.includes(e.email.toLowerCase());
      const deptMatch = filters.departments.includes("all") || filters.departments.includes(e.department?.id || "none");
      const roleMatch = filters.roles.includes("all") || filters.roles.includes(e.role.toLowerCase());
      return idMatch && empIdMatch && nameMatch && emailMatch && deptMatch && roleMatch;
    });

    if (!sortConfig.key) return filtered;

    return [...filtered].sort((a, b) => {
      let aVal, bVal;
      switch (sortConfig.key) {
        case "id":
          aVal = a.id;
          bVal = b.id;
          break;
        case "employeeId":
          aVal = (a.employeeId || "").toLowerCase();
          bVal = (b.employeeId || "").toLowerCase();
          break;
        case "name":
          aVal = `${a.profile?.firstName || ""} ${a.profile?.lastName || ""}`.toLowerCase().trim();
          bVal = `${b.profile?.firstName || ""} ${b.profile?.lastName || ""}`.toLowerCase().trim();
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
        case "hireDate":
          aVal = a.hireDate ? new Date(a.hireDate).getTime() : 0;
          bVal = b.hireDate ? new Date(b.hireDate).getTime() : 0;
          break;
        case "createdAt":
        case "updatedAt":
          aVal = new Date(a[sortConfig.key]).getTime();
          bVal = new Date(b[sortConfig.key]).getTime();
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

  const RoleBadge = ({ role }) => {
    switch ((role || "").toLowerCase()) {
      case "superadmin":
        return <Badge className="bg-red-500 hover:bg-red-600 text-neutral-800">Superadmin</Badge>;
      case "admin":
        return <Badge className="bg-orange-500 hover:bg-orange-600 text-neutral-800">Admin</Badge>;
      case "supervisor":
        return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-neutral-800">Supervisor</Badge>;
      default:
        return <Badge className="bg-teal-500 hover:bg-teal-600 text-neutral-800">Employee</Badge>;
    }
  };

  const MultiSelect = ({ label, options, selected, onChange, allLabel, icon: Icon }) => {
    const allChecked = selected.includes("all");
    const displayLabel = allChecked ? allLabel : `${selected.length} selected`;
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="min-w-[180px] justify-between">
            <div className="flex items-center gap-2">
              {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
              {displayLabel}
            </div>
            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2 space-y-1" align="start">
          <div className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer" onClick={() => onChange("all")}>
            <Checkbox checked={allChecked} />
            <span>{allLabel}</span>
            {allChecked && <Check className="ml-auto h-4 w-4 text-orange-500" />}
          </div>
          <div className="max-h-64 overflow-y-auto pr-1">
            {options.map(({ value, label: optLabel }) => {
              const checked = selected.includes(value);
              return (
                <div key={value} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer" onClick={() => onChange(value)}>
                  <Checkbox checked={checked} />
                  <span className="truncate">{optLabel}</span>
                  {checked && <Check className="ml-auto h-4 w-4 text-orange-500" />}
                </div>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  /* column button helpers */
  const columnOptions = [
    { value: "id", label: "ID" },
    { value: "employeeId", label: "Employee ID" },
    { value: "name", label: "Name" },
    { value: "email", label: "Email" },
    { value: "role", label: "Role" },
    { value: "department", label: "Department" },
    { value: "hireDate", label: "Hire Date" },
    { value: "createdAt", label: "Created At" },
    { value: "updatedAt", label: "Updated At" },
    { value: "actions", label: "Actions" },
  ];

  const toggleColumn = (col) => setColumnVisibility((prev) => (prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]));

  /* ---------------- CRUD helpers (create, edit, delete, CSV import) ------ */
  const openCreate = () => {
    setCreateForm({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      role: "employee",
      departmentId: "none",
      employeeId: "",
      hireDate: "",
    });
    setShowCreateModal(true);
  };

  const handleCreateEmployee = async () => {
    if (!createForm.firstName.trim()) return toast.error("First name required");
    if (!createForm.lastName.trim()) return toast.error("Last name required");
    if (!createForm.email.trim()) return toast.error("Email required");
    if (!createForm.password.trim()) return toast.error("Password required");

    setCreateLoading(true);
    try {
      const payload = {
        username: `${createForm.firstName}.${createForm.lastName}`.toLowerCase().replace(/\s+/g, ""),
        email: createForm.email.trim().toLowerCase(),
        password: createForm.password,
        firstName: createForm.firstName.trim(),
        lastName: createForm.lastName.trim(),
        role: createForm.role,
        employeeId: createForm.employeeId ? createForm.employeeId.trim() : null,
        hireDate: createForm.hireDate || null,
      };
      if (createForm.departmentId && createForm.departmentId !== "none") payload.departmentId = createForm.departmentId;

      const r = await fetch(`${API_URL}/api/employee`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (r.ok) {
        toast.success("Employee created");
        setShowCreateModal(false);
        fetchEmployees();
      } else toast.error(j.error || "Failed to create employee");
    } catch {
      toast.error("Failed to create employee");
    }
    setCreateLoading(false);
  };

  const openEdit = (emp) => {
    setEditForm({
      id: emp.id,
      firstName: emp.profile?.firstName || "",
      lastName: emp.profile?.lastName || "",
      email: emp.email,
      password: "",
      role: emp.role === "superadmin" ? "admin" : emp.role,
      departmentId: emp.department?.id || "none",
      employeeId: emp.employeeId || "",
      hireDate: emp.hireDate ? new Date(emp.hireDate).toISOString().split("T")[0] : "",
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editForm.firstName.trim()) return toast.error("First name required");
    if (!editForm.lastName.trim()) return toast.error("Last name required");
    if (!editForm.email.trim()) return toast.error("Email required");

    setEditLoading(true);
    try {
      const payload = {
        email: editForm.email.trim().toLowerCase(),
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        role: editForm.role,
        employeeId: editForm.employeeId ? editForm.employeeId.trim() : null,
        hireDate: editForm.hireDate || null,
      };
      if (editForm.departmentId && editForm.departmentId !== "none") payload.departmentId = editForm.departmentId;
      if (editForm.password) payload.password = editForm.password;

      const r = await fetch(`${API_URL}/api/employee/${editForm.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (r.ok) {
        toast.success("Employee updated");
        setShowEditModal(false);
        fetchEmployees();
      } else toast.error(j.error || "Failed to update employee");
    } catch {
      toast.error("Failed to update employee");
    }
    setEditLoading(false);
  };

  const openDelete = (emp) => {
    setEmployeeToDelete(emp);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!employeeToDelete) return;
    setDeleteLoading(true);
    try {
      const r = await fetch(`${API_URL}/api/employee/${employeeToDelete.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await r.json();
      if (r.ok) {
        toast.success("Employee deleted");
        setEmployees((p) => p.filter((e) => e.id !== employeeToDelete.id));
      } else toast.error(j.error || "Failed to delete employee");
    } catch {
      toast.error("Failed to delete employee");
    }
    setDeleteLoading(false);
    setShowDeleteModal(false);
  };

  const openFilePicker = () => fileRef.current?.click();

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data, errors }) => {
        if (errors.length) return toast.error("CSV parse error");
        if (!data.length || !data[0].firstName) return toast.error("Invalid CSV header");
        setShowImportDialog(true);
        importCsvRows(data);
      },
      error: () => toast.error("CSV read error"),
    });
  };

  const importCsvRows = async (rows) => {
    setImporting(true);
    const summary = {
      total: rows.length,
      success: 0,
      failed: [],
      processed: 0,
    };
    setImportReport(summary);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row.firstName || !row.lastName || !row.email || !row.password || !row.role) {
        summary.failed.push({
          row: i + 1,
          reason: "Required column empty",
        });
        summary.processed = i + 1;
        setImportReport({ ...summary });
        continue;
      }

      const payload = {
        username: `${row.firstName}.${row.lastName}`.toLowerCase().replace(/\s+/g, ""),
        email: row.email.trim().toLowerCase(),
        password: row.password,
        firstName: row.firstName.trim(),
        lastName: row.lastName.trim(),
        role: row.role.toLowerCase() === "superadmin" ? "admin" : row.role.toLowerCase(),
        employeeId: row.employeeId ? row.employeeId.trim() : null,
        hireDate: row.hireDate || null,
      };
      if (row.departmentId && row.departmentId.trim()) payload.departmentId = row.departmentId.trim();

      try {
        const r = await fetch(`${API_URL}/api/employee`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        const j = await r.json();
        if (r.ok) summary.success += 1;
        else
          summary.failed.push({
            row: i + 1,
            reason: j.error || "API error",
          });
      } catch {
        summary.failed.push({ row: i + 1, reason: "Network error" });
      }

      summary.processed = i + 1;
      setImportReport({ ...summary });
    }

    setImporting(false);
    fetchEmployees();
  };

  /* ---------------- UI options for filters ---------------- */
  const idOptions = employees.map((e) => ({ value: e.id, label: e.id }));
  const employeeIdOptions = [
    { value: "none", label: "—" },
    ...employees.filter((e) => e.employeeId).map((e) => ({ value: e.employeeId, label: e.employeeId })),
  ];
  const nameOptions = employees.map((e) => ({
    value: `${e.profile?.firstName || ""} ${e.profile?.lastName || ""}`.trim().toLowerCase(),
    label: `${e.profile?.firstName || ""} ${e.profile?.lastName || ""}`.trim(),
  }));
  const emailOptions = employees.map((e) => ({
    value: e.email.toLowerCase(),
    label: e.email,
  }));
  const departmentOptions = [{ value: "none", label: "No Department" }, ...departments.map((d) => ({ value: d.id, label: d.name }))];
  const roleOptions = [
    { value: "employee", label: "Employee" },
    { value: "supervisor", label: "Supervisor" },
    { value: "admin", label: "Admin" },
    { value: "superadmin", label: "Superadmin" },
  ];

  /* ---------------- JSX ---------------- */
  return (
    <div className="max-w-full mx-auto p-4 lg:px-10 px-2 space-y-8">
      <Toaster position="top-center" />

      {/* header & quick actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-7 w-7 text-orange-500" />
            Manage Employees
          </h2>
          <p className="text-muted-foreground mt-1">Create, import, and manage employees (your account is not shown)</p>
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
                  className="flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-black"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh data</TooltipContent>
            </Tooltip>

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
                      const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
                      const visibleCols = columnVisibility.filter((c) => c !== "actions");
                      const blob = new Blob([buildCSV(rows, visibleCols)], {
                        type: "text/csv;charset=utf-8;",
                      });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `Employees_${dateStr}.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                      toast.message("CSV exported");
                    } finally {
                      setExporting(false);
                    }
                  }}
                  disabled={exporting}
                  className="flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-black"
                >
                  <Download className={`h-4 w-4 ${exporting ? "animate-spin" : ""}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export CSV</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={openFilePicker}
                  className="flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-black"
                >
                  <UploadCloud className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Upload CSV</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowInfoDialog(true)}
                  className="flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-black"
                >
                  <Info className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>CSV format guide</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button onClick={openCreate} className="bg-orange-500 hover:bg-orange-600 text-white font-semibold">
            <UserPlus className="mr-2 h-4 w-4" />
            Create Employee
          </Button>
        </div>
      </div>

      {/* dashboard card */}
      <Card className="border-2 shadow-md overflow-hidden dark:border-white/10">
        <div className="h-1 w-full bg-orange-500" />
        <CardHeader className="pb-2 relative">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-orange-200/25 text-orange-500 dark:bg-orange-400/20 dark:text-orange-400">
              <Filter className="h-5 w-5" />
            </div>
            Table Controls
          </CardTitle>
          <CardDescription>Filter, sort, and choose visible columns</CardDescription>
          <span className="absolute top-2 right-4 text-sm text-muted-foreground">
            Showing {getFilteredAndSortedEmployees().length} of {employees.length} employees
          </span>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {/* row 1 – column visibility */}
            <div className="flex flex-wrap gap-3">
              <span className="my-auto shrink-0 text-sm font-medium text-muted-foreground">Table:</span>
              {columnOptions.map(({ value, label }) => {
                const active = columnVisibility.includes(value);
                return (
                  <Button
                    key={value}
                    size="sm"
                    variant="outline"
                    className={active ? "border-orange-500 bg-orange-500/10 text-orange-700 dark:text-orange-400" : ""}
                    onClick={() => toggleColumn(value)}
                  >
                    {label}
                  </Button>
                );
              })}
            </div>

            {/* row 2 – sort */}
            <div className="flex flex-wrap gap-3">
              <span className="my-auto shrink-0 text-sm font-medium text-muted-foreground">Sort:</span>
              {["id", "employeeId", "name", "email", "role", "department", "hireDate"]
                .filter((k) => columnVisibility.includes(k))
                .map((k) => (
                  <TooltipProvider key={k} delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => requestSort(k)}
                          className={sortConfig.key === k ? "border-orange-500 bg-orange-500/10 text-orange-700 dark:text-orange-400" : ""}
                        >
                          {k === "employeeId" ? "Employee ID" : k.charAt(0).toUpperCase() + k.slice(1)}
                          {sortConfig.key === k &&
                            (sortConfig.direction === "ascending" ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />)}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Sort by {k === "employeeId" ? "Employee ID" : k}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
            </div>

            {/* row 3 – filters */}
            <div className="flex flex-wrap gap-3">
              <span className="my-auto shrink-0 text-sm font-medium text-muted-foreground">Filter:</span>
              <MultiSelect label="IDs" options={idOptions} selected={filters.ids} onChange={(v) => handleFilterChange("ids", v)} allLabel="All IDs" />
              <MultiSelect
                label="Employee IDs"
                options={employeeIdOptions}
                selected={filters.employeeIds}
                onChange={(v) => handleFilterChange("employeeIds", v)}
                allLabel="All Employee IDs"
              />
              <MultiSelect
                label="Names"
                options={nameOptions}
                selected={filters.names}
                onChange={(v) => handleFilterChange("names", v)}
                allLabel="All Names"
              />
              <MultiSelect
                label="Emails"
                options={emailOptions}
                selected={filters.emails}
                onChange={(v) => handleFilterChange("emails", v)}
                allLabel="All Emails"
                icon={Mail}
              />
              <MultiSelect
                label="Departments"
                options={departmentOptions}
                selected={filters.departments}
                onChange={(v) => handleFilterChange("departments", v)}
                allLabel="All Departments"
                icon={Building}
              />
              <MultiSelect
                label="Roles"
                options={roleOptions}
                selected={filters.roles}
                onChange={(v) => handleFilterChange("roles", v)}
                allLabel="All Roles"
                icon={UserCog}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* employees table card */}
      <Card className="border-2 shadow-md overflow-hidden dark:border-white/10 text-neutral-700 dark:text-neutral-400">
        <div className="h-1 w-full bg-orange-500" />
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-orange-500/5 dark:bg-orange-400/10">
              <Users className="h-5 w-5 text-orange-500" />
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
                  {columnVisibility.includes("id") && (
                    <TableHead className="text-center cursor-pointer" onClick={() => requestSort("id")}>
                      <div className="flex items-center justify-center">
                        ID
                        {sortConfig.key === "id" &&
                          (sortConfig.direction === "ascending" ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />)}
                      </div>
                    </TableHead>
                  )}
                  {columnVisibility.includes("employeeId") && (
                    <TableHead className="text-center cursor-pointer" onClick={() => requestSort("employeeId")}>
                      <div className="flex items-center justify-center">
                        Employee ID
                        {sortConfig.key === "employeeId" &&
                          (sortConfig.direction === "ascending" ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />)}
                      </div>
                    </TableHead>
                  )}
                  {columnVisibility.includes("name") && (
                    <TableHead className="text-center cursor-pointer" onClick={() => requestSort("name")}>
                      <div className="flex items-center justify-center">
                        Name
                        {sortConfig.key === "name" &&
                          (sortConfig.direction === "ascending" ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />)}
                      </div>
                    </TableHead>
                  )}
                  {columnVisibility.includes("email") && (
                    <TableHead className="text-center cursor-pointer" onClick={() => requestSort("email")}>
                      <div className="flex items-center justify-center">
                        Email
                        {sortConfig.key === "email" &&
                          (sortConfig.direction === "ascending" ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />)}
                      </div>
                    </TableHead>
                  )}
                  {columnVisibility.includes("role") && (
                    <TableHead className="text-center cursor-pointer" onClick={() => requestSort("role")}>
                      <div className="flex items-center justify-center">
                        Role
                        {sortConfig.key === "role" &&
                          (sortConfig.direction === "ascending" ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />)}
                      </div>
                    </TableHead>
                  )}
                  {columnVisibility.includes("department") && (
                    <TableHead className="text-center cursor-pointer" onClick={() => requestSort("department")}>
                      <div className="flex items-center justify-center">
                        Department
                        {sortConfig.key === "department" &&
                          (sortConfig.direction === "ascending" ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />)}
                      </div>
                    </TableHead>
                  )}
                  {columnVisibility.includes("hireDate") && (
                    <TableHead className="text-center cursor-pointer" onClick={() => requestSort("hireDate")}>
                      <div className="flex items-center justify-center">
                        Hire Date
                        {sortConfig.key === "hireDate" &&
                          (sortConfig.direction === "ascending" ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />)}
                      </div>
                    </TableHead>
                  )}
                  {columnVisibility.includes("createdAt") && <TableHead className="text-center">Created At</TableHead>}
                  {columnVisibility.includes("updatedAt") && <TableHead className="text-center">Updated At</TableHead>}
                  {columnVisibility.includes("actions") && <TableHead className="text-center">Actions</TableHead>}
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      {columnVisibility.map((c, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-6 w-full bg-neutral-200 dark:bg-neutral-700" />
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
                          className="border-b transition-colors hover:bg-muted/50 dark:hover:bg-neutral-800/50"
                        >
                          {columnVisibility.includes("id") && <TableCell className="text-nowrap text-center text-sm">{emp.id}</TableCell>}
                          {columnVisibility.includes("employeeId") && (
                            <TableCell className="text-nowrap text-center text-sm">{emp.employeeId || "—"}</TableCell>
                          )}
                          {columnVisibility.includes("name") && <TableCell className="text-nowrap text-center capitalize text-sm">{fullName}</TableCell>}
                          {columnVisibility.includes("email") && <TableCell className="text-nowrap text-center text-sm">{emp.email}</TableCell>}
                          {columnVisibility.includes("role") && (
                            <TableCell className="text-nowrap text-center capitalize">
                              <RoleBadge role={emp.role} />
                            </TableCell>
                          )}
                          {columnVisibility.includes("department") && (
                            <TableCell className="text-nowrap text-center capitalize">
                              {emp.department ? (
                                <Badge variant="outline">{emp.department.name}</Badge>
                              ) : (
                                <span className="text-sm text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          )}
                          {columnVisibility.includes("hireDate") && (
                            <TableCell className="text-nowrap text-center text-sm">{formatDateShort(emp.hireDate)}</TableCell>
                          )}
                          {columnVisibility.includes("createdAt") && (
                            <TableCell className="text-nowrap text-center text-sm">{formatDate(emp.createdAt)}</TableCell>
                          )}
                          {columnVisibility.includes("updatedAt") && (
                            <TableCell className="text-nowrap text-center text-sm">{formatDate(emp.updatedAt)}</TableCell>
                          )}
                          {columnVisibility.includes("actions") && (
                            <TableCell className="text-nowrap text-center capitalize">
                              <div className="flex justify-center gap-2">
                                <TooltipProvider delayDuration={300}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => openEdit(emp)}
                                        className="text-orange-500 hover:bg-orange-500/10 dark:text-orange-400 dark:hover:bg-orange-400/20"
                                      >
                                        <EditIcon className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Edit employee</TooltipContent>
                                  </Tooltip>

                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => openDelete(emp)}
                                        className="text-red-500 hover:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-400/20"
                                      >
                                        <TrashIcon className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Delete employee</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </TableCell>
                          )}
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                ) : (
                  <TableRow>
                    <TableCell colSpan={columnVisibility.length} className="h-24 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <div className="w-16 h-16 bg-neutral-200/5 dark:bg-neutral-700/10 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Users className="h-8 w-8 text-orange-500/50" />
                        </div>
                        <p className="text-sm">No employees match your filters.</p>
                        {(filters.ids.length > 1 ||
                          filters.employeeIds.length > 1 ||
                          filters.names.length > 1 ||
                          filters.emails.length > 1 ||
                          filters.departments.length > 1 ||
                          filters.roles.length > 1) && (
                          <Button variant="link" onClick={clearFilters} className="text-orange-600 hover:text-orange-700 dark:hover:text-orange-300 mt-2">
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

      {/* ───────── dialogs & CSV guide, unchanged logic ───────── */}
      {/* create dialog */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="border-2 dark:border-white/10 dark:bg-neutral-800/90">
          <div className="h-1 w-full bg-orange-500 -mt-4 mb-4" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-orange-200/25 text-orange-500 dark:bg-orange-400/20 dark:text-orange-400">
                <UserPlus className="h-5 w-5" />
              </div>
              Create New Employee
            </DialogTitle>
            <DialogDescription>Add a new employee</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="c-first-name">
                  First Name
                </label>
                <Input id="c-first-name" value={createForm.firstName} onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="c-last-name">
                  Last Name
                </label>
                <Input id="c-last-name" value={createForm.lastName} onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })} />
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
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="c-employee-id">
                Employee ID
              </label>
              <Input
                id="c-employee-id"
                value={createForm.employeeId}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    employeeId: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="c-hire-date">
                Hire Date
              </label>
              <Input
                id="c-hire-date"
                type="date"
                value={createForm.hireDate}
                onChange={(e) => setCreateForm({ ...createForm, hireDate: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
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
              <div className="space-y-1">
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
            <Button onClick={handleCreateEmployee} disabled={createLoading} className="bg-orange-500 text-white hover:bg-orange-600">
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* edit dialog */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-md border-2 shadow-md dark:border-neutral-800/30">
          <div className="h-1 w-full bg-orange-500 -mt-4 mb-4" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-orange-200/20 text-orange-500 dark:bg-orange-400/20 dark:text-orange-300">
                <EditIcon className="h-5 w-5" />
              </div>
              Edit Employee
            </DialogTitle>
            <DialogDescription>Update employee information</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="e-first-name">
                  First Name
                </label>
                <Input id="e-first-name" value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="e-last-name">
                  Last Name
                </label>
                <Input id="e-last-name" value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="e-email">
                Email
              </label>
              <Input id="e-email" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
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
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="e-employee-id">
                Employee ID
              </label>
              <Input id="e-employee-id" value={editForm.employeeId} onChange={(e) => setEditForm({ ...editForm, employeeId: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="e-hire-date">
                Hire Date
              </label>
              <Input id="e-hire-date" type="date" value={editForm.hireDate} onChange={(e) => setEditForm({ ...editForm, hireDate: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
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
              <div className="space-y-1">
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
            <Button onClick={handleSaveEdit} disabled={editLoading} className="bg-orange-600 hover:bg-orange-500 text-white">
              {editLoading ? "Updating…" : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* delete dialog */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="sm:max-w-md border-2 shadow-md border-red-400 dark:border-red-500/80">
          <div className="h-1 w-full bg-red-500 -mt-4 mb-4" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-red-200/20 text-red-500 dark:bg-red-400/20 dark:text-red-400">
                <AlertCircle className="h-5 w-5" />
              </div>
              Delete Employee
            </DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          {employeeToDelete && (
            <div className="bg-red-200/20 dark:bg-red-400/20 border-red-400 dark:border-red-500/10 rounded-md py-4 my-4">
              <p className="text-red-500 dark:text-red-400 text-sm">
                Delete{" "}
                <strong>
                  {employeeToDelete.profile?.firstName || ""} {employeeToDelete.profile?.lastName || ""}
                </strong>{" "}
                ({employeeToDelete.email || "—"})
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              className="text-red-500 hover:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-400/20"
            >
              Cancel
            </Button>
            <Button variant="destructive" disabled={deleteLoading} onClick={confirmDelete}>
              {deleteLoading ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV import summary dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-md border-2 dark:border-neutral-800/10 border-white">
          <div className="h-1 w-full bg-orange-500 -mt-4 mb-4" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UploadCloud className="h-5 w-5 text-orange-500 dark:text-orange-400" />
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
              <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                <div
                  className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${(importReport.processed / importReport.total) * 100}%`,
                  }}
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
                <Card className="mt-4">
                  <CardHeader className="pb-1">
                    <CardTitle className="text-red-500 font-medium text-sm">Failed Rows: ({importReport.failed.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="max-h-60">
                      <ul className="list-disc pl-5 space-y-1">
                        {importReport.failed.map((f, i) => (
                          <li key={i}>
                            Row {f.row}: {f.reason}
                          </li>
                        ))}
                      </ul>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowImportDialog(false)} disabled={importing} className="bg-orange-500 text-white hover:bg-orange-600">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV guide dialog */}
      <Dialog open={showInfoDialog} onOpenChange={setShowInfoDialog}>
        <DialogContent className="max-w-lg border-2 dark:border-neutral-800/10 dark:bg-neutral-800/10">
          <div className="h-1 w-full bg-orange-500 -mt-4 mb-4" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-orange-500 dark:text-orange-400" />
              CSV Format Guide
            </DialogTitle>
          </DialogHeader>
          <p className="mb-2 text-sm font-normal">
            Your CSV <code>.csv</code> file must include the <strong>exact</strong> headers below. <br />
            <em>departmentId</em>, <em>employeeId</em>, and <em>hireDate</em> are optional; leave blank if not used.
          </p>
          <pre className="bg-neutral-100 dark:bg-neutral-700/10 p-4 rounded-md text-sm font-mono overflow-x-auto">{CSV_TEMPLATE}</pre>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                const blob = new Blob([CSV_TEMPLATE], {
                  type: "text/csv;charset=utf-8;",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "employees_template.csv";
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800/20 dark:hover:bg-neutral-800/10"
            >
              Download Sample CSV
            </Button>
            <Button onClick={() => setShowInfoDialog(false)} className="bg-orange-500 text-white hover:bg-orange-600">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* hidden file input for CSV upload */}
      <input type="file" ref={fileRef} accept=".csv" onChange={onFile} className="hidden" />
    </div>
  );
}
