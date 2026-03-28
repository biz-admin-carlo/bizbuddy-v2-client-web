// Supervisor Leave Requests - Modern DataTable Version
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Eye,
  FileText,
  TrendingUp,
  Clock,
  User,
  AlertCircle,
  MessageSquare,
  Loader2,
  Trash2,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import useAuthStore from "@/store/useAuthStore";
import DataTable from "@/components/common/DataTable";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const statusConfig = {
  pending: {
    label: "Pending",
    color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    icon: Clock,
  },
  approved: {
    label: "Approved", 
    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Rejected",
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400", 
    icon: XCircle,
  },
};

const StatusBadge = ({ status }) => {
  const config = statusConfig[status];
  if (!config) return status;
  
  const Icon = config.icon;
  return (
    <Badge variant="secondary" className={`${config.color} border-0`}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
};

export default function SupervisorLeaveRequests() {
  const { token, user } = useAuthStore();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Dialog states
  const [detailDialog, setDetailDialog] = useState({ open: false, request: null });
  const [actionDialog, setActionDialog] = useState({ open: false, type: null, request: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, request: null });
  const [comment, setComment] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Calculate stats
  const stats = useMemo(() => {
    const total = leaves.length;
    const pending = leaves.filter(r => r.status === "pending").length;
    const approved = leaves.filter(r => r.status === "approved").length;
    const rejected = leaves.filter(r => r.status === "rejected").length;

    return { total, pending, approved, rejected };
  }, [leaves]);

  // Status tabs for the table
  const statusTabs = useMemo(() => [
    { label: "All", value: "all", count: stats.total },
    { label: "Pending", value: "pending", count: stats.pending },
    { label: "Approved", value: "approved", count: stats.approved },
    { label: "Rejected", value: "rejected", count: stats.rejected },
  ], [leaves, stats]);

  // Table columns
  const columns = [
    {
      key: "requester",
      label: "Employee",
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
            <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <div className="font-medium">{row.requester?.email || row.User?.email || "Unknown"}</div>
            <div className="text-xs text-muted-foreground">
              {row.requester?.department?.name || row.User?.department?.name || "No department"}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "leaveType",
      label: "Leave Type",
      render: (type) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
            <Calendar className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </div>
          <span className="font-medium">{type}</span>
        </div>
      ),
    },
    {
      key: "dateRange",
      label: "Date Range",
      render: (_, row) => (
        <div className="text-sm">
          <div className="font-medium">{new Date(row.startDate).toLocaleDateString()}</div>
          <div className="text-xs text-muted-foreground">
            to {new Date(row.endDate).toLocaleDateString()}
          </div>
          <div className="text-xs text-orange-600 font-medium">
            {(() => {
              const start = new Date(row.startDate);
              const end = new Date(row.endDate);
              start.setHours(0, 0, 0, 0);
              end.setHours(0, 0, 0, 0);
              const diffTime = end - start;
              const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
              return `${diffDays} day${diffDays === 1 ? '' : 's'}`;
            })()}
          </div>
        </div>
      ),
      sortable: true,
    },
    {
      key: "status",
      label: "Status",
      render: (status) => <StatusBadge status={status} />,
      sortable: true,
    },
    {
      key: "leaveReason",
      label: "Reason",
      render: (reason) => (
        <div className="max-w-32 truncate text-sm text-muted-foreground">
          {reason || "No reason provided"}
        </div>
      ),
    },
    {
      key: "createdAt",
      label: "Submitted",
      render: (date) => (
        <div className="text-sm text-muted-foreground">
          {new Date(date).toLocaleDateString()}
        </div>
      ),
      sortable: true,
    },
  ];

  // Table actions
  const actions = [
    {
      label: "View Details",
      icon: Eye,
      onClick: (request) => setDetailDialog({ open: true, request }),
    },
    {
      label: "Approve",
      icon: CheckCircle2,
      onClick: (request) => setActionDialog({ open: true, type: "approve", request }),
      condition: (request) => request.status === "pending",
      className: "text-green-600 hover:text-green-700",
    },
    {
      label: "Reject",
      icon: XCircle,
      onClick: (request) => setActionDialog({ open: true, type: "reject", request }),
      condition: (request) => request.status === "pending",
      className: "text-red-600 hover:text-red-700",
    },
    {
      label: "Delete",
      icon: Trash2,
      onClick: (request) => setDeleteDialog({ open: true, request }),
      className: "text-red-600 hover:text-red-700",
    },
  ];

  const fetchLeaves = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/leaves`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.message || "Failed to fetch leave requests");
      
      setLeaves(data.data || []);
    } catch (error) {
      toast.error(error.message || "Failed to fetch leave requests");
    } finally {
      setLoading(false);
    }
  }, [token]);

  const handleAction = async () => {
    if (!actionDialog.request || !actionDialog.type) return;
    
    // Save employee info before we close the modal
    const employeeEmail = actionDialog.request.requester?.email || actionDialog.request.User?.email || "the employee";
    const currentActionType = actionDialog.type;
    
    setActionLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/leaves/${actionDialog.request.id}/${actionDialog.type}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ approverComments: comment.trim() || null }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Close the modal
        setActionDialog({ open: false, type: null, request: null });
        setComment("");
        
        // Check if there's debug info for insufficient balance
        if (data.debug && data.debug.available !== undefined && data.debug.requested !== undefined) {
          // Use toast() with description for Sonner
          toast("Insufficient Leave Balance", {
            description: `${employeeEmail} has ${data.debug.available}h available but needs ${data.debug.requested}h for ${data.debug.leaveType || 'this leave'}. Please contact HR to adjust the employee's leave balance.`,
            icon: <AlertCircle className="h-5 w-5 text-amber-500" />,
            duration: 8000,
          });
        } else {
          // For other errors, show the error message
          toast.error(data.message || `Failed to ${currentActionType} leave request`);
        }
        
        setActionLoading(false);
        return;
      }

      // Success
      toast.success(`Leave request ${currentActionType}d successfully!`);
      setActionDialog({ open: false, type: null, request: null });
      setComment("");
      fetchLeaves();
    } catch (error) {
      // Close modal on exception
      setActionDialog({ open: false, type: null, request: null });
      setComment("");
      toast.error(error.message || `Failed to ${currentActionType} leave request`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.request) return;
    
    setActionLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/leaves/${deleteDialog.request.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "Failed to delete leave request");

      toast.success("Leave request deleted successfully!");
      setDeleteDialog({ open: false, request: null });
      fetchLeaves();
    } catch (error) {
      toast.error(error.message || "Failed to delete leave request");
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  return (
    <>
    <Toaster position="top-center" />
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Leave Requests</h1>
          <p className="text-muted-foreground">Review and manage employee leave requests</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Requests</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Review</CardTitle>
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-amber-600">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-green-600">{stats.approved}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-red-600">{stats.rejected}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-orange-600" />
            <CardTitle>Employee Leave Requests</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <DataTable
            data={leaves}
            columns={columns}
            loading={loading}
            onRefresh={fetchLeaves}
            actions={actions}
            searchPlaceholder="Search by employee, leave type, or reason..."
            statusTabs={statusTabs}
            onRowClick={(request) => setDetailDialog({ open: true, request })}
            pageSize={10}
          />
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailDialog.open} onOpenChange={(open) => !open && setDetailDialog({ open: false, request: null })}>
        <DialogContent className="sm:max-w-lg">
          <div className="h-1 w-full bg-orange-500 -mt-6 mb-4" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-orange-600" />
              Leave Request Details
            </DialogTitle>
          </DialogHeader>

          {detailDialog.request && (
            <div className="space-y-6">
              {/* Status and Leave Type */}
              <div className="flex items-center justify-between">
                <StatusBadge status={detailDialog.request.status} />
                <div className="text-right">
                  <div className="text-lg font-bold">{detailDialog.request.leaveType}</div>
                  <div className="text-sm text-muted-foreground">Leave Type</div>
                </div>
              </div>

              {/* Employee Info */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-3">
                  <User className="h-4 w-4 text-blue-600" />
                  <div className="font-medium text-blue-700 dark:text-blue-300">Employee Information</div>
                </div>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <span className="font-medium">{detailDialog.request.requester?.email || detailDialog.request.User?.email || "Unknown"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Department:</span>
                    <span className="font-medium">{detailDialog.request.requester?.department?.name || detailDialog.request.User?.department?.name || "Not specified"}</span>
                  </div>
                </div>
              </div>

              {/* Date Range */}
              <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-4 w-4 text-orange-600" />
                  <div className="font-medium text-orange-700 dark:text-orange-300">Leave Period</div>
                </div>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Start Date:</span>
                    <span className="font-medium">{new Date(detailDialog.request.startDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">End Date:</span>
                    <span className="font-medium">{new Date(detailDialog.request.endDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration:</span>
                    <span className="font-medium text-orange-600">
                      {(() => {
                        const start = new Date(detailDialog.request.startDate);
                        const end = new Date(detailDialog.request.endDate);
                        start.setHours(0, 0, 0, 0);
                        end.setHours(0, 0, 0, 0);
                        const diffTime = end - start;
                        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
                        return `${diffDays} day${diffDays === 1 ? '' : 's'}`;
                      })()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Request Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Request ID</div>
                  <div className="font-mono text-xs">{detailDialog.request.id}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Submitted</div>
                  <div className="font-medium">{new Date(detailDialog.request.createdAt).toLocaleDateString()} {new Date(detailDialog.request.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Last Updated</div>
                  <div className="font-medium">{new Date(detailDialog.request.updatedAt).toLocaleDateString()} {new Date(detailDialog.request.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>

              {/* Reason */}
              {detailDialog.request.leaveReason && (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Reason for Leave</div>
                  <div className="bg-muted p-3 rounded-md text-sm">
                    {detailDialog.request.leaveReason}
                  </div>
                </div>
              )}

              {/* Approver Comments */}
              {detailDialog.request.approverComments && (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    {detailDialog.request.status === "approved" ? "Approval" : "Rejection"} Comments
                  </div>
                  <div className={`p-3 rounded-md text-sm border ${
                    detailDialog.request.status === "approved"
                      ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                      : "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
                  }`}>
                    {detailDialog.request.approverComments}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {detailDialog.request?.status === "pending" && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDetailDialog({ open: false, request: null });
                    setActionDialog({ open: true, type: "reject", request: detailDialog.request });
                  }}
                  className="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800/50 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </Button>
                <Button
                  onClick={() => {
                    setDetailDialog({ open: false, request: null });
                    setActionDialog({ open: true, type: "approve", request: detailDialog.request });
                  }}
                  className="bg-green-500 hover:bg-green-600 text-white"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Approve
                </Button>
              </>
            )}
            {detailDialog.request?.status !== "pending" && (
              <Button onClick={() => setDetailDialog({ open: false, request: null })}>
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Dialog (Approve/Reject) */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => !open && setActionDialog({ open: false, type: null, request: null })}>
        <DialogContent className="sm:max-w-md">
          <div className={`h-1 w-full -mt-6 mb-4 ${actionDialog.type === "approve" ? "bg-green-500" : "bg-red-500"}`} />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className={`p-2 rounded-full ${
                actionDialog.type === "approve" 
                  ? "bg-green-100 text-green-500 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400"
              }`}>
                {actionDialog.type === "approve" ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
              </div>
              {actionDialog.type === "approve" ? "Approve" : "Reject"} Leave Request
            </DialogTitle>
          </DialogHeader>

          {actionDialog.request && (
            <>
              <div className={`p-4 rounded-md border ${
                actionDialog.type === "approve"
                  ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                  : "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
              }`}>
                <div className="text-sm space-y-1">
                  <div><strong>Employee:</strong> {actionDialog.request.requester?.email || actionDialog.request.User?.email || "Unknown"}</div>
                  <div><strong>Leave Type:</strong> {actionDialog.request.leaveType}</div>
                </div>
              </div>

              {/* Detailed Hours Breakdown */}
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4 text-orange-600" />
                  <div className="font-semibold text-sm text-orange-700 dark:text-orange-300">Leave Period Details</div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Start Date & Time:</span>
                    <span className="font-medium">
                      {new Date(actionDialog.request.startDate).toLocaleDateString()} at {new Date(actionDialog.request.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">End Date & Time:</span>
                    <span className="font-medium">
                      {new Date(actionDialog.request.endDate).toLocaleDateString()} at {new Date(actionDialog.request.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="h-px bg-orange-200 dark:bg-orange-800 my-2"></div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Number of Days:</span>
                    <span className="font-medium">
                      {(() => {
                        const start = new Date(actionDialog.request.startDate);
                        const end = new Date(actionDialog.request.endDate);
                        start.setHours(0, 0, 0, 0);
                        end.setHours(0, 0, 0, 0);
                        const diffTime = end - start;
                        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
                        return `${diffDays} day${diffDays === 1 ? '' : 's'}`;
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Hours per Day:</span>
                    <span className="font-medium">8 hours</span>
                  </div>
                  <div className="h-px bg-orange-200 dark:bg-orange-800 my-2"></div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-orange-700 dark:text-orange-300">Total Hours Requested:</span>
                    <span className="font-bold text-lg text-orange-600 dark:text-orange-400">
                      {(() => {
                        const start = new Date(actionDialog.request.startDate);
                        const end = new Date(actionDialog.request.endDate);
                        start.setHours(0, 0, 0, 0);
                        end.setHours(0, 0, 0, 0);
                        const diffTime = end - start;
                        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
                        const hours = diffDays * 8;
                        return `${hours}h`;
                      })()}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Comments <span className="text-muted-foreground">(optional)</span>
            </label>
            <Textarea
              placeholder={`Add a comment for this ${actionDialog.type}...`}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog({ open: false, type: null, request: null })}>
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={actionLoading}
              className={actionDialog.type === "approve" ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"}
            >
              {actionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {actionDialog.type === "approve" ? "Approving..." : "Rejecting..."}
                </>
              ) : (
                <>
                  {actionDialog.type === "approve" ? <CheckCircle2 className="h-4 w-4 mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                  {actionDialog.type === "approve" ? "Approve" : "Reject"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, request: null })}>
        <DialogContent className="sm:max-w-md">
          <div className="h-1 w-full bg-red-500 -mt-6 mb-4" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400">
                <AlertCircle className="h-5 w-5" />
              </div>
              Delete Leave Request
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this leave request? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {deleteDialog.request && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
              <div className="text-sm space-y-1 text-red-600 dark:text-red-400">
                <div><strong>Employee:</strong> {deleteDialog.request.requester?.email || deleteDialog.request.User?.email || "Unknown"}</div>
                <div><strong>Leave Type:</strong> {deleteDialog.request.leaveType}</div>
                <div><strong>Duration:</strong> {new Date(deleteDialog.request.startDate).toLocaleDateString()} to {new Date(deleteDialog.request.endDate).toLocaleDateString()}</div>
                <div><strong>Status:</strong> {deleteDialog.request.status}</div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, request: null })}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={actionLoading}
              className="bg-red-500 hover:bg-red-600"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Request
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
}