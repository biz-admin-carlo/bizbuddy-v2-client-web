/* eslint-disable react-hooks/exhaustive-deps */
"use client";

/**
 * ManageDepartments
 * -------------------------------------------------
 * • Department ID first column + CSV export
 * • Accurate user-count badge (supervisor + members)
 * • Badge opens a modal with a table:
 *      – Supervisor row first (labelled)
 *      – Member rows beneath
 *      – Columns: Full Name | Email
 * • NEW: Refresh button to reload all data
 */

import { useEffect, useState } from "react";
import {
  Trash2,
  Edit3,
  PlusCircle,
  ChevronDown,
  ChevronUp,
  Search,
  Building,
  Users,
  UserCheck,
  AlertCircle,
  Download,
  RefreshCw, // ← added
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast, Toaster } from "sonner";
import useAuthStore from "@/store/useAuthStore";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";

/* =================================================================== */
/*  CSV helper                                                         */
/* =================================================================== */
const buildCSV = (rows) => {
  const header = ["ID", "Department", "Supervisor", "User Count"];
  const body = rows.map((d) => [`"${d.id}"`, `"${d.name}"`, `"${d.supervisorName}"`, d.totalUsers]);
  return [header, ...body].map((l) => l.join(",")).join("\r\n");
};

/* =================================================================== */
/*  Component                                                          */
/* =================================================================== */
function ManageDepartments() {
  const { token } = useAuthStore();
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  /* ---------------- core data ---------------- */
  const [profileData, setProfileData] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  /* derived supervisor list */
  const supervisors = allUsers.filter((u) => u.role && u.role.toLowerCase() === "supervisor");

  /* user-count map { deptId: N } */
  const [userCounts, setUserCounts] = useState({});

  /* ---------------- ui state ---------------- */
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false); // ← added

  /* create modal */
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createDeptForm, setCreateDeptForm] = useState({
    name: "",
    supervisorId: "",
  });

  /* edit modal */
  const [showEditModal, setShowEditModal] = useState(false);
  const [editDeptForm, setEditDeptForm] = useState({
    id: "",
    name: "",
    supervisorId: "",
  });

  /* delete modal */
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState(null);

  /* users list modal */
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [usersDeptName, setUsersDeptName] = useState("");
  const [supervisorUser, setSupervisorUser] = useState(null);
  const [deptMembers, setDeptMembers] = useState([]);

  /* sort & filter */
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [filters, setFilters] = useState({ name: "", supervisor: "" });

  /* =================================================================== */
  /*  Fetch helpers                                                      */
  /* =================================================================== */
  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/api/account/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((j) => {
        if (j?.data?.company?.id) setProfileData(j.data);
        else toast.message("User profile or company not found.");
      })
      .catch(() => toast.message("Failed to fetch profile."));
  }, [token, API_URL]);

  useEffect(() => {
    if (token && profileData?.company?.id) {
      fetchDepartments();
      fetchAllUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, profileData]);

  /* ------------------------------------------------------------------- */
  /*  Departments                                                        */
  /* ------------------------------------------------------------------- */
  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/departments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await res.json();
      if (j?.data) setDepartments(j.data);
      else toast.message(j.error || "Failed to fetch departments.");
    } catch {
      toast.message("Failed to fetch departments.");
    }
    setLoading(false);
  };

  /* ------------------------------------------------------------------- */
  /*  Users                                                              */
  /* ------------------------------------------------------------------- */
  const fetchAllUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/api/employee?all=1`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await res.json();
      if (j?.data) setAllUsers(j.data);
      else toast.message("Failed to fetch users.");
    } catch {
      toast.message("Failed to fetch users.");
    }
  };

  /* ------------------------------------------------------------------- */
  /*  Refresh helper                                                     */
  /* ------------------------------------------------------------------- */
  const refreshData = async () => {
    setRefreshing(true);
    await Promise.all([fetchDepartments(), fetchAllUsers()]);
    toast.message("Data refreshed");
    setRefreshing(false);
  };

  /* ------------------------------------------------------------------- */
  /*  Re-compute userCounts whenever data changes                         */
  /* ------------------------------------------------------------------- */
  useEffect(() => {
    if (!departments.length) return;

    const map = {};
    departments.forEach((d) => {
      /* start with members whose department id matches */
      const members = allUsers.filter((u) => u.department && u.department.id === d.id);

      /* ensure supervisor is counted exactly once */
      let supExtra = 0;
      if (d.supervisor) {
        const supInMembers = members.some((m) => m.id === d.supervisor.id);
        if (!supInMembers) supExtra = 1;
      }

      map[d.id] = members.length + supExtra;
    });
    setUserCounts(map);
  }, [departments, allUsers]);

  /* =================================================================== */
  /*  Sort / filter helpers                                              */
  /* =================================================================== */
  const requestSort = (key) =>
    setSortConfig((p) => ({
      key,
      direction: p.key === key && p.direction === "ascending" ? "descending" : "ascending",
    }));

  const arrow = (key) =>
    sortConfig.key === key ? (
      sortConfig.direction === "ascending" ? (
        <ChevronUp className="h-4 w-4 ml-1" />
      ) : (
        <ChevronDown className="h-4 w-4 ml-1" />
      )
    ) : null;

  const handleFilterChange = (field, value) => setFilters({ ...filters, [field]: value });

  const clearAllFilters = () => setFilters({ name: "", supervisor: "" });

  const getDepartmentsProcessed = () => {
    const withCounts = departments.map((d) => ({
      ...d,
      totalUsers: userCounts[d.id] ?? 0,
      supervisorName: d.supervisor ? `${d.supervisor.profile.firstName || ""} ${d.supervisor.profile.lastName || ""}`.trim() : "",
    }));

    /* filters */
    const filtered = withCounts.filter((d) => {
      const matchName = !filters.name || d.name.toLowerCase().includes(filters.name.toLowerCase());
      const matchSup = !filters.supervisor || d.supervisorName.toLowerCase().includes(filters.supervisor.toLowerCase());
      return matchName && matchSup;
    });

    if (!sortConfig.key) return filtered;

    /* sort */
    return [...filtered].sort((a, b) => {
      let aVal, bVal;
      switch (sortConfig.key) {
        case "id":
          aVal = a.id;
          bVal = b.id;
          break;
        case "name":
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case "supervisor":
          aVal = a.supervisorName.toLowerCase();
          bVal = b.supervisorName.toLowerCase();
          break;
        case "userCount":
          aVal = a.totalUsers;
          bVal = b.totalUsers;
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

  /* =================================================================== */
  /*  CSV export                                                         */
  /* =================================================================== */
  const exportCSV = () => {
    const rows = getDepartmentsProcessed();
    if (!rows.length) return toast.message("No rows to export");
    setExporting(true);
    try {
      const d = new Date();
      const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
      const fileName = `Departments_${stamp}.csv`;
      const blob = new Blob([buildCSV(rows)], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      toast.message("CSV exported");
    } catch {
      toast.message("Export failed");
    }
    setExporting(false);
  };

  /* =================================================================== */
  /*  Users modal helpers                                                */
  /* =================================================================== */
  const openUsersModal = (dept) => {
    setUsersDeptName(dept.name);
    setSupervisorUser(dept.supervisor || null);

    const members = allUsers.filter((u) => u.department && u.department.id === dept.id && (!dept.supervisor || u.id !== dept.supervisor.id));
    setDeptMembers(members);
    setShowUsersModal(true);
  };

  /* =================================================================== */
  /*  CRUD HELPERS (create / edit / delete)                              */
  /* =================================================================== */
  const handleCreateDepartment = async () => {
    setLoading(true);
    try {
      const payload = {
        name: createDeptForm.name,
        supervisorId: createDeptForm.supervisorId === "none" ? null : createDeptForm.supervisorId || null,
      };
      const res = await fetch(`${API_URL}/api/departments/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (res.ok) {
        toast.message("Department created successfully");
        setShowCreateModal(false);
        setCreateDeptForm({ name: "", supervisorId: "" });
        fetchDepartments();
        fetchAllUsers();
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
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (res.ok) {
        toast.message("Department updated successfully");
        setShowEditModal(false);
        fetchDepartments();
        fetchAllUsers();
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

  /* =================================================================== */
  /*  UI                                                                 */
  /* =================================================================== */
  return (
    <div className="max-w-7xl mx-auto p-4 space-y-8">
      <Toaster position="top-center" />

      {/* ================= HEADER ================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Building className="h-7 w-7 text-orange-500" />
            Manage Departments
          </h2>
          <p className="text-muted-foreground mt-1">Create and manage your company's departments</p>
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

          {/* CSV export */}
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={exportCSV}
                  disabled={exporting || !getDepartmentsProcessed().length}
                  className="border-orange-500/30 text-orange-700 hover:bg-orange-500/10 dark:border-orange-500/30 dark:text-orange-400 dark:hover:bg-orange-500/20"
                >
                  <Download className={`h-4 w-4 ${exporting ? "animate-spin" : ""}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export CSV</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* ---------- Create Department Dialog ---------- */}
          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogTrigger asChild>
              <Button className="bg-orange-500 hover:bg-orange-600 text-white font-semibold">
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Department
              </Button>
            </DialogTrigger>

            {/* ================= CREATE MODAL ================= */}
            <DialogContent className="border-2 dark:border-white/10">
              <div className="h-1 w-full bg-orange-500 -mt-6 mb-4"></div>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className="p-2 rounded-full bg-orange-500/10 text-orange-500 dark:bg-orange-500/20 dark:text-orange-500">
                    <PlusCircle className="h-5 w-5" />
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
                    onChange={(e) =>
                      setCreateDeptForm({
                        ...createDeptForm,
                        name: e.target.value,
                      })
                    }
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
                    onValueChange={(v) =>
                      setCreateDeptForm({
                        ...createDeptForm,
                        supervisorId: v,
                      })
                    }
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
                <Button onClick={handleCreateDepartment} disabled={loading} className="bg-orange-500 hover:bg-orange-600 text-white">
                  {loading ? "Creating…" : "Create Department"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ================= SEARCH / FILTER ================= */}
      <Card className="border-2 shadow-md overflow-hidden dark:border-white/10">
        <div className="h-1 w-full bg-orange-500"></div>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-orange-500/10 text-orange-500 dark:bg-orange-500/20 dark:text-orange-500">
              <Search className="h-5 w-5" />
            </div>
            Search &amp; Filter
          </CardTitle>
          <CardDescription>Find departments by name or supervisor</CardDescription>
        </CardHeader>

        <CardContent>
          <div className="flex flex-wrap gap-3 mb-4">
            {/* filter name */}
            <div className="flex-1 min-w-[200px]">
              <div className="flex items-center border rounded-md px-3 py-2 bg-black/5 dark:bg:white/5">
                <Search className="h-4 w-4 mr-2 text-muted-foreground" />
                <Input
                  placeholder="Filter by department name"
                  value={filters.name}
                  onChange={(e) => handleFilterChange("name", e.target.value)}
                  className="border-0 h-8 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            </div>

            {/* filter supervisor */}
            <div className="flex-1 min-w-[200px]">
              <div className="flex items-center border rounded-md px-3 py-2 bg-black/5 dark:bg:white/5">
                <UserCheck className="h-4 w-4 mr-2 text-muted-foreground" />
                <Input
                  placeholder="Filter by supervisor name"
                  value={filters.supervisor}
                  onChange={(e) => handleFilterChange("supervisor", e.target.value)}
                  className="border-0 h-8 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            </div>

            {(filters.name || filters.supervisor) && (
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

          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              Showing {getDepartmentsProcessed().length} of {departments.length} departments
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Sort by:</span>

              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => requestSort("id")}
                      className={sortConfig.key === "id" ? "border-orange-500 bg-orange-500/10 text-orange-700 dark:text-orange-400" : ""}
                    >
                      ID {arrow("id")}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Sort by department ID</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => requestSort("name")}
                      className={sortConfig.key === "name" ? "border-orange-500 bg-orange-500/10 text-orange-700 dark:text-orange-400" : ""}
                    >
                      Name {arrow("name")}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Sort by department name</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => requestSort("userCount")}
                      className={sortConfig.key === "userCount" ? "border-orange-500 bg-orange-500/10 text-orange-700 dark:text-orange-400" : ""}
                    >
                      Users {arrow("userCount")}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Sort by user count</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ================= TABLE ================= */}
      <Card className="border-2 shadow-md overflow-hidden dark:border-white/10">
        <div className="h-1 w-full bg-orange-500"></div>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-orange-500/10 text-orange-500 dark:bg-orange-500/20 dark:text-orange-500">
              <Building className="h-5 w-5" />
            </div>
            Departments
          </CardTitle>
          <CardDescription>Manage your organization's departments and their supervisors</CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer" onClick={() => requestSort("id")}>
                    <div className="flex items-center">ID {arrow("id")}</div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => requestSort("name")}>
                    <div className="flex items-center">Department Name {arrow("name")}</div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => requestSort("supervisor")}>
                    <div className="flex items-center">Supervisor {arrow("supervisor")}</div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => requestSort("userCount")}>
                    <div className="flex items-center">User Count {arrow("userCount")}</div>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      {Array(5)
                        .fill(null)
                        .map((__, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-6 w-full" />
                          </TableCell>
                        ))}
                    </TableRow>
                  ))
                ) : getDepartmentsProcessed().length ? (
                  <AnimatePresence>
                    {getDepartmentsProcessed().map((dept) => (
                      <motion.tr
                        key={dept.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                      >
                        <TableCell className="font-mono text-orange-700 dark:text-orange-400">{dept.id}</TableCell>

                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            <div className="w-2 h-2 rounded-full bg-orange-500 mr-2"></div>
                            <span className="capitalize">{dept.name}</span>
                          </div>
                        </TableCell>

                        <TableCell>
                          {dept.supervisorName ? (
                            <div className="flex items-center">
                              <div className="w-7 h-7 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center mr-2">
                                <UserCheck className="h-4 w-4 text-orange-500" />
                              </div>
                              <span>{dept.supervisorName}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">No supervisor assigned</span>
                          )}
                        </TableCell>

                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => openUsersModal(dept)} className="p-0">
                            <Badge className="bg-orange-500 hover:bg-orange-600 text-white">
                              <Users className="h-3 w-3 mr-1" />
                              {dept.totalUsers}
                            </Badge>
                          </Button>
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
                                    onClick={() => handleEditDepartment(dept)}
                                    className="text-orange-700 hover:bg-orange-500/10 dark:text-orange-400 dark:hover:bg-orange-500/20"
                                  >
                                    <Edit3 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit department</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            {/* delete */}
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
                    <TableCell colSpan={5} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <div className="w-16 h-16 bg-black/5 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Building className="h-8 w-8 text-orange-500/50" />
                        </div>
                        <p>No departments found matching your filters</p>
                        {(filters.name || filters.supervisor) && (
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

      {/* ================= USERS MODAL ================= */}
      <Dialog open={showUsersModal} onOpenChange={setShowUsersModal}>
        <DialogContent className="max-w-lg border-2 dark:border-white/10">
          <div className="h-1 w-full bg-orange-500 -mt-6 mb-4"></div>
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

      {/* ================= EDIT MODAL ================= */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="border-2 dark:border:white/10">
          <div className="h-1 w-full bg-orange-500 -mt-6 mb-4"></div>
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
                onChange={(e) =>
                  setEditDeptForm({
                    ...editDeptForm,
                    name: e.target.value,
                  })
                }
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
                onValueChange={(v) =>
                  setEditDeptForm({
                    ...editDeptForm,
                    supervisorId: v,
                  })
                }
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

      {/* ================= DELETE MODAL ================= */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="sm:max-w-md border-2 border-red-200 dark:border-red-800/50">
          <div className="h-1 w-full bg-red-500 -mt-6 mb-4"></div>
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
              Deleting a department will remove it from your organization structure. Any users assigned to this department may need to be reassigned.
            </p>
          </div>

          <DialogFooter className="flex justify-between sm:justify-between">
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

export default ManageDepartments;
