"use client";

import { useEffect, useState } from "react";
import { Trash2, Edit3, PlusCircle, ChevronDown, ChevronUp, Search, Building, Users, UserCheck, AlertCircle } from "lucide-react";
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
import { motion, AnimatePresence } from "framer-motion";

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
            toast.message("User profile or company not found.");
          }
        })
        .catch((err) => {
          console.error("Error fetching profile:", err);
          setError("Failed to fetch profile.");
          toast.message("Failed to fetch profile.");
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

  // Fetch all departments; the server uses the token's companyId
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
        toast.message(data.error || "Failed to fetch departments.");
      }
    } catch (err) {
      console.error("Error fetching departments:", err);
      setError("Something went wrong while fetching departments.");
      toast.message("Failed to fetch departments.");
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
        toast.message("Failed to fetch supervisors.");
      }
    } catch (err) {
      console.error("Error fetching supervisors:", err);
      toast.message("Failed to fetch supervisors.");
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
        toast.message(data.error);
      } else {
        await fetchDepartments();
        setCreateDeptForm({ name: "", supervisorId: "" });
        setShowCreateModal(false);
        toast.message("Department created successfully");
      }
    } catch (err) {
      console.error("Error creating department:", err);
      setError("Failed to create department.");
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
        toast.message(data.error);
      } else {
        await fetchDepartments();
        setShowEditModal(false);
        toast.message("Department updated successfully");
      }
    } catch (err) {
      console.error("Error updating department:", err);
      setError("Failed to update department.");
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
        toast.message(data.error);
      } else {
        setDepartments((prev) => prev.filter((dept) => dept.id !== departmentToDelete));
        toast.message("Department deleted successfully");
      }
    } catch (err) {
      console.error("Error deleting department:", err);
      setError("Failed to delete department.");
      toast.message("Failed to delete department");
    }
    setLoading(false);
    setShowDeleteModal(false);
    setDepartmentToDelete(null);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-8">
      <Toaster position="top-center" />

      {/* Header with Create button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Building className="h-7 w-7 text-orange-500" />
            Manage Departments
          </h2>
          <p className="text-muted-foreground mt-1">Create and manage your company's departments</p>
        </div>
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogTrigger asChild>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white font-semibold">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Department
            </Button>
          </DialogTrigger>
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
                  onChange={(e) => setCreateDeptForm({ ...createDeptForm, name: e.target.value })}
                  className="col-span-3"
                  placeholder="Enter department name"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="dept-supervisor" className="text-right font-medium text-sm">
                  Supervisor
                </label>
                <Select value={createDeptForm.supervisorId} onValueChange={(value) => setCreateDeptForm({ ...createDeptForm, supervisorId: value })}>
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
                {loading ? (
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
                  <span>Create Department</span>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats and Filters Card */}
      <Card className="border-2 shadow-md overflow-hidden dark:border-white/10">
        <div className="h-1 w-full bg-orange-500"></div>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-orange-500/10 text-orange-500 dark:bg-orange-500/20 dark:text-orange-500">
              <Search className="h-5 w-5" />
            </div>
            Search & Filter
          </CardTitle>
          <CardDescription>Find departments by name or supervisor</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex-1 min-w-[200px]">
              <div className="flex items-center border rounded-md px-3 py-2 bg-black/5 dark:bg-white/5">
                <Search className="h-4 w-4 mr-2 text-muted-foreground" />
                <Input
                  placeholder="Filter by department name"
                  value={filters.name}
                  onChange={(e) => handleFilterChange("name", e.target.value)}
                  className="border-0 h-8 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            </div>
            <div className="flex-1 min-w-[200px]">
              <div className="flex items-center border rounded-md px-3 py-2 bg-black/5 dark:bg-white/5">
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
              Showing {getSortedAndFilteredDepartments().length} of {departments.length} departments
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
                      Name {getSortDirectionIcon("name")}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Sort by department name</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => requestSort("userCount")}
                      className={`${sortConfig.key === "userCount" ? "border-orange-500 bg-orange-500/10 text-orange-700 dark:text-orange-400" : ""}`}
                    >
                      Users {getSortDirectionIcon("userCount")}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Sort by user count</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Departments Table */}
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
                {loading ? (
                  [...Array(5)].map((_, i) => (
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
                        <Skeleton className="h-6 w-20 ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : getSortedAndFilteredDepartments().length > 0 ? (
                  <AnimatePresence>
                    {getSortedAndFilteredDepartments().map((dept) => (
                      <motion.tr
                        key={dept.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            <div className="w-2 h-2 rounded-full bg-orange-500 mr-2"></div>
                            <span className="capitalize">{dept.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {dept.supervisor ? (
                            <div className="flex items-center">
                              <div className="w-7 h-7 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center mr-2">
                                <UserCheck className="h-4 w-4 text-orange-500" />
                              </div>
                              <span>{`${dept.supervisor.profile.firstName || ""} ${dept.supervisor.profile.lastName || ""}`.trim()}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">No supervisor assigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-orange-500 hover:bg-orange-600 text-white">
                            <Users className="h-3 w-3 mr-1" />
                            {dept._count?.users ?? 0}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
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
                                <TooltipContent>
                                  <p>Edit department</p>
                                </TooltipContent>
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
                                <TooltipContent>
                                  <p>Delete department</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center">
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

      {/* Edit Department Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="border-2 dark:border-white/10">
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
                onChange={(e) => setEditDeptForm({ ...editDeptForm, name: e.target.value })}
                className="col-span-3"
                placeholder="Enter department name"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="edit-supervisor" className="text-right font-medium text-sm">
                Supervisor
              </label>
              <Select value={editDeptForm.supervisorId} onValueChange={(value) => setEditDeptForm({ ...editDeptForm, supervisorId: value })}>
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
              {loading ? (
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

      {/* Delete confirmation dialog */}
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
              {loading ? (
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
                <span>Delete Department</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ManageDepartments;
