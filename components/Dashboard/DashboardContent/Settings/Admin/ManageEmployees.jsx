"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";
import { toast, Toaster } from "sonner";
import useAuthStore from "@/store/useAuthStore";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function ManageEmployees() {
  const { token } = useAuthStore();

  // CORE DATA
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);

  // UI/STATE
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // CREATE - show/hide modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  // CREATE form fields
  const [createForm, setCreateForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "employee",
    departmentId: "",
  });
  const [createLoading, setCreateLoading] = useState(false);

  // EDIT - show/hide modal
  const [showEditModal, setShowEditModal] = useState(false);
  // EDIT form fields
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

  // DELETE - show/hide confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // SORTING
  const [sortConfig, setSortConfig] = useState({ key: "name", direction: "ascending" });

  // FILTERING
  const [filters, setFilters] = useState({
    name: "",
    department: "",
    role: "",
  });

  // The base URL for your BizBuddy API
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  // 1) Fetch employees & departments
  useEffect(() => {
    if (token) {
      fetchEmployees();
      fetchDepartments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function fetchEmployees() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/employee`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setEmployees(data.data);
      } else {
        setError(data.error || "Failed to fetch employees.");
        toast.message(data.error || "Failed to fetch employees.");
      }
    } catch (err) {
      console.error("Error fetching employees:", err);
      setError("Something went wrong while fetching employees.");
      toast.message("Failed to fetch employees.");
    }
    setLoading(false);
  }

  async function refreshData() {
    setRefreshing(true);
    try {
      await Promise.all([fetchEmployees(), fetchDepartments()]);
      toast.message("Data refreshed successfully");
    } catch (err) {
      console.error(err);
      toast.message("Failed to refresh data");
    } finally {
      setRefreshing(false);
    }
  }

  async function fetchDepartments() {
    try {
      const res = await fetch(`${API_URL}/api/departments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setDepartments(data.data);
      } else {
        toast.message(data.error || "Failed to fetch departments.");
      }
    } catch (err) {
      console.error("Error fetching departments:", err);
      toast.message("Failed to fetch departments.");
    }
  }

  // 2) FILTERS
  function handleFilterChange(field, value) {
    setFilters({ ...filters, [field]: value });
  }

  function clearFilters() {
    setFilters({ name: "", department: "", role: "" });
  }

  // 3) SORT
  function requestSort(key) {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  }

  function getFilteredAndSortedEmployees() {
    // Filter
    const filtered = employees.filter((emp) => {
      // fullName from first + last
      const fullName = `${emp.profile?.firstName || ""} ${emp.profile?.lastName || ""}`.trim().toLowerCase();

      // department name
      const deptName = emp.department?.name?.toLowerCase() || "";

      // role
      const role = (emp.role || "").toLowerCase();

      const matchesName = !filters.name || fullName.includes(filters.name.toLowerCase());
      const matchesDept = !filters.department || deptName.includes(filters.department.toLowerCase());
      const matchesRole = !filters.role || role.includes(filters.role.toLowerCase());

      return matchesName && matchesDept && matchesRole;
    });

    // Sort
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aVal, bVal;

        if (sortConfig.key === "name") {
          const aName = `${a.profile?.firstName || ""} ${a.profile?.lastName || ""}`.trim().toLowerCase();
          const bName = `${b.profile?.firstName || ""} ${b.profile?.lastName || ""}`.trim().toLowerCase();
          aVal = aName;
          bVal = bName;
        } else if (sortConfig.key === "email") {
          aVal = (a.email || "").toLowerCase();
          bVal = (b.email || "").toLowerCase();
        } else if (sortConfig.key === "role") {
          aVal = (a.role || "").toLowerCase();
          bVal = (b.role || "").toLowerCase();
        } else if (sortConfig.key === "department") {
          aVal = (a.department?.name || "").toLowerCase();
          bVal = (b.department?.name || "").toLowerCase();
        }

        if (aVal < bVal) return sortConfig.direction === "ascending" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "ascending" ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }

  // 4) CREATE
  function handleOpenCreateModal() {
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
    if (!createForm.firstName.trim()) return toast.message("First name is required");
    if (!createForm.lastName.trim()) return toast.message("Last name is required");
    if (!createForm.email.trim()) return toast.message("Email is required");
    if (!createForm.password.trim()) return toast.message("Password is required");

    setCreateLoading(true);
    setError("");
    try {
      const payload = {
        username: `${createForm.firstName}.${createForm.lastName}`.toLowerCase(), // or however you want
        email: createForm.email,
        password: createForm.password,
        firstName: createForm.firstName,
        lastName: createForm.lastName,
        role: createForm.role,
        departmentId: createForm.departmentId || null,
      };
      const res = await fetch(`${API_URL}/api/employee`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        toast.message("Employee created successfully");
        setShowCreateModal(false);
        await fetchEmployees();
      } else {
        toast.message(data.error || "Failed to create employee");
      }
    } catch (err) {
      console.error("Error creating employee:", err);
      toast.message("Failed to create employee");
    } finally {
      setCreateLoading(false);
    }
  }

  // 5) EDIT
  function handleEditEmployee(emp) {
    // We fill the form with existing data
    setEditForm({
      id: emp.id,
      firstName: emp.profile?.firstName || "",
      lastName: emp.profile?.lastName || "",
      email: emp.email || "",
      password: "", // optional (if not changed, remain empty)
      role: emp.role || "employee",
      departmentId: emp.department?.id || "",
    });
    setShowEditModal(true);
  }

  async function handleSaveEdit() {
    if (!editForm.firstName.trim()) return toast.message("First name is required");
    if (!editForm.lastName.trim()) return toast.message("Last name is required");
    if (!editForm.email.trim()) return toast.message("Email is required");

    setEditLoading(true);
    setError("");
    try {
      const payload = {
        email: editForm.email,
        password: editForm.password ? editForm.password : undefined, // only if not empty
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        role: editForm.role,
        departmentId: editForm.departmentId || null,
      };
      const res = await fetch(`${API_URL}/api/employee/${editForm.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        toast.message("Employee updated successfully");
        setShowEditModal(false);
        await fetchEmployees();
      } else {
        toast.message(data.error || "Failed to update employee");
      }
    } catch (err) {
      console.error("Error updating employee:", err);
      toast.message("Failed to update employee");
    } finally {
      setEditLoading(false);
    }
  }

  // 6) DELETE
  function handleDeleteEmployee(emp) {
    setEmployeeToDelete(emp);
    setShowDeleteModal(true);
  }

  async function confirmDeleteEmployee() {
    if (!employeeToDelete) return;
    setDeleteLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/employee/${employeeToDelete.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        toast.message(data.message || "Employee deleted successfully");
        // remove from local state
        setEmployees((prev) => prev.filter((e) => e.id !== employeeToDelete.id));
      } else {
        toast.message(data.error || "Failed to delete employee");
      }
    } catch (err) {
      console.error("Error deleting employee:", err);
      toast.message("Failed to delete employee");
    } finally {
      setDeleteLoading(false);
      setShowDeleteModal(false);
      setEmployeeToDelete(null);
    }
  }

  // Role badge helper
  const getRoleBadge = (role) => {
    switch (role?.toLowerCase()) {
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

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-8">
      <Toaster position="top-center" />

      {/* Header + Create */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-7 w-7 text-orange-500" />
            Manage Employees
          </h2>
          <p className="text-muted-foreground mt-1">Create and manage employees for your organization</p>
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
              <TooltipContent>
                <p>Refresh data</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenCreateModal} className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold">
                <UserPlus className="mr-2 h-4 w-4" />
                Create Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="border-2 dark:border-white/10">
              <div className="h-1 w-full bg-orange-500 -mt-6 mb-4"></div>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className="p-2 rounded-full bg-orange-500/10 text-orange-500 dark:bg-orange-500/20 dark:text-orange-500">
                    <UserPlus className="h-5 w-5" />
                  </div>
                  Create New Employee
                </DialogTitle>
                <DialogDescription>Add a new employee to your organization</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* First Name */}
                  <div className="space-y-2">
                    <label htmlFor="create-firstName" className="text-sm font-medium">
                      First Name
                    </label>
                    <Input
                      id="create-firstName"
                      value={createForm.firstName}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          firstName: e.target.value,
                        })
                      }
                      placeholder="Enter first name"
                    />
                  </div>
                  {/* Last Name */}
                  <div className="space-y-2">
                    <label htmlFor="create-lastName" className="text-sm font-medium">
                      Last Name
                    </label>
                    <Input
                      id="create-lastName"
                      value={createForm.lastName}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          lastName: e.target.value,
                        })
                      }
                      placeholder="Enter last name"
                    />
                  </div>
                </div>
                {/* Email */}
                <div className="space-y-2">
                  <label htmlFor="create-email" className="text-sm font-medium">
                    Email
                  </label>
                  <Input
                    id="create-email"
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="Enter email address"
                  />
                </div>
                {/* Password */}
                <div className="space-y-2">
                  <label htmlFor="create-password" className="text-sm font-medium">
                    Password
                  </label>
                  <Input
                    id="create-password"
                    type="password"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    placeholder="Enter password"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {/* Role */}
                  <div className="space-y-2">
                    <label htmlFor="create-role" className="text-sm font-medium">
                      Role
                    </label>
                    <Select value={createForm.role} onValueChange={(value) => setCreateForm({ ...createForm, role: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Department */}
                  <div className="space-y-2">
                    <label htmlFor="create-dept" className="text-sm font-medium">
                      Department
                    </label>
                    <Select
                      value={createForm.departmentId}
                      onValueChange={(value) =>
                        setCreateForm({
                          ...createForm,
                          departmentId: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Department</SelectItem>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
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
                  {createLoading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Creating...
                    </span>
                  ) : (
                    <span>Create Employee</span>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-2 shadow-md overflow-hidden dark:border-white/10">
        <div className="h-1 w-full bg-orange-500"></div>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-orange-500/10 text-orange-500 dark:bg-orange-500/20 dark:text-orange-500">
              <Filter className="h-5 w-5" />
            </div>
            Search & Filter
          </CardTitle>
          <CardDescription>Find employees by name, department, or role</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex-1 min-w-[200px]">
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
            <div className="flex-1 min-w-[200px]">
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
            <div className="flex-1 min-w-[200px]">
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
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => requestSort("name")}
                      className={`${sortConfig.key === "name" ? "border-orange-500 bg-orange-500/10 text-orange-700 dark:text-orange-400" : ""}`}
                    >
                      Name{" "}
                      {sortConfig.key === "name" &&
                        (sortConfig.direction === "ascending" ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />)}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Sort by employee name</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => requestSort("role")}
                      className={`${sortConfig.key === "role" ? "border-orange-500 bg-orange-500/10 text-orange-700 dark:text-orange-400" : ""}`}
                    >
                      Role{" "}
                      {sortConfig.key === "role" &&
                        (sortConfig.direction === "ascending" ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />)}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Sort by role</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* EMPLOYEES TABLE */}
      <Card className="border-2 shadow-md overflow-hidden dark:border-white/10">
        <div className="h-1 w-full bg-orange-500"></div>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-orange-500/10 text-orange-500 dark:bg-orange-500/20 dark:text-orange-500">
              <Users className="h-5 w-5" />
            </div>
            Employees
          </CardTitle>
          <CardDescription>Manage your organization's employees</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer" onClick={() => requestSort("name")}>
                    <div className="flex items-center">
                      Name{" "}
                      {sortConfig.key === "name" &&
                        (sortConfig.direction === "ascending" ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />)}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => requestSort("email")}>
                    <div className="flex items-center">
                      Email{" "}
                      {sortConfig.key === "email" &&
                        (sortConfig.direction === "ascending" ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />)}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => requestSort("role")}>
                    <div className="flex items-center">
                      Role{" "}
                      {sortConfig.key === "role" &&
                        (sortConfig.direction === "ascending" ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />)}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => requestSort("department")}>
                    <div className="flex items-center">
                      Department{" "}
                      {sortConfig.key === "department" &&
                        (sortConfig.direction === "ascending" ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />)}
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Skeleton className="h-6 w-full" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-6 w-full" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-6 w-full" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-6 w-full" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-6 w-20 ml-auto" />
                        </TableCell>
                      </TableRow>
                    ))
                ) : getFilteredAndSortedEmployees().length > 0 ? (
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
                          className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center">
                              <div className="w-2 h-2 rounded-full bg-orange-500 mr-2"></div>
                              <span className="capitalize">{fullName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Mail className="h-3 w-3 mr-1 text-orange-500" />
                              {emp.email}
                            </div>
                          </TableCell>
                          <TableCell>{getRoleBadge(emp.role)}</TableCell>
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
                              <TooltipProvider delayDuration={300}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEditEmployee(emp)}
                                      className="text-orange-700 hover:bg-orange-500/10 dark:text-orange-400 dark:hover:bg-orange-500/20"
                                    >
                                      <Edit3 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Edit employee</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                              <TooltipProvider delayDuration={300}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteEmployee(emp)}
                                      className="text-red-500 hover:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Delete employee</p>
                                  </TooltipContent>
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
                    <TableCell colSpan={5} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <div className="w-16 h-16 bg-black/5 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Users className="h-8 w-8 text-orange-500/50" />
                        </div>
                        <p>No employees found matching your filters.</p>
                        {(filters.name || filters.department || filters.role) && (
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

      {/* EDIT EMPLOYEE MODAL */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="border-2 dark:border-white/10">
          <div className="h-1 w-full bg-orange-500 -mt-6 mb-4"></div>
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
              {/* First Name */}
              <div className="space-y-2">
                <label htmlFor="edit-firstName" className="text-sm font-medium">
                  First Name
                </label>
                <Input
                  id="edit-firstName"
                  value={editForm.firstName}
                  onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                  placeholder="Enter first name"
                />
              </div>
              {/* Last Name */}
              <div className="space-y-2">
                <label htmlFor="edit-lastName" className="text-sm font-medium">
                  Last Name
                </label>
                <Input
                  id="edit-lastName"
                  value={editForm.lastName}
                  onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                  placeholder="Enter last name"
                />
              </div>
            </div>
            {/* Email */}
            <div className="space-y-2">
              <label htmlFor="edit-email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                placeholder="Enter email address"
              />
            </div>
            {/* Password (optional if left blank) */}
            <div className="space-y-2">
              <label htmlFor="edit-password" className="text-sm font-medium">
                New Password
              </label>
              <Input
                id="edit-password"
                type="password"
                placeholder="(Leave blank to keep current)"
                value={editForm.password}
                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {/* Role */}
              <div className="space-y-2">
                <label htmlFor="edit-role" className="text-sm font-medium">
                  Role
                </label>
                <Select value={editForm.role} onValueChange={(value) => setEditForm({ ...editForm, role: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Department */}
              <div className="space-y-2">
                <label htmlFor="edit-dept" className="text-sm font-medium">
                  Department
                </label>
                <Select
                  value={editForm.departmentId}
                  onValueChange={(value) =>
                    setEditForm({
                      ...editForm,
                      departmentId: value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Department</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
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
              {editLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Saving...
                </span>
              ) : (
                <span>Save Changes</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION MODAL */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="sm:max-w-md border-2 border-red-200 dark:border-red-800/50">
          <div className="h-1 w-full bg-red-500 -mt-6 mb-4"></div>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400">
                <AlertCircle className="h-5 w-5" />
              </div>
              Delete Employee
            </DialogTitle>
            <DialogDescription>Are you sure you want to delete this employee? This action cannot be undone.</DialogDescription>
          </DialogHeader>

          {employeeToDelete && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 my-4">
              <p className="text-sm text-red-600 dark:text-red-400">
                You are about to delete the employee{" "}
                <span className="font-bold">
                  {employeeToDelete.profile?.firstName} {employeeToDelete.profile?.lastName}
                </span>{" "}
                with email <span className="font-bold">{employeeToDelete.email}</span>.
              </p>
            </div>
          )}

          <DialogFooter className="flex justify-between sm:justify-between">
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              className="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800/50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteEmployee} className="bg-red-500 hover:bg-red-600">
              {deleteLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Deleting...
                </span>
              ) : (
                <span>Delete Employee</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ManageEmployees;
