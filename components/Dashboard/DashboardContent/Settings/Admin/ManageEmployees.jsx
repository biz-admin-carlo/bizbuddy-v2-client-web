"use client";

import React, { useEffect, useState } from "react";
import { Trash2, Edit3, PlusCircle, ChevronDown, ChevronUp, Search } from "lucide-react";
import { toast, Toaster } from "sonner";
import useAuthStore from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ConfirmationModal } from "@/components/ui/ConfirmationModa";

// If you prefer a custom <Select> or just <select>, adjust accordingly
// (Here, we’ll just use a native <select> for role/department to mirror your code style.)

function ManageEmployees() {
  const { token } = useAuthStore();

  // CORE DATA
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);

  // UI/STATE
  const [loading, setLoading] = useState(false);
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

  // DELETE - show/hide confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);

  // SORTING
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });

  // FILTERING
  const [filters, setFilters] = useState({
    name: "",
    department: "",
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
        toast.error(data.error || "Failed to fetch employees.");
      }
    } catch (err) {
      console.error("Error fetching employees:", err);
      setError("Something went wrong while fetching employees.");
      toast.error("Failed to fetch employees.");
    }
    setLoading(false);
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
        toast.error(data.error || "Failed to fetch departments.");
      }
    } catch (err) {
      console.error("Error fetching departments:", err);
      toast.error("Failed to fetch departments.");
    }
  }

  // 2) FILTERS
  function handleFilterChange(field, value) {
    setFilters({ ...filters, [field]: value });
  }

  function clearFilters() {
    setFilters({ name: "", department: "" });
  }

  // 3) SORT
  function requestSort(key) {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  }

  function getSortIcon(key) {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === "ascending" ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />;
  }

  function getFilteredAndSortedEmployees() {
    // Filter
    let filtered = employees.filter((emp) => {
      // fullName from first + last
      const fullName = `${emp.profile?.firstName || ""} ${emp.profile?.lastName || ""}`.trim().toLowerCase();

      // department name
      const deptName = emp.department?.name?.toLowerCase() || "";

      const matchesName = !filters.name || fullName.includes(filters.name.toLowerCase());
      const matchesDept = !filters.department || deptName.includes(filters.department.toLowerCase());

      return matchesName && matchesDept;
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
    setLoading(true);
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
        toast.success("Employee created successfully");
        setShowCreateModal(false);
        await fetchEmployees();
      } else {
        toast.error(data.error || "Failed to create employee");
      }
    } catch (err) {
      console.error("Error creating employee:", err);
      toast.error("Failed to create employee");
    }
    setLoading(false);
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
    setLoading(true);
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
        toast.success("Employee updated successfully");
        setShowEditModal(false);
        await fetchEmployees();
      } else {
        toast.error(data.error || "Failed to update employee");
      }
    } catch (err) {
      console.error("Error updating employee:", err);
      toast.error("Failed to update employee");
    }
    setLoading(false);
  }

  // 6) DELETE
  function handleDeleteEmployee(empId) {
    setEmployeeToDelete(empId);
    setShowDeleteModal(true);
  }

  async function confirmDeleteEmployee() {
    if (!employeeToDelete) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/employee/${employeeToDelete}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Employee deleted successfully");
        // remove from local state
        setEmployees((prev) => prev.filter((e) => e.id !== employeeToDelete));
      } else {
        toast.error(data.error || "Failed to delete employee");
      }
    } catch (err) {
      console.error("Error deleting employee:", err);
      toast.error("Failed to delete employee");
    }
    setLoading(false);
    setShowDeleteModal(false);
    setEmployeeToDelete(null);
  }

  return (
    <div className="flex justify-center items-center w-full">
      <div className="space-y-6 max-w-7xl w-full">
        <Toaster position="top-center" />

        {/* Header + Create */}
        <div className="flex justify-between items-center">
          <h2 className="md:text-3xl font-bold tracking-tight text-xl">Manage Employees</h2>
          {/* Create Employee Dialog */}
          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenCreateModal} className="bg-gradient-to-r rounded-xl from-orange-500 to-orange-600 font-semibold text-slate-100">
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Employee
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Employee</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {/* First Name */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="create-firstName" className="text-right">
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
                    className="col-span-3"
                  />
                </div>
                {/* Last Name */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="create-lastName" className="text-right">
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
                    className="col-span-3"
                  />
                </div>
                {/* Email */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="create-email" className="text-right">
                    Email
                  </label>
                  <Input
                    id="create-email"
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                {/* Password */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="create-password" className="text-right">
                    Password
                  </label>
                  <Input
                    id="create-password"
                    type="password"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                {/* Role */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="create-role" className="text-right">
                    Role
                  </label>
                  <select
                    id="create-role"
                    className="col-span-3 border rounded px-2 py-1"
                    value={createForm.role}
                    onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                  >
                    <option value="employee">Employee</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                {/* Department */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="create-dept" className="text-right">
                    Department
                  </label>
                  <select
                    id="create-dept"
                    className="col-span-3 border rounded px-2 py-1"
                    value={createForm.departmentId}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        departmentId: e.target.value,
                      })
                    }
                  >
                    <option value="">No Department</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateEmployee} disabled={loading} className="bg-gradient-to-r from-orange-500 to-orange-600 font-semibold">
                  Create
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="flex items-center border rounded-md px-3 py-1">
            <Search className="h-4 w-4 mr-2" />
            <Input
              placeholder="Filter by name"
              value={filters.name}
              onChange={(e) => handleFilterChange("name", e.target.value)}
              className="border-0 h-8"
            />
          </div>
          <div className="flex items-center border rounded-md px-3 py-1">
            <Search className="h-4 w-4 mr-2" />
            <Input
              placeholder="Filter by department"
              value={filters.department}
              onChange={(e) => handleFilterChange("department", e.target.value)}
              className="border-0 h-8"
            />
          </div>
          {(filters.name || filters.department) && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear Filters
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (!token) return;
              fetchEmployees();
            }}
          >
            Refresh
          </Button>
        </div>

        {/* EMPLOYEES TABLE */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer" onClick={() => requestSort("name")}>
                  <div className="flex items-center">Name {getSortIcon("name")}</div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => requestSort("email")}>
                  <div className="flex items-center">Email {getSortIcon("email")}</div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => requestSort("role")}>
                  <div className="flex items-center">Role {getSortIcon("role")}</div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => requestSort("department")}>
                  <div className="flex items-center">Department {getSortIcon("department")}</div>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    Loading employees...
                  </TableCell>
                </TableRow>
              ) : getFilteredAndSortedEmployees().length > 0 ? (
                getFilteredAndSortedEmployees().map((emp) => {
                  const fullName = `${emp.profile?.firstName || ""} ${emp.profile?.lastName || ""}`.trim();
                  return (
                    <TableRow key={emp.id}>
                      <TableCell className="capitalize">{fullName}</TableCell>
                      <TableCell>{emp.email}</TableCell>
                      <TableCell className="capitalize">{emp.role}</TableCell>
                      <TableCell className="capitalize">{emp.department ? emp.department.name : "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleEditEmployee(emp)}>
                          <Edit3 className="h-5 w-5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteEmployee(emp.id)}>
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    No employees found matching your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* EDIT EMPLOYEE MODAL */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* First Name */}
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="edit-firstName" className="text-right">
                First Name
              </label>
              <Input
                id="edit-firstName"
                value={editForm.firstName}
                onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                className="col-span-3"
              />
            </div>
            {/* Last Name */}
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="edit-lastName" className="text-right">
                Last Name
              </label>
              <Input
                id="edit-lastName"
                value={editForm.lastName}
                onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                className="col-span-3"
              />
            </div>
            {/* Email */}
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="edit-email" className="text-right">
                Email
              </label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="col-span-3"
              />
            </div>
            {/* Password (optional if left blank) */}
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="edit-password" className="text-right">
                New Password
              </label>
              <Input
                id="edit-password"
                type="password"
                placeholder="(Leave blank to keep current)"
                value={editForm.password}
                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                className="col-span-3"
              />
            </div>
            {/* Role */}
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="edit-role" className="text-right">
                Role
              </label>
              <select
                id="edit-role"
                className="col-span-3 border rounded px-2 py-1"
                value={editForm.role}
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
              >
                <option value="employee">Employee</option>
                <option value="supervisor">Supervisor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {/* Department */}
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="edit-dept" className="text-right">
                Department
              </label>
              <select
                id="edit-dept"
                className="col-span-3 border rounded px-2 py-1"
                value={editForm.departmentId}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    departmentId: e.target.value,
                  })
                }
              >
                <option value="">No Department</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={loading} className="bg-gradient-to-r from-orange-500 to-orange-600 font-semibold text-sm">
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION MODAL */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDeleteEmployee}
        title="Delete Employee"
        description="Are you sure you want to delete this employee? This action cannot be undone."
      />
    </div>
  );
}

export default ManageEmployees;
