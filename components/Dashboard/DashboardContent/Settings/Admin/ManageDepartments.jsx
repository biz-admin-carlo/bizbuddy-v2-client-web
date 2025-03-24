"use client";

import { useEffect, useState } from "react";
import { Trash2, Edit3, PlusCircle, ChevronDown, ChevronUp, Search } from "lucide-react";
import { toast, Toaster } from "sonner";
import useAuthStore from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmationModal } from "@/components/ui/ConfirmationModa";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

function ManageDepartments() {
  const { token } = useAuthStore();
  const [profileData, setProfileData] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form state for creating a department
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createDeptForm, setCreateDeptForm] = useState({
    name: "",
    supervisorId: "",
  });

  // Form state for editing a department
  const [showEditModal, setShowEditModal] = useState(false);
  const [editDeptForm, setEditDeptForm] = useState({
    id: "",
    name: "",
    supervisorId: "",
  });

  // Delete confirmation state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState(null);

  // Sorting and filtering state
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [filters, setFilters] = useState({ name: "", supervisor: "" });

  // Use your API base URL from environment variables
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  // 1. Fetch the signed‑in user's profile from the correct endpoint
  useEffect(() => {
    if (token) {
      fetch(`${API_URL}/api/account/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data && data.data && data.data.company && data.data.company.id) {
            setProfileData(data.data);
          } else {
            setError("User profile or company not found.");
            toast.error("User profile or company not found.");
          }
        })
        .catch((err) => {
          console.error("Error fetching profile:", err);
          setError("Failed to fetch profile.");
          toast.error("Failed to fetch profile.");
        });
    }
  }, [token, API_URL]);

  // 2. Once the profile is loaded, fetch departments and supervisors
  useEffect(() => {
    if (token && profileData?.company?.id) {
      fetchDepartments();
      fetchSupervisors();
    }
  }, [token, profileData, API_URL]);

  // Fetch all departments; the server uses the token’s companyId
  const fetchDepartments = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/departments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data && data.data) {
        setDepartments(data.data);
      } else {
        setError(data.error || "Failed to fetch departments.");
        toast.error(data.error || "Failed to fetch departments.");
      }
    } catch (err) {
      console.error("Error fetching departments:", err);
      setError("Something went wrong while fetching departments.");
      toast.error("Failed to fetch departments.");
    }
    setLoading(false);
  };

  // Fetch supervisors by filtering employees with role "supervisor"
  const fetchSupervisors = async () => {
    try {
      const res = await fetch(`${API_URL}/api/employee`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data && data.data) {
        const onlySupervisors = data.data.filter((u) => u.role.toLowerCase() === "supervisor");
        setSupervisors(onlySupervisors);
      } else {
        toast.error("Failed to fetch supervisors.");
      }
    } catch (err) {
      console.error("Error fetching supervisors:", err);
      toast.error("Failed to fetch supervisors.");
    }
  };

  // 3. Sorting and filtering functions for departments
  const requestSort = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const getSortDirectionIcon = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === "ascending" ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />;
  };

  const getSortedAndFilteredDepartments = () => {
    const filtered = departments.filter((dept) => {
      const matchesName = !filters.name || dept.name.toLowerCase().includes(filters.name.toLowerCase());
      const supervisorName = dept.supervisor ? `${dept.supervisor.profile.firstName || ""} ${dept.supervisor.profile.lastName || ""}`.trim() : "";
      const matchesSupervisor = !filters.supervisor || supervisorName.toLowerCase().includes(filters.supervisor.toLowerCase());
      return matchesName && matchesSupervisor;
    });
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aVal, bVal;
        if (sortConfig.key === "name") {
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
        } else if (sortConfig.key === "supervisor") {
          aVal = a.supervisor ? `${a.supervisor.profile.firstName || ""} ${a.supervisor.profile.lastName || ""}`.toLowerCase() : "";
          bVal = b.supervisor ? `${b.supervisor.profile.firstName || ""} ${b.supervisor.profile.lastName || ""}`.toLowerCase() : "";
        } else if (sortConfig.key === "userCount") {
          aVal = a._count ? a._count.users : 0;
          bVal = b._count ? b._count.users : 0;
        }
        if (aVal < bVal) return sortConfig.direction === "ascending" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "ascending" ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  };

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
  };

  const clearAllFilters = () => {
    setFilters({ name: "", supervisor: "" });
  };

  // 4. Department Create / Update / Delete Functions
  const handleCreateDepartment = async () => {
    if (!profileData?.company?.id) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/departments/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: createDeptForm.name,
          supervisorId: createDeptForm.supervisorId || null,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        toast.error(data.error);
      } else {
        await fetchDepartments();
        setCreateDeptForm({ name: "", supervisorId: "" });
        setShowCreateModal(false);
        toast.success("Department created successfully");
      }
    } catch (err) {
      console.error("Error creating department:", err);
      setError("Failed to create department.");
      toast.error("Failed to create department");
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
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/departments/update/${editDeptForm.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editDeptForm.name,
          supervisorId: editDeptForm.supervisorId || null,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        toast.error(data.error);
      } else {
        await fetchDepartments();
        setShowEditModal(false);
        toast.success("Department updated successfully");
      }
    } catch (err) {
      console.error("Error updating department:", err);
      setError("Failed to update department.");
      toast.error("Failed to update department");
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
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/departments/delete/${departmentToDelete}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        toast.error(data.error);
      } else {
        setDepartments((prev) => prev.filter((dept) => dept.id !== departmentToDelete));
        toast.success("Department deleted successfully");
      }
    } catch (err) {
      console.error("Error deleting department:", err);
      setError("Failed to delete department.");
      toast.error("Failed to delete department");
    }
    setLoading(false);
    setShowDeleteModal(false);
    setDepartmentToDelete(null);
  };

  return (
    <div className="flex justify-center items-center w-full">
      <div className="space-y-6 max-w-7xl w-full">
        <Toaster position="top-center" />

        {/* Header with Create button */}
        <div className="flex justify-between items-center">
          <h2 className="md:text-3xl font-bold tracking-tight text-xl">Manage Departments</h2>
          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r rounded-xl from-orange-500 to-orange-600 font-semibold text-nowrap text-slate-100">
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Department
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Department</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="dept-name" className="text-right">
                    Name
                  </label>
                  <Input
                    id="dept-name"
                    value={createDeptForm.name}
                    onChange={(e) => setCreateDeptForm({ ...createDeptForm, name: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="dept-supervisor" className="text-right">
                    Supervisor
                  </label>
                  <select
                    id="dept-supervisor"
                    className="col-span-3 border rounded px-2 py-1"
                    value={createDeptForm.supervisorId}
                    onChange={(e) =>
                      setCreateDeptForm({
                        ...createDeptForm,
                        supervisorId: e.target.value,
                      })
                    }
                  >
                    <option value="">No Supervisor</option>
                    {supervisors.map((sup) => (
                      <option key={sup.id} value={sup.id}>
                        {sup.username}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateDepartment} disabled={loading} className="bg-gradient-to-r from-orange-500 to-orange-600 font-semibold">
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
              placeholder="Filter by department name"
              value={filters.name}
              onChange={(e) => handleFilterChange("name", e.target.value)}
              className="border-0 h-8"
            />
          </div>
          <div className="flex items-center border rounded-md px-3 py-1">
            <Search className="h-4 w-4 mr-2" />
            <Input
              placeholder="Filter by supervisor username"
              value={filters.supervisor}
              onChange={(e) => handleFilterChange("supervisor", e.target.value)}
              className="border-0 h-8"
            />
          </div>
          {(filters.name || filters.supervisor) && (
            <Button variant="outline" size="sm" onClick={clearAllFilters}>
              Clear Filters
            </Button>
          )}
        </div>

        {/* Departments Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer" onClick={() => requestSort("name")}>
                  <div className="flex items-center">Department Name {getSortDirectionIcon("name")}</div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => requestSort("supervisor")}>
                  <div className="flex items-center">Supervisor {getSortDirectionIcon("supervisor")}</div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => requestSort("userCount")}>
                  <div className="flex items-center">User Count {getSortDirectionIcon("userCount")}</div>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {getSortedAndFilteredDepartments().length > 0 ? (
                getSortedAndFilteredDepartments().map((dept) => (
                  <TableRow key={dept.id}>
                    <TableCell className="capitalize">{dept.name}</TableCell>
                    <TableCell>
                      {dept.supervisor ? `${dept.supervisor.profile.firstName || ""} ${dept.supervisor.profile.lastName || ""}`.trim() : "—"}
                    </TableCell>
                    <TableCell>{dept._count?.users ?? 0}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleEditDepartment(dept)}>
                        <Edit3 className="h-5 w-5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteDepartment(dept.id)}>
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    No departments found matching your filters
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Edit Department Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="edit-name" className="text-right">
                Name
              </label>
              <Input
                id="edit-name"
                value={editDeptForm.name}
                onChange={(e) => setEditDeptForm({ ...editDeptForm, name: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="edit-supervisor" className="text-right">
                Supervisor
              </label>
              <select
                id="edit-supervisor"
                className="col-span-3 border rounded px-2 py-1"
                value={editDeptForm.supervisorId}
                onChange={(e) =>
                  setEditDeptForm({
                    ...editDeptForm,
                    supervisorId: e.target.value,
                  })
                }
              >
                <option value="">No Supervisor</option>
                {supervisors.map((sup) => (
                  <option key={sup.id} value={sup.id}>
                    {sup.username}
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

      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDeleteDepartment}
        title="Delete Department"
        description="Are you sure you want to delete this department? This action cannot be undone."
      />
    </div>
  );
}

export default ManageDepartments;
