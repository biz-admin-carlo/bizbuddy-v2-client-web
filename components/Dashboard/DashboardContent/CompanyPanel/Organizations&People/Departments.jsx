// components/Dashboard/DashboardContent/CompanyPanel/Organizations&People/Departments.jsx
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState, useMemo } from "react";
import { Trash2, Edit3, Building, Users, AlertCircle, Download, RefreshCw, Filter, FileText, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast, Toaster } from "sonner";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import useAuthStore from "@/store/useAuthStore";
import IconBtn from "@/components/common/IconBtn";
import ColumnSelector from "@/components/common/ColumnSelector";
import MultiSelect from "@/components/common/MultiSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fmtMMDDYYYY_hhmma } from "@/lib/dateTimeFormatter";

export default function Departments() {
  const { token } = useAuthStore();
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const [profileData, setProfileData] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const supervisors = allUsers.filter((u) => u.role && u.role.toLowerCase() === "supervisor");
  const [userCounts, setUserCounts] = useState({});
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [pdfExporting, setPdfExporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createDeptForm, setCreateDeptForm] = useState({ name: "", supervisorId: "" });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editDeptForm, setEditDeptForm] = useState({ id: "", name: "", supervisorId: "" });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState(null);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [usersDeptName, setUsersDeptName] = useState("");
  const [supervisorUser, setSupervisorUser] = useState(null);
  const [deptMembers, setDeptMembers] = useState([]);
  const [sortConfig] = useState({ key: "id", direction: "ascending" });
  const [filters, setFilters] = useState({
    deptIds: ["all"],
    supervisorIds: ["all"],
  });
  const toggleListFilter = (key, val) =>
    setFilters((prev) => {
      if (val === "all") return { ...prev, [key]: ["all"] };
      let list = prev[key].filter((x) => x !== "all");
      list = list.includes(val) ? list.filter((x) => x !== val) : [...list, val];
      if (!list.length) list = ["all"];
      return { ...prev, [key]: list };
    });

  const clearAllFilters = () => setFilters({ deptIds: ["all"], supervisorIds: ["all"] });

  const columnOptions = [
    { value: "id", label: "Department ID" },
    { value: "name", label: "Department Name" },
    { value: "supervisor", label: "Supervisor" },
    { value: "userCount", label: "User Count" },
    { value: "createdAt", label: "Created At" },
    { value: "updatedAt", label: "Updated At" },
  ];
  const [columnVisibility, setColumnVisibility] = useState(columnOptions.map((o) => o.value));

  const labelClass = "my-auto shrink-0 text-sm font-medium text-muted-foreground";

  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/api/account/profile`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((j) => {
        if (j?.data?.company?.id) setProfileData(j.data);
        else toast.message("User profile or company not found.");
      })
      .catch(() => toast.message("Failed to fetch profile."));
  }, [token, API_URL]);

  useEffect(() => {
    if (token && profileData?.company?.id) refreshData();
  }, [token, profileData]);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/departments`, { headers: { Authorization: `Bearer ${token}` } });
      const j = await res.json();
      if (j?.data) setDepartments(j.data);
      else toast.message(j.error || "Failed to fetch departments.");
    } catch {
      toast.message("Failed to fetch departments.");
    }
    setLoading(false);
  };

  const fetchAllUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/api/employee?all=1`, { headers: { Authorization: `Bearer ${token}` } });
      const j = await res.json();
      if (j?.data) setAllUsers(j.data);
      else toast.message("Failed to fetch users.");
    } catch {
      toast.message("Failed to fetch users.");
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await Promise.all([fetchDepartments(), fetchAllUsers()]);
    toast.message("Table refreshed");
    setRefreshing(false);
  };

  useEffect(() => {
    if (!departments.length) return;
    const map = {};
    departments.forEach((d) => {
      const members = allUsers.filter((u) => u.department && u.department.id === d.id);
      let supExtra = 0;
      if (d.supervisor) {
        const supInMembers = members.some((m) => m.id === d.supervisor.id);
        if (!supInMembers) supExtra = 1;
      }
      map[d.id] = members.length + supExtra;
    });
    setUserCounts(map);
  }, [departments, allUsers]);

  const processedDepartments = useMemo(() => {
    const withCounts = departments.map((d) => ({
      ...d,
      totalUsers: userCounts[d.id] ?? 0,
      supervisorName: d.supervisor ? `${d.supervisor.profile.firstName || ""} ${d.supervisor.profile.lastName || ""}`.trim() : "",
    }));
    let filtered = [...withCounts];
    if (!filters.deptIds.includes("all")) filtered = filtered.filter((d) => filters.deptIds.includes(d.id));
    if (!filters.supervisorIds.includes("all"))
      filtered = filtered.filter((d) => d.supervisor && filters.supervisorIds.includes(d.supervisor.id));
    filtered.sort((a, b) => (a.id < b.id ? (sortConfig.direction === "ascending" ? -1 : 1) : 1));
    return filtered;
  }, [departments, userCounts, filters, sortConfig]);

  const buildCSV = (rows) => {
    const visibleCols = columnOptions.filter((c) => columnVisibility.includes(c.value));
    const header = visibleCols.map((c) => `"${c.label}"`);
    const cell = (r, key) => {
      switch (key) {
        case "id":
          return r.id;
        case "name":
          return r.name;
        case "supervisor":
          return r.supervisorName || "—";
        case "userCount":
          return r.totalUsers;
        case "createdAt":
          return fmtMMDDYYYY_hhmma(r.createdAt);
        case "updatedAt":
          return fmtMMDDYYYY_hhmma(r.updatedAt);
        default:
          return "";
      }
    };
    const body = rows.map((r) => visibleCols.map((c) => `"${cell(r, c.value)}"`));
    return [header, ...body].map((l) => l.join(",")).join("\r\n");
  };

  const companyName = profileData?.company?.name?.replace(/\s+/g, "_") || "Company";

  const exportCSV = () => {
    const rows = processedDepartments;
    if (!rows.length) return toast.message("No rows to export");
    setExporting(true);
    try {
      const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const blob = new Blob([buildCSV(rows)], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Departments_${companyName}_${stamp}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.message("CSV exported");
    } catch {
      toast.message("Export failed");
    }
    setExporting(false);
  };

  const exportPDF = () => {
    if (!processedDepartments.length) return toast.message("No rows to export");
    setPdfExporting(true);
    const visibleCols = columnOptions.filter((c) => columnVisibility.includes(c.value));
    const tableHead = [visibleCols.map((c) => c.label)];
    const cellVal = (r, k) => {
      switch (k) {
        case "id":
          return r.id;
        case "name":
          return r.name;
        case "supervisor":
          return r.supervisorName || "—";
        case "userCount":
          return r.totalUsers;
        case "createdAt":
          return fmtMMDDYYYY_hhmma(r.createdAt);
        case "updatedAt":
          return fmtMMDDYYYY_hhmma(r.updatedAt);
        default:
          return "";
      }
    };
    const tableBody = processedDepartments.map((r) => visibleCols.map((c) => cellVal(r, c.value)));
    const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
    doc.setFontSize(12);
    doc.text(`Company : ${companyName}`, 14, 20);
    autoTable(doc, {
      head: tableHead,
      body: tableBody,
      startY: 28,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [255, 165, 0] },
    });
    const stamp = new Date().toISOString().slice(0, 10);
    doc.save(`Departments_${companyName}_${stamp}.pdf`);
    toast.message("PDF exported");
    setPdfExporting(false);
  };

  const openUsersModal = (dept) => {
    setUsersDeptName(dept.name);
    setSupervisorUser(dept.supervisor || null);
    const members = allUsers.filter(
      (u) => u.department && u.department.id === dept.id && (!dept.supervisor || u.id !== dept.supervisor.id)
    );
    setDeptMembers(members);
    setShowUsersModal(true);
  };

  const handleCreateDepartment = async () => {
    setLoading(true);
    try {
      const payload = {
        name: createDeptForm.name,
        supervisorId: createDeptForm.supervisorId === "none" ? null : createDeptForm.supervisorId || null,
      };
      const res = await fetch(`${API_URL}/api/departments/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (res.ok) {
        toast.message("Department created successfully");
        setShowCreateModal(false);
        setCreateDeptForm({ name: "", supervisorId: "" });
        refreshData();
      } else toast.message(j.error || "Failed to create department");
    } catch {
      toast.message("Failed to create department");
    }
    setLoading(false);
  };

  const handleEditDepartment = (dept) => {
    setEditDeptForm({
      id: dept.id,
      name: dept.name,
      supervisorId: dept.supervisor ? dept.supervisor.id : "",
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    setLoading(true);
    try {
      const payload = {
        name: editDeptForm.name,
        supervisorId: editDeptForm.supervisorId === "none" ? null : editDeptForm.supervisorId || null,
      };
      const res = await fetch(`${API_URL}/api/departments/update/${editDeptForm.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (res.ok) {
        toast.message("Department updated successfully");
        setShowEditModal(false);
        refreshData();
      } else toast.message(j.error || "Failed to update department");
    } catch {
      toast.message("Failed to update department");
    }
    setLoading(false);
  };

  const handleDeleteDepartment = (id) => {
    setDepartmentToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDeleteDepartment = async () => {
    if (!departmentToDelete) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/departments/delete/${departmentToDelete}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await res.json();
      if (res.ok) {
        toast.message("Department deleted successfully");
        setDepartments((p) => p.filter((d) => d.id !== departmentToDelete));
        fetchAllUsers();
      } else toast.message(j.error || "Failed to delete department");
    } catch {
      toast.message("Failed to delete department");
    }
    setLoading(false);
    setShowDeleteModal(false);
    setDepartmentToDelete(null);
  };

  return (
    <div className="max-w-full mx-auto p-4 lg:px-4 px-1 space-y-8">
      <Toaster position="top-center" />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Building className="h-7 w-7 text-orange-500" />
            Company Departments
          </h2>
        </div>
        <div className="flex gap-2">
          <IconBtn icon={RefreshCw} tooltip="Refresh table" spinning={refreshing} onClick={refreshData} />
          <IconBtn
            icon={Download}
            tooltip="Export CSV"
            spinning={exporting}
            onClick={exportCSV}
            disabled={exporting || !processedDepartments.length}
          />
          <IconBtn
            icon={FileText}
            tooltip="Export PDF"
            spinning={pdfExporting}
            onClick={exportPDF}
            disabled={pdfExporting || !processedDepartments.length}
          />
          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogTrigger asChild>
              <Badge className="bg-orange-500 hover:bg-orange-600 text-white cursor-pointer ml-auto">
                <Plus />
              </Badge>
            </DialogTrigger>
            <DialogContent className="border-2 dark:border-white/10">
              <div className="h-1 w-full bg-orange-500 -mt-6 mb-4" />
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className="p-2 rounded-full bg-orange-500/10 text-orange-500 dark:bg-orange-500/20 dark:text-orange-500">
                    <Plus className="h-5 w-5" />
                  </div>
                  Create New Department
                </DialogTitle>
                <DialogDescription>Add a new department to your organization</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="dept-name" className="text-right font-medium text-sm">
                    Name
                  </label>
                  <Input
                    id="dept-name"
                    value={createDeptForm.name}
                    onChange={(e) => setCreateDeptForm({ ...createDeptForm, name: e.target.value })}
                    className="col-span-3"
                    placeholder="Enter department name"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="dept-supervisor" className="text-right font-medium text-sm">
                    Supervisor
                  </label>
                  <Select
                    value={createDeptForm.supervisorId}
                    onValueChange={(v) => setCreateDeptForm({ ...createDeptForm, supervisorId: v })}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select a supervisor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Supervisor</SelectItem>
                      {supervisors.map((sup) => (
                        <SelectItem key={sup.id} value={sup.id}>
                          {sup.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateDepartment}
                  disabled={loading}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  {loading ? "Creating…" : "Create Department"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <Card className="border-2 shadow-md overflow-hidden dark:border-white/10">
        <div className="h-1 w-full bg-orange-500" />
        <CardHeader className="pb-2 relative">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-orange-500" />
            Table Controls
          </CardTitle>
          <span className="absolute top-2 right-4 text-sm text-muted-foreground">
            {processedDepartments.length} of {departments.length}
          </span>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 items-center">
              <span className={labelClass}>Column:</span>
              <ColumnSelector options={columnOptions} visible={columnVisibility} setVisible={setColumnVisibility} />
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <span className={labelClass}>Filter:</span>
              <MultiSelect
                options={departments.map((d) => ({ value: d.id, label: d.name }))}
                selected={filters.deptIds}
                onChange={(v) => toggleListFilter("deptIds", v)}
                allLabel="All departments"
                width={200}
              />
              <MultiSelect
                options={supervisors.map((s) => ({
                  value: s.id,
                  label: `${s.profile.firstName || ""} ${s.profile.lastName || ""}`.trim() || s.username,
                }))}
                selected={filters.supervisorIds}
                onChange={(v) => toggleListFilter("supervisorIds", v)}
                allLabel="All supervisors"
                width={200}
              />
              {(!filters.deptIds.includes("all") || !filters.supervisorIds.includes("all")) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllFilters}
                  className="border-orange-500/30 text-orange-700 hover:bg-orange-500/10 dark:border-orange-500/30 dark:text-orange-400 dark:hover:bg-orange-500/20"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="border-2 shadow-md overflow-hidden dark:border-white/10">
        <div className="h-1 w-full bg-orange-500" />
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5 text-orange-500" />
            Main Table
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {columnVisibility.includes("id") && <TableHead>Department ID</TableHead>}
                  {columnVisibility.includes("name") && <TableHead>Department Name</TableHead>}
                  {columnVisibility.includes("supervisor") && <TableHead>Supervisor</TableHead>}
                  {columnVisibility.includes("userCount") && <TableHead>User Count</TableHead>}
                  {columnVisibility.includes("createdAt") && <TableHead>Created At</TableHead>}
                  {columnVisibility.includes("updatedAt") && <TableHead>Updated At</TableHead>}
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      {columnVisibility.map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-6 w-full" />
                        </TableCell>
                      ))}
                      <TableCell>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : processedDepartments.length ? (
                  <AnimatePresence>
                    {processedDepartments.map((dept) => (
                      <motion.tr
                        key={dept.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-b transition-colors hover:bg-muted/50"
                      >
                        {columnVisibility.includes("id") && <TableCell className="text-xs">{dept.id}</TableCell>}
                        {columnVisibility.includes("name") && (
                          <TableCell className="text-nowrap capitalize text-xs">{dept.name}</TableCell>
                        )}
                        {columnVisibility.includes("supervisor") && (
                          <TableCell className="text-nowrap text-xs">
                            {dept.supervisorName || <span className="text-xs italic text-nowrap">No Supervisor Assigned</span>}
                          </TableCell>
                        )}
                        {columnVisibility.includes("userCount") && (
                          <TableCell>
                            <Button variant="ghost" size="xs" onClick={() => openUsersModal(dept)}>
                              <Badge className="bg-orange-500 hover:bg-orange-600 text-white">
                                <Users className="h-3 w-3 mr-1" />
                                {dept.totalUsers}
                              </Badge>
                            </Button>
                          </TableCell>
                        )}
                        {columnVisibility.includes("createdAt") && (
                          <TableCell className="text-nowrap text-xs">{fmtMMDDYYYY_hhmma(dept.createdAt)}</TableCell>
                        )}
                        {columnVisibility.includes("updatedAt") && (
                          <TableCell className="text-nowrap text-xs">{fmtMMDDYYYY_hhmma(dept.updatedAt)}</TableCell>
                        )}
                        <TableCell>
                          <div className="flex gap-1 justify-center">
                            <TooltipProvider delayDuration={300}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditDepartment(dept)}
                                    className="text-orange-700 hover:bg-orange-500/10 dark:text-orange-400 dark:hover:bg-orange-500/20"
                                  >
                                    <Edit3 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit department</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider delayDuration={300}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteDepartment(dept.id)}
                                    className="text-red-500 hover:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete department</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                ) : (
                  <TableRow>
                    <TableCell colSpan={columnVisibility.length + 1} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <div className="w-16 h-16 bg-black/5 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Building className="h-8 w-8 text-orange-500/50" />
                        </div>
                        <p>No departments found matching your filters</p>
                        {(!filters.deptIds.includes("all") || !filters.supervisorIds.includes("all")) && (
                          <Button variant="link" onClick={clearAllFilters} className="text-orange-500 hover:text-orange-600 mt-2">
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
      <Dialog open={showUsersModal} onOpenChange={setShowUsersModal}>
        <DialogContent className="max-w-lg border-2 dark:border-white/10">
          <div className="h-1 w-full bg-orange-500 -mt-6 mb-4" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-orange-500" />
              Users in “{usersDeptName}”
            </DialogTitle>
          </DialogHeader>
          {usersDeptName && (
            <ScrollArea className="max-h-[60vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Email</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supervisorUser && (
                    <TableRow>
                      <TableCell className="font-medium">
                        Supervisor – {`${supervisorUser.profile.firstName || ""} ${supervisorUser.profile.lastName || ""}`.trim()}
                      </TableCell>
                      <TableCell>{supervisorUser.email}</TableCell>
                    </TableRow>
                  )}
                  {deptMembers.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>{`${u.profile.firstName || ""} ${u.profile.lastName || ""}`.trim()}</TableCell>
                      <TableCell>{u.email}</TableCell>
                    </TableRow>
                  ))}
                  {!supervisorUser && !deptMembers.length && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center">
                        No users in this department
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="border-2 dark:border-white/10">
          <div className="h-1 w-full bg-orange-500 -mt-6 mb-4" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-orange-500/10 text-orange-500 dark:bg-orange-500/20 dark:text-orange-500">
                <Edit3 className="h-5 w-5" />
              </div>
              Edit Department
            </DialogTitle>
            <DialogDescription>Update department information</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="edit-name" className="text-right font-medium text-sm">
                Name
              </label>
              <Input
                id="edit-name"
                value={editDeptForm.name}
                onChange={(e) => setEditDeptForm({ ...editDeptForm, name: e.target.value })}
                className="col-span-3"
                placeholder="Enter department name"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="edit-supervisor" className="text-right font-medium text-sm">
                Supervisor
              </label>
              <Select
                value={editDeptForm.supervisorId}
                onValueChange={(v) => setEditDeptForm({ ...editDeptForm, supervisorId: v })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a supervisor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Supervisor</SelectItem>
                  {supervisors.map((sup) => (
                    <SelectItem key={sup.id} value={sup.id}>
                      {sup.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={loading} className="bg-orange-500 hover:bg-orange-600 text-white">
              {loading ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="sm:max-w-md border-2 border-red-200 dark:border-red-800/50">
          <div className="h-1 w-full bg-red-500 -mt-6 mb-4" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400">
                <AlertCircle className="h-5 w-5" />
              </div>
              Delete Department
            </DialogTitle>
            <DialogDescription>Are you sure you want to delete this department? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 my-4">
            <p className="text-sm text-red-600 dark:text-red-400">
              Deleting a department will remove it from your organization structure. Any users assigned to this department may
              need to be reassigned.
            </p>
          </div>
          <DialogFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              className="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800/50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteDepartment} className="bg-red-500 hover:bg-red-600">
              {loading ? "Deleting…" : "Delete Department"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
