
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  FileText,
  TrendingUp,
  AlertCircle,
  User,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import useAuthStore from "@/store/useAuthStore";
import DataTable from "@/components/common/DataTable";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

export default function EmployeeOvertimeRequests() {
  const { token, user } = useAuthStore();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Dialog states
  const [detailDialog, setDetailDialog] = useState({ open: false, request: null });

  // Calculate stats
  const stats = useMemo(() => {
    const total = requests.length;
    const pending = requests.filter(r => r.status === "pending").length;
    const approved = requests.filter(r => r.status === "approved").length;
    const rejected = requests.filter(r => r.status === "rejected").length;
    const approvedHours = requests
      .filter(r => r.status === "approved")
      .reduce((sum, r) => sum + Number(r.requestedHours || 0), 0);

    return { total, pending, approved, rejected, approvedHours: approvedHours.toFixed(1) };
  }, [requests]);

  // Status tabs for the table
  const statusTabs = useMemo(() => [
    { label: "All", value: "all", count: stats.total },
    { label: "Pending", value: "pending", count: stats.pending },
    { label: "Approved", value: "approved", count: stats.approved },
    { label: "Rejected", value: "rejected", count: stats.rejected },
  ], [requests, stats]);

  // Table columns
  const columns = [
    {
      key: "createdAt",
      label: "Date Submitted",
      render: (date) => (
        <div className="text-sm">
          <div className="font-medium">{new Date(date).toLocaleDateString()}</div>
          <div className="text-xs text-muted-foreground">
            {new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      ),
      sortable: true,
    },
    {
      key: "requestedHours",
      label: "Hours Requested",
      render: (hours) => (
        <div className="font-mono text-sm font-medium">
          {Number(hours).toFixed(2)}h
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
      key: "approver",
      label: "Approver",
      render: (_, row) => (
        <div className="text-sm">
          {row.approver?.email || "Not assigned"}
        </div>
      ),
    },
    {
      key: "requesterReason",
      label: "Reason",
      render: (reason) => (
        <div className="max-w-32 truncate text-sm text-muted-foreground">
          {reason || "No reason provided"}
        </div>
      ),
    },
    {
      key: "updatedAt",
      label: "Last Updated",
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
  ];

  const fetchRequests = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/overtime/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.message || "Failed to fetch overtime requests");
      
      setRequests(data.data || []);
    } catch (error) {
      toast.error(error.message || "Failed to fetch overtime requests");
    } finally {
      setLoading(false);
    }
  }, [token]);

  const getProjectedTime = (request) => {
    if (!request.timeLog?.timeOut || !request.requestedHours) return null;
    const originalOut = new Date(request.timeLog.timeOut);
    const withOT = new Date(originalOut.getTime() + Number(request.requestedHours) * 3600000);
    return withOT;
  };

  const getTotalHours = (request) => {
    if (!request.timeLog?.timeIn || !request.timeLog?.timeOut || !request.requestedHours) return null;
    const projected = getProjectedTime(request);
    if (!projected) return null;
    const hours = (projected - new Date(request.timeLog.timeIn)) / 3600000;
    return hours.toFixed(2);
  };

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Overtime Requests</h1>
          <p className="text-muted-foreground">View and track your overtime request history</p>
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
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
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
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Approved Hours</CardTitle>
              <TrendingUp className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.approvedHours}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-600" />
            <CardTitle>Overtime Requests</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <DataTable
            data={requests}
            columns={columns}
            loading={loading}
            onRefresh={fetchRequests}
            actions={actions}
            searchPlaceholder="Search by reason, status, or date..."
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
              <FileText className="h-5 w-5 text-orange-600" />
              Overtime Request Details
            </DialogTitle>
          </DialogHeader>

          {detailDialog.request && (
            <div className="space-y-6">
              {/* Status and Hours */}
              <div className="flex items-center justify-between">
                <StatusBadge status={detailDialog.request.status} />
                <div className="text-right">
                  <div className="text-2xl font-bold">{Number(detailDialog.request.requestedHours).toFixed(2)}h</div>
                  <div className="text-sm text-muted-foreground">Overtime Hours</div>
                </div>
              </div>

              {/* Request Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Request ID</div>
                  <div className="font-mono text-xs">{detailDialog.request.id}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">TimeLog ID</div>
                  <div className="font-mono text-xs">{detailDialog.request.timeLogId}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Submitted</div>
                  <div className="font-medium">{new Date(detailDialog.request.createdAt).toLocaleDateString()} {new Date(detailDialog.request.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Last Updated</div>
                  <div className="font-medium">{new Date(detailDialog.request.updatedAt).toLocaleDateString()} {new Date(detailDialog.request.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Approver</div>
                  <div className="font-medium">{detailDialog.request.approver?.email || "Not assigned"}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Late Hours</div>
                  <div className="font-medium">{detailDialog.request.lateHours ? Number(detailDialog.request.lateHours).toFixed(2) : "0.00"}h</div>
                </div>
              </div>

              {/* Reason */}
              {detailDialog.request.requesterReason && (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Reason for Overtime</div>
                  <div className="bg-muted p-3 rounded-md text-sm">
                    {detailDialog.request.requesterReason}
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
            <Button onClick={() => setDetailDialog({ open: false, request: null })}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}