// components/Dashboard/DashboardContent/Settings/Admin/ManageDepartments.jsx
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState } from "react";
import { Trash2, Edit3, PlusCircle, ChevronDown, ChevronUp, Building, Users, AlertCircle, Download, RefreshCw, Filter, Check } from "lucide-react";
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
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

const buildCSV = (rows) => {
  const header = ["ID", "Department", "Supervisor", "User Count"];
  const body = rows.map((d) => [`"${d.id}"`, `"${d.name}"`, `"${d.supervisorName}"`, d.totalUsers]);
  return [header, ...body].map((l) => l.join(",")).join("\r\n");
};

function ManageDepartments() {
  const { token } = useAuthStore();
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const [profileData, setProfileData] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const supervisors = allUsers.filter((u) => u.role && u.role.toLowerCase() === "supervisor");
  const [userCounts, setUserCounts] = useState({});
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
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
  const [sortConfig, setSortConfig] = useState({ key: "id", direction: "ascending" });

  const [filters, setFilters] = useState({
    deptIds: ["all"],
    supervisorIds: ["all"],
  });

  const columnOptions = [
    { value: "id", label: "ID" },
    { value: "name", label: "Department Name" },
    { value: "supervisor", label: "Supervisor" },
    { value: "userCount", label: "User Count" },
  ];
  const [columnVisibility, setColumnVisibility] = useState(columnOptions.map((o) => o.value));

  const sortOptions = [
    { key: "id", label: "ID" },
    { key: "name", label: "Department Name" },
    { key: "supervisor", label: "Supervisor" },
    { key: "userCount", label: "User Count" },
  ];

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
    if (token && profileData?.company?.id) {
      fetchDepartments();
      fetchAllUsers();
    }
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
    toast.message("Data refreshed");
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

  const clearAllFilters = () => setFilters({ deptIds: ["all"], supervisorIds: ["all"] });

  const getDepartmentsProcessed = () => {
    const withCounts = departments.map((d) => ({
      ...d,
      totalUsers: userCounts[d.id] ?? 0,
      supervisorName: d.supervisor ? `${d.supervisor.profile.firstName || ""} ${d.supervisor.profile.lastName || ""}`.trim() : "",
    }));

    let filtered = [...withCounts];

    if (!filters.deptIds.includes("all")) {
      filtered = filtered.filter((d) => filters.deptIds.includes(d.id));
    }
    if (!filters.supervisorIds.includes("all")) {
      filtered = filtered.filter((d) => d.supervisor && filters.supervisorIds.includes(d.supervisor.id));
    }

    return filtered.sort((a, b) => {
      const getVal = (obj) => {
        switch (sortConfig.key) {
          case "id":
            return obj.id;
          case "name":
            return obj.name.toLowerCase();
          case "supervisor":
            return obj.supervisorName.toLowerCase();
          case "userCount":
            return obj.totalUsers;
          default:
            return 0;
        }
      };
      const aVal = getVal(a);
      const bVal = getVal(b);
      if (aVal < bVal) return sortConfig.direction === "ascending" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "ascending" ? 1 : -1;
      return 0;
    });
  };

  const exportCSV = () => {
    const rows = getDepartmentsProcessed();
    if (!rows.length) return toast.message("No rows to export");
    setExporting(true);
    try {
      const d = new Date();
      const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
      const blob = new Blob([buildCSV(rows)], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Departments_${stamp}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.message("CSV exported");
    } catch {
      toast.message("Export failed");
    }
    setExporting(false);
  };

  const openUsersModal = (dept) => {
    setUsersDeptName(dept.name);
    setSupervisorUser(dept.supervisor || null);
    const members = allUsers.filter((u) => u.department && u.department.id === dept.id && (!dept.supervisor || u.id !== dept.supervisor.id));
    setDeptMembers(members);
    setShowUsersModal(true);
  };

  const MultiDepartmentSelect = () => {
    const allChecked = filters.deptIds.includes("all");
    const toggle = (id) => {
      if (id === "all") return setFilters({ ...filters, deptIds: ["all"] });
      let list = filters.deptIds.filter((x) => x !== "all");
      list = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
      if (!list.length) list = ["all"];
      setFilters({ ...filters, deptIds: list });
    };
    const label = allChecked ? "All departments" : `${filters.deptIds.length} selected`;
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="min-w-[200px] justify-between">
            {label}
            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2 space-y-1" align="start">
          <div className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer" onClick={() => toggle("all")}>
            <Checkbox checked={allChecked} />
            <span>All departments</span>
            {allChecked && <Check className="ml-auto h-4 w-4 text-orange-500" />}
          </div>
          <div className="max-h-64 overflow-y-auto pr-1">
            {departments.map((d) => {
              const checked = filters.deptIds.includes(d.id);
              return (
                <div key={d.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer" onClick={() => toggle(d.id)}>
                  <Checkbox checked={checked} />
                  <span className="truncate">{d.name}</span>
                  {checked && <Check className="ml-auto h-4 w-4 text-orange-500" />}
                </div>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  const MultiSupervisorSelect = () => {
    const allChecked = filters.supervisorIds.includes("all");
    const toggle = (id) => {
      if (id === "all") return setFilters({ ...filters, supervisorIds: ["all"] });
      let list = filters.supervisorIds.filter((x) => x !== "all");
      list = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
      if (!list.length) list = ["all"];
      setFilters({ ...filters, supervisorIds: list });
    };
    const label = allChecked ? "All supervisors" : `${filters.supervisorIds.length} selected`;
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="min-w-[200px] justify-between">
            {label}
            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2 space-y-1" align="start">
          <div className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer" onClick={() => toggle("all")}>
            <Checkbox checked={allChecked} />
            <span>All supervisors</span>
            {allChecked && <Check className="ml-auto h-4 w-4 text-orange-500" />}
          </div>
          <div className="max-h-64 overflow-y-auto pr-1">
            {supervisors.map((s) => {
              const checked = filters.supervisorIds.includes(s.id);
              const supName = `${s.profile.firstName || ""} ${s.profile.lastName || ""}`.trim() || s.username;
              return (
                <div key={s.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer" onClick={() => toggle(s.id)}>
                  <Checkbox checked={checked} />
                  <span className="truncate">{supName}</span>
                  {checked && <Check className="ml-auto h-4 w-4 text-orange-500" />}
                </div>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  const MultiColumnSelect = () => {
    const allChecked = columnVisibility.length === columnOptions.length;
    const toggle = (val) => {
      if (val === "all") return setColumnVisibility(allChecked ? [] : columnOptions.map((o) => o.value));
      setColumnVisibility((prev) => (prev.includes(val) ? prev.filter((x) => x !== val) : [...prev, val]));
    };
    const label = allChecked ? "All columns" : columnVisibility.length === 0 ? "No columns" : `${columnVisibility.length} selected`;
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="min-w-[180px] justify-between">
            {label}
            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2 space-y-1" align="start">
          <div className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer" onClick={() => toggle("all")}>
            <Checkbox checked={allChecked} />
            <span>All columns</span>
            {allChecked && <Check className="ml-auto h-4 w-4 text-orange-500" />}
          </div>
          <div className="max-h-64 overflow-y-auto pr-1">
            {columnOptions.map((opt) => {
              const checked = columnVisibility.includes(opt.value);
              return (
                <div key={opt.value} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer" onClick={() => toggle(opt.value)}>
                  <Checkbox checked={checked} />
                  <span>{opt.label}</span>
                  {checked && <Check className="ml-auto h-4 w-4 text-orange-500" />}
                </div>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    );
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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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

  return (
    <div className="max-w-full mx-auto p-4 lg:px-10 px-2 space-y-8">
      <Toaster position="top-center" />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Building className="h-7 w-7 text-orange-500" />
            Manage Departments
          </h2>
          <p className="text-muted-foreground mt-1">Create and manage your company's departments</p>
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
          </TooltipProvider>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={exportCSV}
                  disabled={exporting || !getDepartmentsProcessed().length}
                  className="flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-black"
                >
                  <Download className={`h-4 w-4 ${exporting ? "animate-spin" : ""}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export CSV</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogTrigger asChild>
              <Button className="bg-orange-500 hover:bg-orange-600 text-white font-semibold">
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Department
              </Button>
            </DialogTrigger>
            <DialogContent className="border-2 dark:border-white/10">
              <div className="h-1 w-full bg-orange-500 -mt-6 mb-4" />
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
                    onChange={(e) => setCreateDeptForm({ ...createDeptForm, name: e.target.value })}
                    className="col-span-3"
                    placeholder="Enter department name"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="dept-supervisor" className="text-right font-medium text-sm">
                    Supervisor
                  </label>
                  <Select value={createDeptForm.supervisorId} onValueChange={(v) => setCreateDeptForm({ ...createDeptForm, supervisorId: v })}>
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

      <Card className="border-2 shadow-md overflow-hidden dark:border-white/10">
        <div className="h-1 w-full bg-orange-500" />
        <CardHeader className="pb-2 relative">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-orange-500/10 text-orange-500">
              <Filter className="h-5 w-5" />
            </div>
            Table Controls
          </CardTitle>
          <CardDescription>Choose columns, sort order, and apply filters</CardDescription>
          <span className="absolute top-2 right-4 text-sm text-muted-foreground">
            Showing {getDepartmentsProcessed().length} of {departments.length} departments
          </span>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 items-center">
              <span className={labelClass}>Table:</span>
              <MultiColumnSelect />
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <span className={labelClass}>Sort:</span>
              {sortOptions.map(({ key, label }) => (
                <TooltipProvider key={key} delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setSortConfig({ key, direction: sortConfig.key === key && sortConfig.direction === "ascending" ? "descending" : "ascending" })
                        }
                        className={sortConfig.key === key ? "border-orange-500 bg-orange-500/10 text-orange-700 dark:text-orange-400" : ""}
                      >
                        {label}
                        {arrow(key)}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Sort by {label}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <span className={labelClass}>Filter:</span>
              <MultiDepartmentSelect />
              <MultiSupervisorSelect />
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
            <div className="p-2 rounded-full bg-orange-500/10 text-orange-500">
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
                  {columnVisibility.includes("id") && (
                    <TableHead className="cursor-pointer" onClick={() => requestSort("id")}>
                      <div>ID {arrow("id")}</div>
                    </TableHead>
                  )}
                  {columnVisibility.includes("name") && (
                    <TableHead className="cursor-pointer" onClick={() => requestSort("name")}>
                      <div>Department Name {arrow("name")}</div>
                    </TableHead>
                  )}
                  {columnVisibility.includes("supervisor") && (
                    <TableHead className="cursor-pointer" onClick={() => requestSort("supervisor")}>
                      <div>Supervisor {arrow("supervisor")}</div>
                    </TableHead>
                  )}
                  {columnVisibility.includes("userCount") && (
                    <TableHead className="cursor-pointer" onClick={() => requestSort("userCount")}>
                      <div>User Count {arrow("userCount")}</div>
                    </TableHead>
                  )}
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
                ) : getDepartmentsProcessed().length ? (
                  <AnimatePresence>
                    {getDepartmentsProcessed().map((dept) => (
                      <motion.tr
                        key={dept.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-b transition-colors hover:bg-muted/50"
                      >
                        {columnVisibility.includes("id") && <TableCell className="text-xs">{dept.id}</TableCell>}
                        {columnVisibility.includes("name") && <TableCell className="text-nowrap capitalize">{dept.name}</TableCell>}
                        {columnVisibility.includes("supervisor") && (
                          <TableCell className="text-nowrap">{dept.supervisorName || "No supervisor assigned"}</TableCell>
                        )}
                        {columnVisibility.includes("userCount") && (
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => openUsersModal(dept)}>
                              <Badge className="bg-orange-500 hover:bg-orange-600 text-white">
                                <Users className="h-3 w-3 mr-1" />
                                {dept.totalUsers}
                              </Badge>
                            </Button>
                          </TableCell>
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
              <Select value={editDeptForm.supervisorId} onValueChange={(v) => setEditDeptForm({ ...editDeptForm, supervisorId: v })}>
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
              Deleting a department will remove it from your organization structure. Any users assigned to this department may need to be reassigned.
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

export default ManageDepartments;
