// components/Dashboard/DashboardContent/Settings/Admin/ManageEmployees.jsx
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useRef, useState, useMemo } from "react";
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
  FileText,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Papa from "papaparse";
import { toast, Toaster } from "sonner";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import useAuthStore from "@/store/useAuthStore";
import IconBtn from "@/components/common/IconBtn";
import ColumnSelector from "@/components/common/ColumnSelector";
import MultiSelect from "@/components/common/MultiSelect";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { fmtMMDDYYYY, fmtMMDDYYYY_hhmma } from "@/lib/dateTimeFormatter";

const val = (v) => (v?.trim() ? v.trim() : undefined);

const headerMap = {
  id: "ID",
  employeeId: "Employee ID",
  name: "Name",
  email: "Email",
  role: "Role",
  department: "Department",
  hireDate: "Hire Date",
  jobTitle: "Job Title",
  employmentStatus: "Employment Status",
  exemptStatus: "Exempt Status",
  employmentType: "Employment Type",
  workLocation: "Work Location",
  probationEndDate: "Probation End Date",
  timeZone: "Time Zone",
  supervisor: "Supervisor Email",
  createdAt: "Created At",
  updatedAt: "Updated At",
};

const fmt = (d) =>
  d
    ? new Date(d).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
const fmtShort = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

const CSV_TEMPLATE = `firstName,lastName,email,password,role,departmentId,employeeId,hireDate,jobTitle,employmentStatus,exemptStatus,employmentType,workLocation,probationEndDate,timeZone
John,Doe,john.doe@example.com,Pa55word!,employee,,EMP001,2025-06-19,Engineer,full_time,exempt,employee_W2,onsite,2025-12-19,America/Los_Angeles
Jane,Smith,jane.smith@example.com,S3cret12,supervisor,dep123,EMP002,2025-06-20,Designer,part_time,non_exempt,contractor_1099,remote,,Asia/Manila
`;

export default function Employees() {
  const { token, user } = useAuthStore();
  const API = process.env.NEXT_PUBLIC_API_URL;

  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [pdfExporting, setPdfExporting] = useState(false);

  const fileRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [importReport, setImportReport] = useState({ total: 0, success: 0, failed: [], processed: 0 });
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showInfoDialog, setShowInfoDialog] = useState(false);

  const blankEmployment = {
    jobTitle: "",
    employmentStatus: "none",
    exemptStatus: "none",
    employmentType: "none",
    workLocation: "none",
    probationEndDate: "",
    timeZone: "",
  };

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
    ...blankEmployment,
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
    ...blankEmployment,
  });
  const [editLoading, setEditLoading] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [sortConfig, setSort] = useState({ key: "updatedAt", direction: "descending" });
  const requestSort = (k) =>
    setSort((p) => ({
      key: k,
      direction: p.key === k && p.direction === "ascending" ? "descending" : "ascending",
    }));

  const [filters, setFilters] = useState({
    ids: ["all"],
    employeeIds: ["all"],
    names: ["all"],
    emails: ["all"],
    departments: ["all"],
    roles: ["all"],
  });

  const columnOptions = [
    { value: "id", label: "ID" },
    { value: "employeeId", label: "Employee ID" },
    { value: "name", label: "Name" },
    { value: "email", label: "Email" },
    { value: "role", label: "Role" },
    { value: "department", label: "Department" },
    { value: "hireDate", label: "Hire Date" },
    { value: "jobTitle", label: "Job Title" },
    { value: "employmentStatus", label: "Employment Status" },
    { value: "exemptStatus", label: "Exempt Status" },
    { value: "employmentType", label: "Employment Type" },
    { value: "workLocation", label: "Work Location" },
    { value: "probationEndDate", label: "Probation End Date" },
    { value: "timeZone", label: "Time Zone" },
    { value: "supervisor", label: "Supervisor Email" },
    { value: "createdAt", label: "Created At" },
    { value: "updatedAt", label: "Updated At" },
    { value: "actions", label: "Actions" },
  ];
  const [visibleCols, setVisibleCols] = useState(columnOptions.map((o) => o.value));

  useEffect(() => {
    if (!token) return;
    fetchEmployees();
    fetchDepartments();
  }, [token]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/employee`, { headers: { Authorization: `Bearer ${token}` } });
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
      const r = await fetch(`${API}/api/departments`, { headers: { Authorization: `Bearer ${token}` } });
      const j = await r.json();
      if (r.ok) setDepartments(j.data || []);
    } catch {}
  };
  const refreshData = async () => {
    setRefreshing(true);
    await Promise.all([fetchEmployees(), fetchDepartments()]);
    toast.message("Data refreshed");
    setRefreshing(false);
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

  const saveEmploymentDetail = async (userId, form) => {
    const p = buildEmploymentPayload(form);
    if (!p) return;
    await fetch(`${API}/api/employment-details/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(p),
    });
  };

  const idOpts = employees.map((e) => ({ value: e.id, label: e.id }));
  const empIdOpts = [
    { value: "none", label: "—" },
    ...employees.filter((e) => e.employeeId).map((e) => ({ value: e.employeeId, label: e.employeeId })),
  ];
  const nameOpts = employees.map((e) => ({
    value: `${e.profile?.firstName || ""} ${e.profile?.lastName || ""}`.trim().toLowerCase(),
    label: `${e.profile?.firstName || ""} ${e.profile?.lastName || ""}`.trim(),
  }));
  const emailOpts = employees.map((e) => ({ value: e.email.toLowerCase(), label: e.email }));
  const deptOpts = [{ value: "none", label: "No Department" }, ...departments.map((d) => ({ value: d.id, label: d.name }))];
  const roleOpts = ["employee", "supervisor", "admin"].map((r) => ({ value: r, label: r.charAt(0).toUpperCase() + r.slice(1) }));

  const changeFilter = (k, v) =>
    setFilters((p) => {
      const n = { ...p };
      if (v === "all") n[k] = ["all"];
      else {
        let arr = p[k].filter((x) => x !== "all");
        arr = arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
        if (!arr.length) arr = ["all"];
        n[k] = arr;
      }
      return n;
    });
  const clearFilters = () =>
    setFilters({ ids: ["all"], employeeIds: ["all"], names: ["all"], emails: ["all"], departments: ["all"], roles: ["all"] });

  const list = useMemo(() => {
    const filtered = employees.filter((e) => {
      if (user?.id && e.id === user.id) return false;
      const name = `${e.profile?.firstName || ""} ${e.profile?.lastName || ""}`.trim().toLowerCase();
      return (
        (filters.ids.includes("all") || filters.ids.includes(e.id)) &&
        (filters.employeeIds.includes("all") || filters.employeeIds.includes(e.employeeId || "none")) &&
        (filters.names.includes("all") || filters.names.includes(name)) &&
        (filters.emails.includes("all") || filters.emails.includes(e.email.toLowerCase())) &&
        (filters.departments.includes("all") || filters.departments.includes(e.department?.id || "none")) &&
        (filters.roles.includes("all") || filters.roles.includes(e.role.toLowerCase()))
      );
    });

    if (!sortConfig.key) return filtered;

    const getVal = (emp, key) => {
      const d = emp.employmentDetail ?? {};
      switch (key) {
        case "id":
          return emp.id;
        case "employeeId":
          return (emp.employeeId || "").toLowerCase();
        case "name":
          return `${emp.profile?.firstName || ""} ${emp.profile?.lastName || ""}`.trim().toLowerCase();
        case "email":
          return emp.email.toLowerCase();
        case "role":
          return emp.role.toLowerCase();
        case "department":
          return (emp.department?.name || "").toLowerCase();
        case "hireDate":
          return emp.hireDate ? new Date(emp.hireDate).getTime() : 0;
        case "createdAt":
        case "updatedAt":
          return new Date(emp[key]).getTime();
        case "jobTitle":
          return (d.jobTitle || "").toLowerCase();
        case "employmentStatus":
          return d.employmentStatus || "";
        case "exemptStatus":
          return d.exemptStatus || "";
        case "employmentType":
          return d.employmentType || "";
        case "workLocation":
          return d.workLocation || "";
        case "probationEndDate":
          return d.probationEndDate ? new Date(d.probationEndDate).getTime() : 0;
        case "timeZone":
          return d.timeZone || "";
        case "supervisor":
          return (d.supervisor?.email || "").toLowerCase();
        default:
          return "";
      }
    };

    return [...filtered].sort((a, b) => {
      const aVal = getVal(a, sortConfig.key);
      const bVal = getVal(b, sortConfig.key);
      if (aVal < bVal) return sortConfig.direction === "ascending" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "ascending" ? 1 : -1;
      return 0;
    });
  }, [employees, filters, sortConfig, user]);

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
      ...blankEmployment,
    });
    setShowCreateModal(true);
  };

  const buildEmploymentPayload = (f) => {
    const p = {};
    if (val(f.jobTitle)) p.jobTitle = val(f.jobTitle);
    if (f.employmentStatus !== "none") p.employmentStatus = f.employmentStatus;
    if (f.exemptStatus !== "none") p.exemptStatus = f.exemptStatus;
    if (f.employmentType !== "none") p.employmentType = f.employmentType;
    if (f.workLocation !== "none") p.workLocation = f.workLocation;
    if (val(f.probationEndDate)) p.probationEndDate = f.probationEndDate;
    if (val(f.timeZone)) p.timeZone = f.timeZone;
    return Object.keys(p).length ? p : null;
  };

  const handleCreateEmployee = async () => {
    if (!createForm.firstName.trim()) return toast.error("First name required");
    if (!createForm.lastName.trim()) return toast.error("Last name required");
    if (!createForm.email.trim()) return toast.error("Email required");
    if (!createForm.password.trim()) return toast.error("Password required");

    setCreateLoading(true);
    try {
      const userPayload = {
        username: `${createForm.firstName}.${createForm.lastName}`.toLowerCase().replace(/\s+/g, ""),
        email: createForm.email.trim().toLowerCase(),
        password: createForm.password,
        firstName: createForm.firstName.trim(),
        lastName: createForm.lastName.trim(),
        role: createForm.role,
        employeeId: val(createForm.employeeId) || null,
        hireDate: createForm.hireDate || null,
        ...(createForm.departmentId !== "none" && { departmentId: createForm.departmentId }),
      };

      const res = await fetch(`${API}/api/employee`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(userPayload),
      });
      const json = await res.json();
      if (!res.ok) return toast.error(json.error || "Failed to create employee");

      await saveEmploymentDetail(json.data.id, createForm);

      toast.success("Employee created");
      setShowCreateModal(false);
      fetchEmployees();
    } catch {
      toast.error("Failed to create employee");
    } finally {
      setCreateLoading(false);
    }
  };

  const openEdit = (e) => {
    const d = e.employmentDetail ?? {};
    setEditForm({
      id: e.id,
      firstName: e.profile?.firstName || "",
      lastName: e.profile?.lastName || "",
      email: e.email,
      password: "",
      role: e.role === "superadmin" ? "admin" : e.role,
      departmentId: e.department?.id || "none",
      employeeId: e.employeeId || "",
      hireDate: e.hireDate ? e.hireDate.split("T")[0] : "",
      jobTitle: d.jobTitle || "",
      employmentStatus: d.employmentStatus || "none",
      exemptStatus: d.exemptStatus || "none",
      employmentType: d.employmentType || "none",
      workLocation: d.workLocation || "none",
      probationEndDate: d.probationEndDate ? d.probationEndDate.split("T")[0] : "",
      timeZone: d.timeZone || "",
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editForm.firstName.trim()) return toast.error("First name required");
    if (!editForm.lastName.trim()) return toast.error("Last name required");
    if (!editForm.email.trim()) return toast.error("Email required");

    setEditLoading(true);
    try {
      const userPayload = {
        email: editForm.email.trim().toLowerCase(),
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        role: editForm.role,
        employeeId: val(editForm.employeeId) || null,
        hireDate: editForm.hireDate || null,
        ...(editForm.password && { password: editForm.password }),
        ...(editForm.departmentId !== "none" && { departmentId: editForm.departmentId }),
      };

      const res = await fetch(`${API}/api/employee/${editForm.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(userPayload),
      });
      const json = await res.json();
      if (!res.ok) return toast.error(json.error || "Failed to update employee");

      await saveEmploymentDetail(editForm.id, editForm);

      toast.success("Employee updated");
      setShowEditModal(false);
      fetchEmployees();
    } catch {
      toast.error("Failed to update employee");
    } finally {
      setEditLoading(false);
    }
  };

  const openDelete = (e) => {
    setEmployeeToDelete(e);
    setShowDeleteModal(true);
  };
  const confirmDelete = async () => {
    if (!employeeToDelete) return;
    setDeleteLoading(true);
    try {
      const r = await fetch(`${API}/api/employee/${employeeToDelete.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await r.json();
      if (r.ok) {
        toast.success("Employee deleted");
        setEmployees((p) => p.filter((x) => x.id !== employeeToDelete.id));
      } else toast.error(j.error || "Failed to delete employee");
    } catch {
      toast.error("Failed to delete employee");
    }
    setDeleteLoading(false);
    setShowDeleteModal(false);
  };

  const openFile = () => fileRef.current?.click();
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
        importRows(data);
      },
      error: () => toast.error("CSV read error"),
    });
  };

  const importRows = async (rows) => {
    setImporting(true);
    const sum = { total: rows.length, success: 0, failed: [], processed: 0 };
    setImportReport(sum);

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.firstName || !r.lastName || !r.email || !r.password || !r.role) {
        sum.failed.push({ row: i + 1, reason: "Required column empty" });
        sum.processed = i + 1;
        setImportReport({ ...sum });
        continue;
      }
      const payload = {
        username: `${r.firstName}.${r.lastName}`.toLowerCase().replace(/\s+/g, ""),
        email: r.email.trim().toLowerCase(),
        password: r.password,
        firstName: r.firstName.trim(),
        lastName: r.lastName.trim(),
        role: r.role.toLowerCase() === "superadmin" ? "admin" : r.role.toLowerCase(),
        employeeId: val(r.employeeId) || null,
        hireDate: r.hireDate || null,
      };
      if (val(r.departmentId)) payload.departmentId = r.departmentId.trim();

      const empDet = buildEmploymentPayload({
        jobTitle: r.jobTitle || "",
        employmentStatus: r.employmentStatus || "none",
        exemptStatus: r.exemptStatus || "none",
        employmentType: r.employmentType || "none",
        workLocation: r.workLocation || "none",
        probationEndDate: r.probationEndDate || "",
        timeZone: r.timeZone || "",
      });
      if (empDet) payload.employmentDetail = empDet;

      try {
        const res = await fetch(`${API}/api/employee`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
        const j = await res.json();
        if (res.ok) sum.success += 1;
        else sum.failed.push({ row: i + 1, reason: j.error || "API error" });
      } catch {
        sum.failed.push({ row: i + 1, reason: "Network error" });
      }
      sum.processed = i + 1;
      setImportReport({ ...sum });
    }
    setImporting(false);
    fetchEmployees();
  };

  const buildCSV = () => {
    const head = visibleCols.filter((c) => c !== "actions").map((c) => `"${headerMap[c]}"`);
    const body = list.map((e) => {
      const d = e.employmentDetail ?? {};
      const sup = d.supervisor?.email || "";
      const rowMap = {
        id: e.id,
        employeeId: e.employeeId || "",
        name: `${e.profile?.firstName || ""} ${e.profile?.lastName || ""}`.trim(),
        email: e.email,
        role: e.role,
        department: e.department?.name || "",
        hireDate: e.hireDate ? e.hireDate.split("T")[0] : "",
        jobTitle: d.jobTitle || "",
        employmentStatus: d.employmentStatus || "",
        exemptStatus: d.exemptStatus || "",
        employmentType: d.employmentType || "",
        workLocation: d.workLocation || "",
        probationEndDate: d.probationEndDate ? d.probationEndDate.split("T")[0] : "",
        timeZone: d.timeZone || "",
        supervisor: sup,
        createdAt: fmt(e.createdAt),
        updatedAt: fmt(e.updatedAt),
      };
      return visibleCols
        .filter((k) => k !== "actions")
        .map((k) => `"${rowMap[k] ?? ""}"`)
        .join(",");
    });
    return [head, ...body].join("\r\n");
  };

  const exportCSV = () => {
    if (!list.length) return toast.message("No data to export");
    setExporting(true);
    const d = new Date();
    const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    const blob = new Blob([buildCSV()], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Employees_${stamp}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.message("CSV exported");
    setExporting(false);
  };

  const exportPDF = () => {
    if (!list.length) {
      toast.message("No data to export");
      return;
    }
    setPdfExporting(true);
    const cols = columnOptions.filter((c) => c.value !== "actions" && visibleCols.includes(c.value));
    const tableHead = [cols.map((c) => c.label)];
    const tableBody = list.map((e) => {
      const d = e.employmentDetail ?? {};
      const sup = d.supervisor?.email || "";
      const rowMap = {
        id: e.id,
        employeeId: e.employeeId || "",
        name: `${e.profile?.firstName || ""} ${e.profile?.lastName || ""}`.trim(),
        email: e.email,
        role: e.role,
        department: e.department?.name || "",
        hireDate: e.hireDate ? e.hireDate.split("T")[0] : "",
        jobTitle: d.jobTitle || "",
        employmentStatus: d.employmentStatus || "",
        exemptStatus: d.exemptStatus || "",
        employmentType: d.employmentType || "",
        workLocation: d.workLocation || "",
        probationEndDate: d.probationEndDate ? d.probationEndDate.split("T")[0] : "",
        timeZone: d.timeZone || "",
        supervisor: sup,
        createdAt: fmt(e.createdAt),
        updatedAt: fmt(e.updatedAt),
      };
      return cols.map((c) => rowMap[c.value]);
    });
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    doc.setFontSize(12);
    doc.text("Employees", 14, 18);
    autoTable(doc, {
      head: tableHead,
      body: tableBody,
      startY: 24,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [255, 165, 0] },
    });
    const stamp = new Date().toISOString().slice(0, 10);
    doc.save(`Employees_${stamp}.pdf`);
    toast.message("PDF exported");
    setPdfExporting(false);
  };

  return (
    <div className="max-w-full mx-auto p-4 lg:px-10 space-y-8">
      <Toaster />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-7 w-7 text-orange-500" />
            Company Employees
          </h2>
        </div>
        <div className="flex gap-2">
          <IconBtn icon={RefreshCw} tooltip="Refresh table" spinning={refreshing} onClick={refreshData} />
          <IconBtn icon={Download} tooltip="Export CSV" spinning={exporting} onClick={exportCSV} disabled={!list.length} />
          <IconBtn icon={FileText} tooltip="Export PDF" spinning={pdfExporting} onClick={exportPDF} disabled={!list.length} />
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={openFile}>
                  <UploadCloud className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Upload CSV</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={() => setShowInfoDialog(true)}>
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

      <Card className="border-2 shadow-md">
        <div className="h-1 w-full bg-orange-500" />
        <CardHeader className="pb-2 relative">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-orange-500/10 text-orange-500">
              <Filter className="h-5 w-5" />
            </div>
            Table Controls
          </CardTitle>
          <span className="absolute top-2 right-4 text-sm text-muted-foreground">
            {list.length} of {employees.length}
          </span>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <span className="my-auto shrink-0 text-sm font-medium text-muted-foreground">Column:</span>
              <ColumnSelector options={columnOptions} visible={visibleCols} setVisible={setVisibleCols} />
            </div>
            <div className="flex flex-wrap gap-3">
              <span className="my-auto shrink-0 text-sm font-medium text-muted-foreground">Filter:</span>
              <MultiSelect
                options={idOpts}
                selected={filters.ids}
                onChange={(v) => changeFilter("ids", v)}
                allLabel="All IDs"
                width={160}
              />
              <MultiSelect
                options={empIdOpts}
                selected={filters.employeeIds}
                onChange={(v) => changeFilter("employeeIds", v)}
                allLabel="All Employee IDs"
                width={180}
              />
              <MultiSelect
                options={nameOpts}
                selected={filters.names}
                onChange={(v) => changeFilter("names", v)}
                allLabel="All Names"
                width={180}
              />
              <MultiSelect
                options={emailOpts}
                selected={filters.emails}
                onChange={(v) => changeFilter("emails", v)}
                allLabel="All Emails"
                icon={Mail}
                width={220}
              />
              <MultiSelect
                options={deptOpts}
                selected={filters.departments}
                onChange={(v) => changeFilter("departments", v)}
                allLabel="All Departments"
                icon={Building}
                width={200}
              />
              <MultiSelect
                options={roleOpts}
                selected={filters.roles}
                onChange={(v) => changeFilter("roles", v)}
                allLabel="All Roles"
                icon={UserCog}
                width={150}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 shadow-md overflow-hidden dark:border-white/10">
        <div className="h-1 w-full bg-orange-500" />
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-orange-500/10 text-orange-500">
              <Building className="h-5 w-5" />
            </div>
            Main Table
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {columnOptions
                    .filter((o) => o.value !== "actions" && visibleCols.includes(o.value))
                    .map(({ value, label }) => (
                      <TableHead key={value} className="text-center cursor-pointer" onClick={() => requestSort(value)}>
                        <div className="flex items-center justify-center">
                          {label}
                          {sortConfig.key === value &&
                            (sortConfig.direction === "ascending" ? (
                              <ChevronUp className="h-4 w-4 ml-1" />
                            ) : (
                              <ChevronDown className="h-4 w-4 ml-1" />
                            ))}
                        </div>
                      </TableHead>
                    ))}
                  {visibleCols.includes("actions") && <TableHead className="text-center">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      {visibleCols.map((c) => (
                        <TableCell key={c}>
                          <Skeleton className="h-6 w-full bg-neutral-200" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : list.length ? (
                  <AnimatePresence>
                    {list.map((e) => {
                      const d = e.employmentDetail ?? {};
                      const name = `${e.profile?.firstName || ""} ${e.profile?.lastName || ""}`.trim();
                      return (
                        <motion.tr
                          key={e.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border-b hover:bg-muted/50"
                        >
                          {visibleCols.includes("id") && (
                            <TableCell className="text-center text-sm text-nowrap">{e.id}</TableCell>
                          )}
                          {visibleCols.includes("employeeId") && (
                            <TableCell className="text-center text-sm text-nowrap">{e.employeeId || "—"}</TableCell>
                          )}
                          {visibleCols.includes("name") && (
                            <TableCell className="text-center capitalize text-sm text-nowrap">{name}</TableCell>
                          )}
                          {visibleCols.includes("email") && (
                            <TableCell className="text-center text-sm text-nowrap ">{e.email}</TableCell>
                          )}
                          {visibleCols.includes("role") && (
                            <TableCell className="text-center">
                              <RoleBadge role={e.role} />
                            </TableCell>
                          )}
                          {visibleCols.includes("department") && (
                            <TableCell className="text-center capitalize">
                              {e.department ? (
                                <Badge variant="outline">{e.department.name}</Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          )}
                          {visibleCols.includes("hireDate") && (
                            <TableCell className="text-center text-sm text-nowrap">{fmtMMDDYYYY(e.hireDate)}</TableCell>
                          )}
                          {visibleCols.includes("jobTitle") && (
                            <TableCell className="text-center text-sm text-nowrap">{d.jobTitle || "—"}</TableCell>
                          )}
                          {visibleCols.includes("employmentStatus") && (
                            <TableCell className="text-center text-sm capitalize">{d.employmentStatus || "—"}</TableCell>
                          )}
                          {visibleCols.includes("exemptStatus") && (
                            <TableCell className="text-center text-sm capitalize">{d.exemptStatus || "—"}</TableCell>
                          )}
                          {visibleCols.includes("employmentType") && (
                            <TableCell className="text-center text-sm capitalize">{d.employmentType || "—"}</TableCell>
                          )}
                          {visibleCols.includes("workLocation") && (
                            <TableCell className="text-center text-sm capitalize">{d.workLocation || "—"}</TableCell>
                          )}
                          {visibleCols.includes("probationEndDate") && (
                            <TableCell className="text-center text-sm">
                              {d.probationEndDate ? fmtMMDDYYYY(d.probationEndDate.split("T")[0]) : "—"}
                            </TableCell>
                          )}
                          {visibleCols.includes("timeZone") && (
                            <TableCell className="text-center text-sm">{d.timeZone || "—"}</TableCell>
                          )}
                          {visibleCols.includes("supervisor") && (
                            <TableCell className="text-center text-sm">{d.supervisor?.email || "—"}</TableCell>
                          )}
                          {visibleCols.includes("createdAt") && (
                            <TableCell className="text-center text-sm text-nowrap">{fmtMMDDYYYY_hhmma(e.createdAt)}</TableCell>
                          )}
                          {visibleCols.includes("updatedAt") && (
                            <TableCell className="text-center text-sm text-nowrap">{fmtMMDDYYYY_hhmma(e.updatedAt)}</TableCell>
                          )}
                          {visibleCols.includes("actions") && (
                            <TableCell className="text-center">
                              <div className="flex justify-center gap-2">
                                <TooltipProvider delayDuration={300}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => openEdit(e)}
                                        className="text-orange-500 hover:bg-orange-500/10"
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
                                        onClick={() => openDelete(e)}
                                        className="text-red-500 hover:bg-red-500/10"
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
                    <TableCell colSpan={visibleCols.length} className="h-24 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <div className="w-16 h-16 bg-neutral-200/5 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Users className="h-8 w-8 text-orange-500/50" />
                        </div>
                        <p className="text-sm">No employees match your filters.</p>
                        {(filters.ids.length > 1 ||
                          filters.employeeIds.length > 1 ||
                          filters.names.length > 1 ||
                          filters.emails.length > 1 ||
                          filters.departments.length > 1 ||
                          filters.roles.length > 1) && (
                          <Button variant="link" onClick={clearFilters} className="text-orange-600 hover:text-orange-700 mt-2">
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

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="border-2">
          <div className="h-1 w-full bg-orange-500 -mt-4 mb-4" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-orange-200/25 text-orange-500">
                <UserPlus className="h-5 w-5" />
              </div>
              Create New Employee
            </DialogTitle>
            <DialogDescription>Add a new employee</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">First Name</label>
                <Input
                  value={createForm.firstName}
                  onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Last Name</label>
                <Input value={createForm.lastName} onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Employee ID</label>
              <Input
                value={createForm.employeeId}
                onChange={(e) => setCreateForm({ ...createForm, employeeId: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Hire Date</label>
              <Input
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
            <div className="space-y-2">
              <label className="text-sm font-medium">Job Title</label>
              <Input value={createForm.jobTitle} onChange={(e) => setCreateForm({ ...createForm, jobTitle: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Employment Status</label>
                <Select
                  value={createForm.employmentStatus}
                  onValueChange={(v) => setCreateForm({ ...createForm, employmentStatus: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="full_time">Full-time</SelectItem>
                    <SelectItem value="part_time">Part-time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Exempt Status</label>
                <Select value={createForm.exemptStatus} onValueChange={(v) => setCreateForm({ ...createForm, exemptStatus: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="exempt">Exempt</SelectItem>
                    <SelectItem value="non_exempt">Non-exempt</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Employment Type</label>
                <Select
                  value={createForm.employmentType}
                  onValueChange={(v) => setCreateForm({ ...createForm, employmentType: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="employee_W2">W-2 Employee</SelectItem>
                    <SelectItem value="contractor_1099">1099 Contractor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Work Location</label>
                <Select value={createForm.workLocation} onValueChange={(v) => setCreateForm({ ...createForm, workLocation: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="onsite">On-site</SelectItem>
                    <SelectItem value="remote">Remote</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Probation End Date</label>
              <Input
                type="date"
                value={createForm.probationEndDate}
                onChange={(e) => setCreateForm({ ...createForm, probationEndDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Time Zone</label>
              <Input
                value={createForm.timeZone}
                onChange={(e) => setCreateForm({ ...createForm, timeZone: e.target.value })}
                placeholder="e.g. America/New_York"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateEmployee} disabled={createLoading} className="bg-orange-500 text-white">
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="border-2 max-w-md">
          <div className="h-1 w-full bg-orange-500 -mt-4 mb-4" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-orange-200/20 text-orange-500">
                <EditIcon className="h-5 w-5" />
              </div>
              Edit Employee
            </DialogTitle>
            <DialogDescription>Update employee information</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">First Name</label>
                <Input value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Last Name</label>
                <Input value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">New Password</label>
              <Input
                type="password"
                value={editForm.password}
                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                placeholder="Leave blank to keep existing"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Employee ID</label>
              <Input value={editForm.employeeId} onChange={(e) => setEditForm({ ...editForm, employeeId: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Hire Date</label>
              <Input
                type="date"
                value={editForm.hireDate}
                onChange={(e) => setEditForm({ ...editForm, hireDate: e.target.value })}
              />
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
            <div className="space-y-2">
              <label className="text-sm font-medium">Job Title</label>
              <Input value={editForm.jobTitle} onChange={(e) => setEditForm({ ...editForm, jobTitle: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Employment Status</label>
                <Select
                  value={editForm.employmentStatus}
                  onValueChange={(v) => setEditForm({ ...editForm, employmentStatus: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="full_time">Full-time</SelectItem>
                    <SelectItem value="part_time">Part-time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Exempt Status</label>
                <Select value={editForm.exemptStatus} onValueChange={(v) => setEditForm({ ...editForm, exemptStatus: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="exempt">Exempt</SelectItem>
                    <SelectItem value="non_exempt">Non-exempt</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Employment Type</label>
                <Select value={editForm.employmentType} onValueChange={(v) => setEditForm({ ...editForm, employmentType: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="employee_W2">W-2 Employee</SelectItem>
                    <SelectItem value="contractor_1099">1099 Contractor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Work Location</label>
                <Select value={editForm.workLocation} onValueChange={(v) => setEditForm({ ...editForm, workLocation: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="onsite">On-site</SelectItem>
                    <SelectItem value="remote">Remote</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Probation End Date</label>
              <Input
                type="date"
                value={editForm.probationEndDate}
                onChange={(e) => setEditForm({ ...editForm, probationEndDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Time Zone</label>
              <Input
                value={editForm.timeZone}
                onChange={(e) => setEditForm({ ...editForm, timeZone: e.target.value })}
                placeholder="e.g. America/New_York"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={editLoading} className="bg-orange-600 text-white">
              {editLoading ? "Updating…" : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="sm:max-w-md border-2 border-red-400">
          <div className="h-1 w-full bg-red-500 -mt-4 mb-4" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-red-200/20 text-red-500">
                <AlertCircle className="h-5 w-5" />
              </div>
              Delete Employee
            </DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          {employeeToDelete && (
            <div className="bg-red-200/20 rounded-md py-4 my-4">
              <p className="text-red-500 text-sm">
                Delete{" "}
                <strong>
                  {employeeToDelete.profile?.firstName || ""} {employeeToDelete.profile?.lastName || ""}
                </strong>{" "}
                ({employeeToDelete.email})
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)} className="text-red-500 hover:bg-red-500/10">
              Cancel
            </Button>
            <Button variant="destructive" disabled={deleteLoading} onClick={confirmDelete}>
              {deleteLoading ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-md border-2">
          <div className="h-1 w-full bg-orange-500 -mt-4 mb-4" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UploadCloud className="h-5 w-5 text-orange-500" />
              CSV Import Summary
            </DialogTitle>
          </DialogHeader>
          {importing ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-1 text-sm font-medium">
                <span>
                  Processing: {importReport.processed} / {importReport.total}
                </span>
                <span>{Math.round((importReport.processed / importReport.total) * 100)}%</span>
              </div>
              <div className="w-full bg-neutral-200 rounded-full h-2">
                <div
                  className="bg-orange-500 h-2 rounded-full transition-all"
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
                Processed <strong>{importReport.total}</strong> rows. Successfully created <strong>{importReport.success}</strong>
                .
              </p>
              {importReport.failed.length > 0 && (
                <Card className="mt-4">
                  <CardHeader className="pb-1">
                    <CardTitle className="text-red-500 text-sm">Failed Rows: {importReport.failed.length}</CardTitle>
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
            <Button onClick={() => setShowImportDialog(false)} disabled={importing} className="bg-orange-500 text-white">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showInfoDialog} onOpenChange={setShowInfoDialog}>
        <DialogContent className="max-w-lg border-2">
          <div className="h-1 w-full bg-orange-500 -mt-4 mb-4" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-orange-500" />
              CSV Format Guide
            </DialogTitle>
          </DialogHeader>
          <p className="mb-2 text-sm">
            Your CSV file must include the exact headers below. <em>departmentId</em>, <em>employeeId</em>, <em>hireDate</em>, and
            all employment-detail columns are optional.
          </p>
          <pre className="bg-neutral-100 p-4 rounded-md text-sm font-mono overflow-x-auto">{CSV_TEMPLATE}</pre>
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
              Download Sample CSV
            </Button>
            <Button onClick={() => setShowInfoDialog(false)} className="bg-orange-500 text-white">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <input type="file" ref={fileRef} accept=".csv" onChange={onFile} className="hidden" />
    </div>
  );
}
