// components/Dashboard/DashboardContent/CompanyPanel/PunchlogsB&OvertimesB&Leaves/EmployeeCutoff.jsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Plus,
  Eye,
  Lock,
  Unlock,
  CheckCircle2,
  XCircle,
  Download,
  MoreVertical,
  Search,
  Clock,
  AlertCircle,
  Check,
  X,
  Users,
  TrendingUp,
  TrendingDown,
  Filter,
  Coffee,
  Utensils,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import useAuthStore from "@/store/useAuthStore";

export default function EmployeeCutoff() {
  const { token } = useAuthStore();

  // State management
  const [cutoffPeriods, setCutoffPeriods] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingApprovals, setIsLoadingApprovals] = useState(false); 
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    locked: 0,
    processed: 0,
  });

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    periodStart: "",
    periodEnd: "",
    paymentDate: "",
    frequency: "bi-weekly",
  });

  // Selected cutoff and approvals
  const [selectedCutoff, setSelectedCutoff] = useState(null);
  const [approvals, setApprovals] = useState([]);
  const [selectedApprovals, setSelectedApprovals] = useState([]);
  const [summaryData, setSummaryData] = useState(null);
  const [gracePeriodMinutes, setGracePeriodMinutes] = useState(15);

  // Filters and search
  const [searchEmployee, setSearchEmployee] = useState("");
  const [filterLate, setFilterLate] = useState(false);
  const [filterEarly, setFilterEarly] = useState(false);
  const [filterOvertime, setFilterOvertime] = useState(false);
  const [filterNoSchedule, setFilterNoSchedule] = useState(false);
  const [sortBy, setSortBy] = useState("date");
  const [approvalStatus, setApprovalStatus] = useState("pending"); 
  const [loadingActions, setLoadingActions] = useState({});
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  // Table filters
  const [searchPeriod, setSearchPeriod] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Fetch cutoff periods
  const fetchCutoffPeriods = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/cutoff-periods`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setCutoffPeriods(data.data || []);

        const stats = {
          total: data.data.length,
          open: data.data.filter((p) => p.status === "open").length,
          locked: data.data.filter((p) => p.status === "locked").length,
          processed: data.data.filter((p) => p.status === "processed").length,
        };
        setStats(stats);
      }
    } catch (error) {
      console.error("Error fetching cutoff periods:", error);
      toast.error("Failed to load cutoff periods");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCutoffPeriods();
  }, [token]);

  // Create cutoff period
  const handleCreateCutoff = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/cutoff-periods/create`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      );

      if (response.ok) {
        toast.success("Cutoff period created successfully");
        setIsCreateModalOpen(false);
        setFormData({
          periodStart: "",
          periodEnd: "",
          paymentDate: "",
          frequency: "bi-weekly",
        });
        fetchCutoffPeriods();
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to create cutoff period");
      }
    } catch (error) {
      console.error("Error creating cutoff:", error);
      toast.error("Failed to create cutoff period");
    }
  };

  const handleViewApprovals = async (cutoff, status = "pending") => {
    try {
      setSelectedCutoff(cutoff);
      setIsApprovalModalOpen(true);
      setApprovals([]);
      setSelectedApprovals([]);
      setIsLoadingApprovals(true);
      setApprovalStatus(status);
  
      // ✅ DYNAMIC ENDPOINT based on status
      const endpoint = status === "pending" 
        ? `/api/cutoff-periods/${cutoff.id}/approvals/pending`
        : `/api/cutoff-periods/${cutoff.id}/approvals?status=${status}`;
  
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}${endpoint}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
  
      if (response.ok) {
        const data = await response.json();
        setApprovals(data.data || []);
        setGracePeriodMinutes(data.gracePeriodMinutes || 15);
      }
    } catch (error) {
      console.error("Error fetching approvals:", error);
      toast.error("Failed to load approvals");
    } finally {
      setIsLoadingApprovals(false);
    }
  };

  // View summary
  const handleViewSummary = async (cutoff) => {
    try {
      setSelectedCutoff(cutoff);
      setIsSummaryModalOpen(true);
      setSummaryData(null);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/cutoff-periods/${cutoff.id}/summary`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSummaryData(data.data);
      }
    } catch (error) {
      console.error("Error fetching summary:", error);
      toast.error("Failed to load summary");
    }
  };

  // Bulk approve/reject
    const handleBulkAction = async (action) => {
    if (selectedApprovals.length === 0) {
        toast.error("Please select at least one time log");
        return;
    }

    setIsBulkLoading(true); 
    try {
        const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/cutoff-periods/${selectedCutoff.id}/approvals/bulk`,
        {
            method: "PATCH",
            headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            },
            body: JSON.stringify({
            timeLogIds: selectedApprovals,
            action,
            }),
        }
        );

        if (response.ok) {
        toast.success(
            `${selectedApprovals.length} time log(s) ${action}d successfully`
        );
        setSelectedApprovals([]);
        handleViewApprovals(selectedCutoff, approvalStatus);
        fetchCutoffPeriods();
        } else {
        const error = await response.json();
        toast.error(error.message || `Failed to ${action}`);
        }
    } catch (error) {
        console.error(`Error ${action}ing:`, error);
        toast.error(`Failed to ${action}`);
    } finally {
        setIsBulkLoading(false);
    }
    };

  // Toggle selection
  const toggleSelection = (timeLogId) => {
    setSelectedApprovals((prev) =>
      prev.includes(timeLogId)
        ? prev.filter((id) => id !== timeLogId)
        : [...prev, timeLogId]
    );
  };

  // Update cutoff status
  const handleUpdateStatus = async (cutoffId, newStatus) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/cutoff-periods/${cutoffId}/status`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (response.ok) {
        toast.success(`Cutoff period ${newStatus} successfully`);
        fetchCutoffPeriods();
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to update status");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  // Delete cutoff
  const handleDelete = async (cutoffId) => {
    if (!confirm("Are you sure you want to delete this cutoff period?")) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/cutoff-periods/${cutoffId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        toast.success("Cutoff period deleted successfully");
        fetchCutoffPeriods();
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to delete");
      }
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("Failed to delete cutoff period");
    }
  };

  // Helper: Format date/time
  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Helper: Format date only
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // ✅ UPDATED: Get approval details with new payroll summary
  const getApprovalDetails = (approval) => {
    const schedule = approval.schedule;
    const calculated = approval.calculatedData;
    const payroll = approval.payrollSummary; // ✅ NEW
    const breakData = approval.breakData; // ✅ NEW

    const isLate =
      calculated?.lateMinutes > 0 && calculated?.lateStatus === "beyond_grace";

    const leftEarly = calculated?.earlyMinutes > 0;

    let varianceColor = "neutral";
    if (calculated?.variance) {
      if (calculated.variance > 0.5) varianceColor = "blue";
      else if (calculated.variance < -0.25) varianceColor = "red";
      else if (Math.abs(calculated.variance) > 0) varianceColor = "orange";
    }

    const scheduledHours = schedule?.scheduledHours || 0;
    const actualHours = calculated?.actualHours || 0;
    const payableHours = payroll?.payableRegularHours || 
                        schedule?.payableHours || 
                        (scheduledHours === 0 ? actualHours : 0); // ✅ Use actual if no schedule
    
    const approvedOT = calculated?.approvedOTHours || 0;
    const totalPayable = payroll?.totalPayableHours || 
                        (payableHours + approvedOT);

    return {
        hasSchedule: !!schedule,
        scheduledHours,
        payableHours,
        actualHours,
        variance: calculated?.variance || 0,
        approvedOT,
        hasOT: calculated?.hasApprovedOT || false,
        isLate,
        leftEarly,
        lateMinutes: calculated?.lateMinutes || 0,
        earlyMinutes: calculated?.earlyMinutes || 0,
        lateStatus: calculated?.lateStatus,
        varianceColor,
        totalPayable,
        breakData,
    };
  };

  // Filter and sort approvals
  const getFilteredAndSortedApprovals = useMemo(() => {
    let filtered = approvals.filter((approval) => {
      const user = approval.timeLog.user;
      const name = `${user.profile?.firstName || ""} ${
        user.profile?.lastName || user.username
      }`.toLowerCase();
      const email = user.email.toLowerCase();
      const searchLower = searchEmployee.toLowerCase();

      const matchesSearch =
        name.includes(searchLower) || email.includes(searchLower);

      const details = getApprovalDetails(approval);

      const matchesLate = !filterLate || details.isLate;
      const matchesEarly = !filterEarly || details.leftEarly;
      const matchesOT = !filterOvertime || details.hasOT;
      const matchesNoSchedule = !filterNoSchedule || !details.hasSchedule;

      return (
        matchesSearch && matchesLate && matchesEarly && matchesOT && matchesNoSchedule
      );
    });

    filtered.sort((a, b) => {
      if (sortBy === "name") {
        const nameA = `${a.timeLog.user.profile?.firstName || a.timeLog.user.username}`;
        const nameB = `${b.timeLog.user.profile?.firstName || b.timeLog.user.username}`;
        return nameA.localeCompare(nameB);
      } else if (sortBy === "hours") {
        const hoursA = getApprovalDetails(a).actualHours;
        const hoursB = getApprovalDetails(b).actualHours;
        return hoursB - hoursA;
      } else if (sortBy === "variance") {
        const varA = Math.abs(getApprovalDetails(a).variance);
        const varB = Math.abs(getApprovalDetails(b).variance);
        return varB - varA;
      } else {
        return new Date(a.timeLog.timeIn) - new Date(b.timeLog.timeIn);
      }
    });

    return filtered;
  }, [approvals, searchEmployee, filterLate, filterEarly, filterOvertime, filterNoSchedule, sortBy]);

  // Filter periods
  const filteredPeriods = cutoffPeriods.filter((period) => {
    const matchesSearch =
      searchPeriod === "" ||
      period.frequency.toLowerCase().includes(searchPeriod.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || period.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Get active filter count
  const activeFilterCount = [
    filterLate,
    filterEarly,
    filterOvertime,
    filterNoSchedule,
  ].filter(Boolean).length;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-200">
            Employee Cutoff
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            Manage and review payroll cutoff periods
          </p>
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-orange-500 hover:bg-orange-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Cutoff Period
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Total Cutoffs
                  </p>
                  <p className="text-3xl font-bold text-neutral-800 dark:text-neutral-200">
                    {stats.total}
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-neutral-400" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Open</p>
                  <p className="text-3xl font-bold text-green-600">{stats.open}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Locked
                  </p>
                  <p className="text-3xl font-bold text-orange-600">{stats.locked}</p>
                </div>
                <Lock className="w-8 h-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Processed
                  </p>
                  <p className="text-3xl font-bold text-blue-600">{stats.processed}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Cutoff Periods Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Cutoff Periods</CardTitle>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search by frequency..."
                value={searchPeriod}
                onChange={(e) => setSearchPeriod(e.target.value)}
                className="w-64"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="locked">Locked</SelectItem>
                  <SelectItem value="processed">Processed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredPeriods.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 mx-auto text-neutral-300 mb-4" />
              <p className="text-neutral-600 dark:text-neutral-400">
                No cutoff periods found
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 text-sm font-medium text-neutral-600 dark:text-neutral-400">
                      Period
                    </th>
                    <th className="text-left p-3 text-sm font-medium text-neutral-600 dark:text-neutral-400">
                      Payment Date
                    </th>
                    <th className="text-left p-3 text-sm font-medium text-neutral-600 dark:text-neutral-400">
                      Frequency
                    </th>
                    <th className="text-left p-3 text-sm font-medium text-neutral-600 dark:text-neutral-400">
                      Status
                    </th>
                    <th className="text-left p-3 text-sm font-medium text-neutral-600 dark:text-neutral-400">
                      Approvals
                    </th>
                    <th className="text-right p-3 text-sm font-medium text-neutral-600 dark:text-neutral-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPeriods.map((period, index) => (
                    <motion.tr
                      key={period.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                    >
                      <td className="p-3">
                        <div className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                          {formatDate(period.periodStart)} -{" "}
                          {formatDate(period.periodEnd)}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="text-sm text-neutral-600 dark:text-neutral-400">
                          {formatDate(period.paymentDate)}
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline">{period.frequency}</Badge>
                      </td>
                      <td className="p-3">
                        <Badge
                          className={
                            period.status === "open"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : period.status === "locked"
                              ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                          }
                        >
                          {period.status}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-green-100 text-green-700 text-xs">
                            <Check className="w-3 h-3 mr-1" />
                            {period.approvalStats?.approved || 0}
                          </Badge>
                          <Badge className="bg-yellow-100 text-yellow-700 text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            {period.approvalStats?.pending || 0}
                          </Badge>
                          <Badge className="bg-red-100 text-red-700 text-xs">
                            <X className="w-3 h-3 mr-1" />
                            {period.approvalStats?.rejected || 0}
                          </Badge>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewApprovals(period)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Review
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewSummary(period)}
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Summary
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {period.status === "open" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleUpdateStatus(period.id, "locked")
                                  }
                                >
                                  <Lock className="w-4 h-4 mr-2" />
                                  Lock Period
                                </DropdownMenuItem>
                              )}
                              {period.status === "locked" && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleUpdateStatus(period.id, "open")
                                    }
                                  >
                                    <Unlock className="w-4 h-4 mr-2" />
                                    Unlock Period
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleUpdateStatus(period.id, "processed")
                                    }
                                  >
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    Mark as Processed
                                  </DropdownMenuItem>
                                </>
                              )}
                              {period.status !== "processed" && (
                                <DropdownMenuItem
                                  onClick={() => handleDelete(period.id)}
                                  className="text-red-600"
                                >
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Cutoff Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Cutoff Period</DialogTitle>
            <DialogDescription>
              Set up a new payroll cutoff period for employee time tracking
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Period Start Date</Label>
              <Input
                type="date"
                value={formData.periodStart}
                onChange={(e) =>
                  setFormData({ ...formData, periodStart: e.target.value })
                }
              />
            </div>

            <div>
              <Label>Period End Date</Label>
              <Input
                type="date"
                value={formData.periodEnd}
                onChange={(e) =>
                  setFormData({ ...formData, periodEnd: e.target.value })
                }
              />
            </div>

            <div>
              <Label>Payment Date</Label>
              <Input
                type="date"
                value={formData.paymentDate}
                onChange={(e) =>
                  setFormData({ ...formData, paymentDate: e.target.value })
                }
              />
            </div>

            <div>
              <Label>Payment Frequency</Label>
              <Select
                value={formData.frequency}
                onValueChange={(value) =>
                  setFormData({ ...formData, frequency: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bi-weekly">Bi-Weekly (Every 2 weeks)</SelectItem>
                  <SelectItem value="bi-monthly">Bi-Monthly (Twice a month)</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateCutoff}
                className="bg-orange-500 hover:bg-orange-600"
              >
                Create Cutoff
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ENHANCED APPROVAL MODAL - WITH BREAKS + LOADING */}
      <Dialog open={isApprovalModalOpen} onOpenChange={setIsApprovalModalOpen}>
        <DialogContent className="sm:max-w-[1100px] max-h-[90vh] overflow-hidden flex flex-col">

        <DialogHeader className="pb-3">
        <div className="flex items-center justify-between">
            <div>
            <DialogTitle className="text-xl font-bold">
                Review Time Logs
            </DialogTitle>
            <DialogDescription className="mt-1">
                {selectedCutoff &&
                `${formatDate(selectedCutoff.periodStart)} - ${formatDate(
                    selectedCutoff.periodEnd
                )}`}
                {gracePeriodMinutes && (
                <span className="ml-2 text-xs text-orange-600">
                    • {gracePeriodMinutes} min grace period (clock-in only)
                </span>
                )}
            </DialogDescription>
            </div>

            {/* Live Stats */}
            {!isLoadingApprovals && (
            <div className="flex gap-4">
                <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                    {getFilteredAndSortedApprovals.length}
                </p>
                <p className="text-xs text-neutral-500">
                    {approvalStatus === "pending" ? "Pending" : 
                    approvalStatus === "approved" ? "Approved" : "Rejected"}
                </p>
                </div>
                <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                    {getFilteredAndSortedApprovals
                    .reduce(
                        (sum, a) => sum + (getApprovalDetails(a).actualHours || 0),
                        0
                    )
                    .toFixed(1)}
                    h
                </p>
                <p className="text-xs text-neutral-500">Total Hours</p>
                </div>
            </div>
            )}
        </div>
        </DialogHeader>

        <div className="flex items-center gap-2 px-6 pb-3 border-b">
        <Button
            size="sm"
            variant={approvalStatus === "pending" ? "default" : "ghost"}
            onClick={() => handleViewApprovals(selectedCutoff, "pending")}
            className={approvalStatus === "pending" ? "bg-orange-500 hover:bg-orange-600" : ""}
        >
            <Clock className="w-4 h-4 mr-1" />
            Pending ({selectedCutoff?.approvalStats?.pending || 0})
        </Button>
        <Button
            size="sm"
            variant={approvalStatus === "approved" ? "default" : "ghost"}
            onClick={() => handleViewApprovals(selectedCutoff, "approved")}
            className={approvalStatus === "approved" ? "bg-green-500 hover:bg-green-600" : ""}
        >
            <CheckCircle2 className="w-4 h-4 mr-1" />
            Approved ({selectedCutoff?.approvalStats?.approved || 0})
        </Button>
        <Button
            size="sm"
            variant={approvalStatus === "rejected" ? "default" : "ghost"}
            onClick={() => handleViewApprovals(selectedCutoff, "rejected")}
            className={approvalStatus === "rejected" ? "bg-red-500 hover:bg-red-600" : ""}
        >
            <XCircle className="w-4 h-4 mr-1" />
            Rejected ({selectedCutoff?.approvalStats?.rejected || 0})
        </Button>
        </div>

          {/* ✅ LOADING STATE */}
          {isLoadingApprovals ? (
            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {/* Show loading placeholders with employee names */}
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="border rounded-lg p-4 animate-pulse"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-neutral-200 dark:bg-neutral-700" />
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                        <span className="text-sm text-neutral-500">
                          Loading employee data...
                        </span>
                      </div>
                      <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4" />
                      <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2" />
                      <div className="grid grid-cols-2 gap-2">
                        <div className="h-20 bg-neutral-200 dark:bg-neutral-700 rounded" />
                        <div className="h-20 bg-neutral-200 dark:bg-neutral-700 rounded" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : approvals.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="w-16 h-16 mx-auto text-green-500 mb-4" />
              <p className="text-neutral-600 dark:text-neutral-400 font-medium">
                All time logs have been approved!
              </p>
              <p className="text-sm text-neutral-500 mt-2">
                No pending approvals for this cutoff period
              </p>
            </div>
          ) : (
            // Continue with existing content...
            // [Rest of the approval modal content goes here - I'll add in next part due to length]
            <div className="flex-1 overflow-hidden flex flex-col">
              {/* Filters remain the same */}
              <div className="space-y-3 pb-4 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <Input
                    placeholder="Search employees by name or email..."
                    value={searchEmployee}
                    onChange={(e) => setSearchEmployee(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant={filterLate ? "default" : "outline"}
                      onClick={() => setFilterLate(!filterLate)}
                      className={
                        filterLate ? "bg-orange-500 hover:bg-orange-600" : ""
                      }
                    >
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Late Arrivals
                      {filterLate && (
                        <Badge className="ml-2 bg-white text-orange-600 hover:bg-white">
                          {
                            approvals.filter((a) => getApprovalDetails(a).isLate)
                              .length
                          }
                        </Badge>
                      )}
                    </Button>

                    <Button
                      size="sm"
                      variant={filterEarly ? "default" : "outline"}
                      onClick={() => setFilterEarly(!filterEarly)}
                      className={filterEarly ? "bg-red-500 hover:bg-red-600" : ""}
                    >
                      <TrendingDown className="w-3 h-3 mr-1" />
                      Left Early
                      {filterEarly && (
                        <Badge className="ml-2 bg-white text-red-600 hover:bg-white">
                          {
                            approvals.filter((a) => getApprovalDetails(a).leftEarly)
                              .length
                          }
                        </Badge>
                      )}
                    </Button>

                    <Button
                      size="sm"
                      variant={filterOvertime ? "default" : "outline"}
                      onClick={() => setFilterOvertime(!filterOvertime)}
                      className={
                        filterOvertime ? "bg-blue-500 hover:bg-blue-600" : ""
                      }
                    >
                      <TrendingUp className="w-3 h-3 mr-1" />
                      Has OT
                      {filterOvertime && (
                        <Badge className="ml-2 bg-white text-blue-600 hover:bg-white">
                          {
                            approvals.filter((a) => getApprovalDetails(a).hasOT)
                              .length
                          }
                        </Badge>
                      )}
                    </Button>

                    <Button
                      size="sm"
                      variant={filterNoSchedule ? "default" : "outline"}
                      onClick={() => setFilterNoSchedule(!filterNoSchedule)}
                      className={
                        filterNoSchedule ? "bg-amber-500 hover:bg-amber-600" : ""
                      }
                    >
                      <AlertCircle className="w-3 h-3 mr-1" />
                      No Schedule
                      {filterNoSchedule && (
                        <Badge className="ml-2 bg-white text-amber-600 hover:bg-white">
                          {
                            approvals.filter((a) => !getApprovalDetails(a).hasSchedule)
                              .length
                          }
                        </Badge>
                      )}
                    </Button>

                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-[160px] h-8">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">Sort by Date</SelectItem>
                        <SelectItem value="name">Sort by Name</SelectItem>
                        <SelectItem value="hours">Sort by Hours</SelectItem>
                        <SelectItem value="variance">Sort by Variance</SelectItem>
                      </SelectContent>
                    </Select>

                    {activeFilterCount > 0 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setFilterLate(false);
                          setFilterEarly(false);
                          setFilterOvertime(false);
                          setFilterNoSchedule(false);
                        }}
                        className="text-xs"
                      >
                        Clear {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""}
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={
                        selectedApprovals.length ===
                          getFilteredAndSortedApprovals.length &&
                        getFilteredAndSortedApprovals.length > 0
                      }
                      onChange={() => {
                        const filtered = getFilteredAndSortedApprovals;
                        if (selectedApprovals.length === filtered.length) {
                          setSelectedApprovals([]);
                        } else {
                          setSelectedApprovals(filtered.map((a) => a.timeLogId));
                        }
                      }}
                      className="w-4 h-4 rounded border-neutral-300"
                    />
                    <span className="text-sm text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                      {selectedApprovals.length} selected
                    </span>
                  </div>
                </div>
              </div>

                {/* Employee Cards - Scrollable */}
                <div className="flex-1 overflow-y-auto py-4 space-y-3">
                {getFilteredAndSortedApprovals.length === 0 ? (
                    <div className="text-center py-8">
                    <Users className="w-12 h-12 mx-auto text-neutral-300 mb-3" />
                    <p className="text-neutral-600 dark:text-neutral-400">
                        No employees match your filters
                    </p>
                    <Button
                        variant="link"
                        onClick={() => {
                        setSearchEmployee("");
                        setFilterLate(false);
                        setFilterEarly(false);
                        setFilterOvertime(false);
                        setFilterNoSchedule(false);
                        }}
                        className="mt-2"
                    >
                        Clear filters
                    </Button>
                    </div>
                ) : (
                    getFilteredAndSortedApprovals.map((approval, index) => {
                    const user = approval.timeLog.user;
                    const schedule = approval.schedule;
                    const details = getApprovalDetails(approval);
                    const breakData = details.breakData; // ✅ NEW
                    const isSelected = selectedApprovals.includes(approval.timeLogId);
                    const initials =
                        user.profile?.firstName?.[0] || user.username?.[0] || "?";

                    return (
                        <motion.div
                        key={approval.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className={`relative group border rounded-lg p-4 transition-all ${
                            isSelected
                            ? "border-orange-300 bg-orange-50 dark:border-orange-700 dark:bg-orange-900/20"
                            : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600"
                        }`}
                        >
                        <div className="flex items-start gap-4">
                            {/* Checkbox */}
                            <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelection(approval.timeLogId)}
                            className="mt-1 w-5 h-5 rounded border-neutral-300 focus:ring-orange-500"
                            />

                            {/* Avatar */}
                            <Avatar className="w-12 h-12 border-2 border-white shadow-sm">
                            <AvatarFallback className="bg-gradient-to-br from-orange-400 to-orange-600 text-white font-semibold">
                                {initials.toUpperCase()}
                            </AvatarFallback>
                            </Avatar>

                            {/* Employee Info */}
                            <div className="flex-1 min-w-0 space-y-3">
                            {/* Header Row */}
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                                    {user.profile?.firstName || user.username}{" "}
                                    {user.profile?.lastName || ""}
                                </h4>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
                                    {user.email}
                                </p>
                                </div>
                            </div>

                            {/* ✨ SCHEDULE SECTION */}
                            {schedule ? (
                                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                    <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                                        📅 {schedule.shiftName}
                                    </Badge>
                                    {schedule.crossesMidnight && (
                                        <Badge variant="outline" className="text-xs">
                                        Crosses Midnight
                                        </Badge>
                                    )}
                                    </div>
                                    <Badge
                                    variant="outline"
                                    className="border-purple-300 bg-purple-50 text-purple-700"
                                    >
                                    <Clock className="w-3 h-3 mr-1" />
                                    {details.scheduledHours}h
                                    </Badge>
                                </div>
                                <div className="text-xs text-purple-700 dark:text-purple-300">
                                    <span className="font-medium">Scheduled:</span>{" "}
                                    {formatDateTime(schedule.scheduledStart)} →{" "}
                                    {formatDateTime(schedule.scheduledEnd)}
                                </div>
                                </div>
                            ) : (
                                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
                                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                                    <AlertCircle className="w-4 h-4" />
                                    <span className="text-sm font-medium">
                                    No schedule assigned for this day
                                    </span>
                                </div>
                                </div>
                            )}

                            {/* ✨ ACTUAL TIMES */}
                            <div className="space-y-1">
                                <div className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                                Actual Clock Times:
                                </div>
                                <div className="flex items-center gap-3 text-sm flex-wrap">
                                <div className="flex items-center gap-1">
                                    <span className="text-neutral-500">In:</span>
                                    <span className="font-medium text-neutral-800 dark:text-neutral-200">
                                    {formatDateTime(approval.timeLog.timeIn)}
                                    </span>
                                    {details.isLate && (
                                    <Badge className="ml-1 bg-orange-100 text-orange-700 text-xs px-1.5 py-0">
                                        Late {details.lateMinutes}min
                                    </Badge>
                                    )}
                                    {details.lateStatus === "within_grace" && details.lateMinutes > 0 && (
                                    <Badge className="ml-1 bg-green-100 text-green-700 text-xs px-1.5 py-0">
                                        ✓ Within Grace
                                    </Badge>
                                    )}
                                </div>
                                <span className="text-neutral-400">→</span>
                                <div className="flex items-center gap-1">
                                    <span className="text-neutral-500">Out:</span>
                                    <span className="font-medium text-neutral-800 dark:text-neutral-200">
                                    {approval.timeLog.timeOut
                                        ? formatDateTime(approval.timeLog.timeOut)
                                        : "Not clocked out"}
                                    </span>
                                    {details.leftEarly && (
                                    <Badge className="ml-1 bg-red-100 text-red-700 text-xs px-1.5 py-0">
                                        Left {details.earlyMinutes}min early
                                    </Badge>
                                    )}
                                </div>
                                </div>
                            </div>

                            {/* ✨ BREAK DATA SECTION - NEW! */}
                            {breakData && (breakData.lunch.minutes > 0 || breakData.coffee.totalMinutes > 0) && (
                                <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-lg p-3 border border-cyan-200 dark:border-cyan-800 space-y-2">
                                <div className="flex items-center gap-2 mb-2">
                                    <Clock className="w-4 h-4 text-cyan-700" />
                                    <span className="text-sm font-semibold text-cyan-700 dark:text-cyan-300">
                                    Break Times
                                    </span>
                                </div>

                                {/* Lunch Break */}
                                {breakData.lunch.minutes > 0 && (
                                    <div className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2">
                                        <Utensils className="w-3 h-3 text-neutral-500" />
                                        <span className="text-neutral-600 dark:text-neutral-400">
                                        Lunch Break:
                                        </span>
                                        <span className="font-medium text-neutral-800 dark:text-neutral-200">
                                        {breakData.lunch.minutes} min
                                        </span>
                                        {breakData.lunch.isPaid ? (
                                        <Badge className="bg-green-100 text-green-700 text-xs px-1.5 py-0">
                                            Paid
                                        </Badge>
                                        ) : (
                                        <Badge className="bg-red-100 text-red-700 text-xs px-1.5 py-0">
                                            Unpaid
                                        </Badge>
                                        )}
                                    </div>
                                    {breakData.lunch.deducted && (
                                        <span className="text-red-600 font-medium">
                                        -{(breakData.lunch.minutes / 60).toFixed(2)}h
                                        </span>
                                    )}
                                    </div>
                                )}

                                {/* Coffee Breaks */}
                                {breakData.coffee.totalMinutes > 0 && (
                                    <div className="space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                        <Coffee className="w-3 h-3 text-neutral-500" />
                                        <span className="text-neutral-600 dark:text-neutral-400">
                                            Coffee Breaks:
                                        </span>
                                        <span className="font-medium text-neutral-800 dark:text-neutral-200">
                                            {breakData.coffee.totalMinutes} min
                                        </span>
                                        {breakData.coffee.breaks.length > 0 && (
                                            <span className="text-neutral-500">
                                            ({breakData.coffee.breaks.length} break{breakData.coffee.breaks.length > 1 ? 's' : ''})
                                            </span>
                                        )}
                                        </div>
                                    </div>
                                    
                                    {/* Coffee Policy Check */}
                                    {breakData.coffee.policy && breakData.coffee.policy.hasPolicy && (
                                        <div className="ml-5 text-xs">
                                        {breakData.coffee.policy.exceeded ? (
                                            <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1 text-red-600">
                                                <AlertCircle className="w-3 h-3" />
                                                <span>
                                                Exceeded policy ({breakData.coffee.policy.allowedMinutes} min allowed)
                                                </span>
                                            </div>
                                            <span className="text-red-600 font-medium">
                                                -{(breakData.coffee.policy.excessMinutes / 60).toFixed(2)}h
                                            </span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1 text-green-600">
                                            <Check className="w-3 h-3" />
                                            <span>
                                                Within policy ({breakData.coffee.policy.allowedMinutes} min allowed)
                                            </span>
                                            </div>
                                        )}
                                        </div>
                                    )}
                                    </div>
                                )}

                                {/* Total Deductions */}
                                {breakData.totalDeductions.minutes > 0 && (
                                    <div className="pt-2 border-t border-cyan-300 dark:border-cyan-700">
                                    <div className="flex items-center justify-between text-xs font-semibold">
                                        <span className="text-neutral-700 dark:text-neutral-300">
                                        Total Break Deductions:
                                        </span>
                                        <span className="text-red-600">
                                        -{breakData.totalDeductions.hours}h
                                        </span>
                                    </div>
                                    </div>
                                )}
                                </div>
                            )}

                            {/* ✨ HOURS BREAKDOWN */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-neutral-50 dark:bg-neutral-800 rounded p-2">
                                <div className="text-xs text-neutral-500 mb-1">
                                    Scheduled Hours
                                </div>
                                <div className="text-lg font-bold text-green-600">
                                    {details.scheduledHours}h
                                </div>
                                <div className="text-xs text-neutral-500">
                                    (shift template)
                                </div>
                                </div>
                                <div className="bg-neutral-50 dark:bg-neutral-800 rounded p-2">
                                <div className="text-xs text-neutral-500 mb-1">
                                    Actual Hours
                                </div>
                                <div className="text-lg font-bold text-neutral-700 dark:text-neutral-300">
                                    {details.actualHours}h
                                </div>
                                <div className="text-xs text-neutral-500">
                                    (for reference)
                                </div>
                                </div>
                            </div>

                            {/* ✨ PAYABLE HOURS (after grace + breaks) */}
                            {details.payableHours !== details.scheduledHours && (
                                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2 border border-red-200 dark:border-red-800">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-red-700 dark:text-red-300 font-medium">
                                    Payable Hours (after deductions):
                                    </span>
                                    <span className="text-lg font-bold text-red-700 dark:text-red-300">
                                    {details.payableHours}h
                                    </span>
                                </div>
                                </div>
                            )}

                            {/* ✨ VARIANCE & OT */}
                            <div className="flex items-center gap-2 flex-wrap">
                                {details.variance !== 0 && (
                                <Badge
                                    className={`${
                                    details.varianceColor === "blue"
                                        ? "bg-blue-100 text-blue-700"
                                        : details.varianceColor === "red"
                                        ? "bg-red-100 text-red-700"
                                        : "bg-orange-100 text-orange-700"
                                    }`}
                                >
                                    {details.variance > 0 ? "+" : ""}
                                    {details.variance}h variance
                                </Badge>
                                )}

                                {details.hasOT && (
                                <Badge className="bg-blue-100 text-blue-700">
                                    <TrendingUp className="w-3 h-3 mr-1" />
                                    {details.approvedOT}h Approved OT
                                </Badge>
                                )}
                            </div>

                            {/* ✨ TOTAL PAYABLE */}
                            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
                                <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-green-700 dark:text-green-300">
                                    💰 Total Payable:
                                </span>
                                <span className="text-xl font-bold text-green-700 dark:text-green-300">
                                    {details.totalPayable.toFixed(2)}h
                                </span>
                                </div>
                                <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                                {details.payableHours}h regular
                                {details.hasOT && ` + ${details.approvedOT}h OT`}
                                {breakData && breakData.totalDeductions.minutes > 0 && 
                                    ` (after ${breakData.totalDeductions.hours}h break deductions)`
                                }
                                </div>
                            </div>
                            </div>

                            {/* Quick Actions */}
                            {approvalStatus === "pending" && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    disabled={loadingActions[approval.timeLogId]}
                                    onClick={async () => {
                                        setLoadingActions(prev => ({ ...prev, [approval.timeLogId]: true }));
                                        try {
                                        const response = await fetch(
                                            `${process.env.NEXT_PUBLIC_API_URL}/api/cutoff-periods/${selectedCutoff.id}/approvals/${approval.id}`,
                                            {
                                            method: "PATCH",
                                            headers: {
                                                Authorization: `Bearer ${token}`,
                                                "Content-Type": "application/json",
                                            },
                                            body: JSON.stringify({ action: "approve" }),
                                            }
                                        );
                                        if (response.ok) {
                                            toast.success("Time log approved");
                                            handleViewApprovals(selectedCutoff, approvalStatus);
                                            fetchCutoffPeriods();
                                        }
                                        } catch (error) {
                                        toast.error("Failed to approve");
                                        } finally {
                                        setLoadingActions(prev => ({ ...prev, [approval.timeLogId]: false }));
                                        }
                                    }}
                                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                    >
                                    {loadingActions[approval.timeLogId] ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Check className="w-4 h-4" />
                                    )}
                                    </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                disabled={loadingActions[approval.timeLogId]}
                                onClick={async () => {
                                    setLoadingActions(prev => ({ ...prev, [approval.timeLogId]: true }));
                                    try {
                                    const response = await fetch(
                                        `${process.env.NEXT_PUBLIC_API_URL}/api/cutoff-periods/${selectedCutoff.id}/approvals/${approval.id}`,
                                        {
                                        method: "PATCH",
                                        headers: {
                                            Authorization: `Bearer ${token}`,
                                            "Content-Type": "application/json",
                                        },
                                        body: JSON.stringify({ action: "reject" }),
                                        }
                                    );
                                    if (response.ok) {
                                        toast.success("Time log rejected");
                                        handleViewApprovals(selectedCutoff, approvalStatus);
                                        fetchCutoffPeriods();
                                    }
                                    } catch (error) {
                                    toast.error("Failed to reject");
                                    } finally {
                                    setLoadingActions(prev => ({ ...prev, [approval.timeLogId]: false }));
                                    }
                                }}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                {loadingActions[approval.timeLogId] ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <X className="w-4 h-4" />
                                )}
                                </Button>
                            </div>
                            )}
                        </div>
                        </motion.div>
                    );
                    })
                )}
                </div>

                {/* Bulk Actions Footer */}
                <div className="pt-4 border-t flex items-center justify-between">
                <div className="text-sm text-neutral-600 dark:text-neutral-400">
                    {getFilteredAndSortedApprovals.length} of {approvals.length} time logs
                </div>
                {approvalStatus === "pending" && (
                <div className="flex gap-2">
                    <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsApprovalModalOpen(false)}
                    >
                    Cancel
                    </Button>
                    <Button
                    size="sm"
                    onClick={() => handleBulkAction("reject")}
                    disabled={selectedApprovals.length === 0 || isBulkLoading}
                    variant="destructive"
                    >
                    {isBulkLoading ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                        <X className="w-4 h-4 mr-1" />
                    )}
                    Reject Selected ({selectedApprovals.length})
                    </Button>

                    <Button
                    size="sm"
                    onClick={() => handleBulkAction("approve")}
                    disabled={selectedApprovals.length === 0 || isBulkLoading}
                    className="bg-green-500 hover:bg-green-600"
                    >
                    {isBulkLoading ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                        <Check className="w-4 h-4 mr-1" />
                    )}
                    Approve Selected ({selectedApprovals.length})
                    </Button>
                </div>
                )}
                </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Summary Modal - remains the same */}
      <Dialog open={isSummaryModalOpen} onOpenChange={setIsSummaryModalOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payroll Summary</DialogTitle>
            <DialogDescription>
              {selectedCutoff &&
                `${formatDate(selectedCutoff.periodStart)} - ${formatDate(
                  selectedCutoff.periodEnd
                )}`}
            </DialogDescription>
          </DialogHeader>

          {!summaryData ? (
            <div className="py-8">
              <div className="flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Total Employees
                      </p>
                      <p className="text-3xl font-bold text-neutral-800 dark:text-neutral-200">
                        {summaryData.totals.totalEmployees}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Regular Hours
                      </p>
                      <p className="text-3xl font-bold text-blue-600">
                        {summaryData.totals.totalRegularHours}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        OT Hours
                      </p>
                      <p className="text-3xl font-bold text-orange-600">
                        {summaryData.totals.totalOvertimeHours}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-3">Employee Breakdown</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-neutral-50 dark:bg-neutral-800">
                      <tr>
                        <th className="text-left p-3 text-sm font-medium">
                          Employee
                        </th>
                        <th className="text-right p-3 text-sm font-medium">
                          Regular
                        </th>
                        <th className="text-right p-3 text-sm font-medium">OT</th>
                        <th className="text-right p-3 text-sm font-medium">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryData.employees.map((emp) => (
                        <tr
                          key={emp.userId}
                          className="border-t hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                        >
                          <td className="p-3">
                            <div>
                              <div className="font-medium text-neutral-800 dark:text-neutral-200">
                                {emp.employee.profile?.firstName || emp.employee.username}{" "}
                                {emp.employee.profile?.lastName || ""}
                              </div>
                              <div className="text-sm text-neutral-500 dark:text-neutral-400">
                                {emp.employee.email}
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-right font-medium">
                            {emp.regularHours}h
                          </td>
                          <td className="p-3 text-right font-medium text-orange-600">
                            {emp.overtimeHours}h
                          </td>
                          <td className="p-3 text-right font-bold">
                            {emp.totalHours}h
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end">
                <Button className="bg-orange-500 hover:bg-orange-600">
                  <Download className="w-4 h-4 mr-2" />
                  Export to CSV
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}