// Modern Company Configurations - With TimeZone and Coffee Break Management
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { 
  Building2, 
  Loader2, 
  Save, 
  Clock, 
  User, 
  CheckSquare, 
  AlertCircle, 
  Info, 
  Trash2,
  Plus,
  Settings,
  Users,
  Calendar,
  TrendingUp,
  Moon,
  Edit3,
  Sun,
  Award,
  Timer,
  RefreshCw,
  Globe,
  Coffee,
  Bell,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import useAuthStore from "@/store/useAuthStore";
import DataTable from "@/components/common/DataTable";
import Spinner from "@/components/common/Spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import CheckSettings from './CheckSettings';

// Common IANA Timezones
const TIMEZONES = [
  { value: "America/Los_Angeles", label: "America/Los Angeles (PST/PDT)" },
  { value: "America/New_York", label: "America/New York (EST/EDT)" },
  { value: "America/Chicago", label: "America/Chicago (CST/CDT)" },
  { value: "America/Denver", label: "America/Denver (MST/MDT)" },
  { value: "America/Phoenix", label: "America/Phoenix (MST)" },
  { value: "America/Anchorage", label: "America/Anchorage (AKST/AKDT)" },
  { value: "Pacific/Honolulu", label: "Pacific/Honolulu (HST)" },
  { value: "Europe/London", label: "Europe/London (GMT/BST)" },
  { value: "Europe/Paris", label: "Europe/Paris (CET/CEST)" },
  { value: "Europe/Berlin", label: "Europe/Berlin (CET/CEST)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (GST)" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST)" },
  { value: "Asia/Shanghai", label: "Asia/Shanghai (CST)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (JST)" },
  { value: "Asia/Singapore", label: "Asia/Singapore (SGT)" },
  { value: "Asia/Hong_Kong", label: "Asia/Hong Kong (HKT)" },
  { value: "Asia/Manila", label: "Asia/Manila (PHT)" },
  { value: "Australia/Sydney", label: "Australia/Sydney (AEDT/AEST)" },
  { value: "Australia/Melbourne", label: "Australia/Melbourne (AEDT/AEST)" },
  { value: "Pacific/Auckland", label: "Pacific/Auckland (NZDT/NZST)" },
];

export default function ModernCompanyConfigurations() {
  const { token, role } = useAuthStore();
  const API = process.env.NEXT_PUBLIC_API_URL;
  
  useEffect(() => {
    if (role && !["admin", "superadmin", "supervisor"].includes(role.toLowerCase())) window.location.href = "/dashboard";
    if (!token) {
      toast.error("Session expired. Please log in again.");
      window.location.href = "/login";
    }
  }, [role, token]);

  const [leaveTypes, setLeaveTypes] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [matrix, setMatrix] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [departmentBreakSettings, setDepartmentBreakSettings] = useState({});
  const [departmentCoffeeSettings, setDepartmentCoffeeSettings] = useState({});
  const [departmentLoading, setDepartmentLoading] = useState({});
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [loadingMatrix, setLoadingMatrix] = useState(true);
  const [draft, setDraft] = useState(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // TimeZone states
  const [showTimezoneModal, setShowTimezoneModal] = useState(false);
  const [pendingTimezone, setPendingTimezone] = useState(null);
  const [currentTime, setCurrentTime] = useState("");

  // Calculate stats
  const stats = useMemo(() => {
    const totalEmployees = matrix.length;
    const totalLeaveTypes = leaveTypes.length;
    const totalCredits = matrix.reduce((acc, emp) => {
      return acc + leaveTypes.reduce((typeAcc, type) => {
        return typeAcc + (emp.balances?.[type]?.credits || 0);
      }, 0);
    }, 0);
    const totalUsed = matrix.reduce((acc, emp) => {
      return acc + leaveTypes.reduce((typeAcc, type) => {
        return typeAcc + (emp.balances?.[type]?.used || 0);
      }, 0);
    }, 0);
    
    return { totalEmployees, totalLeaveTypes, totalCredits, totalUsed };
  }, [matrix, leaveTypes]);

  // Update current time preview
  useEffect(() => {
    const updateTime = () => {
      const timezone = pendingTimezone || draft?.timezone || "America/Los_Angeles";
      try {
        const time = new Intl.DateTimeFormat('en-US', {
          timeZone: timezone,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }).format(new Date());
        setCurrentTime(time);
      } catch (error) {
        setCurrentTime("Invalid timezone");
      }
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [pendingTimezone, draft?.timezone]);

  const loadSettings = async () => {
    setLoadingSettings(true);
    try {
      const r = await fetch(`${API}/api/company-settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await r.json();
      if (r.ok) {
        const settings = j.data || {};
        setDraft(settings);
      } else {
        toast.error(j.message || "Failed to load settings");
      }
    } catch {
      toast.error("Network error while loading settings");
    }
    setLoadingSettings(false);
  };

  const loadDepartments = async () => {
    setLoadingDepartments(true);
    try {
      const r = await fetch(`${API}/api/departments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await r.json();
      if (r.ok && j.data) {
        setDepartments(j.data);
        // Initialize department break settings
        const breakSettings = {};
        const coffeeSettings = {};
        j.data.forEach(dept => {
          breakSettings[dept.id] = dept.paidBreak || false;
          coffeeSettings[dept.id] = {
            coffeeBreaksAllowed: dept.coffeeBreaksAllowed || 0,
            coffeeBreakMinutes: dept.coffeeBreakMinutes || 0,
            paidCoffeeBreak: dept.paidCoffeeBreak || false
          };
        });
        setDepartmentBreakSettings(breakSettings);
        setDepartmentCoffeeSettings(coffeeSettings);
      } else {
        toast.error(j.message || "Failed to load departments");
      }
    } catch {
      toast.error("Network error while loading departments");
    }
    setLoadingDepartments(false);
  };

  const updateDepartmentBreakSetting = async (departmentId, paidBreak) => {
    setDepartmentLoading(prev => ({ ...prev, [departmentId]: true }));
    
    try {
      const r = await fetch(`${API}/api/departments/update/${departmentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ paidBreak }),
      });
      const j = await r.json();
      if (r.ok) {
        setDepartmentBreakSettings(prev => ({
          ...prev,
          [departmentId]: paidBreak
        }));
        toast.success(`${paidBreak ? 'Enabled' : 'Disabled'} paid lunch breaks`);
      } else {
        toast.error(j.message || "Failed to update department setting");
      }
    } catch {
      toast.error("Network error while updating department setting");
    } finally {
      setDepartmentLoading(prev => ({ ...prev, [departmentId]: false }));
    }
  };

  const updateDepartmentCoffeeSetting = async (departmentId, updates) => {
    setDepartmentLoading(prev => ({ ...prev, [`coffee_${departmentId}`]: true }));
    
    try {
      const r = await fetch(`${API}/api/departments/update/${departmentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });
      const j = await r.json();
      if (r.ok) {
        setDepartmentCoffeeSettings(prev => ({
          ...prev,
          [departmentId]: {
            ...prev[departmentId],
            ...updates
          }
        }));
        toast.success('Coffee break settings updated');
      } else {
        toast.error(j.message || "Failed to update coffee break setting");
      }
    } catch {
      toast.error("Network error while updating coffee break setting");
    } finally {
      setDepartmentLoading(prev => ({ ...prev, [`coffee_${departmentId}`]: false }));
    }
  };

  const handleTimezoneChange = (newTimezone) => {
    setPendingTimezone(newTimezone);
    setShowTimezoneModal(true);
  };

  const confirmTimezoneChange = async () => {
    if (!pendingTimezone) return;
    
    setDraft(prev => ({ ...prev, timezone: pendingTimezone }));
    setShowTimezoneModal(false);
    toast.success("Timezone updated. Don't forget to save settings!");
    setPendingTimezone(null);
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      const r = await fetch(`${API}/api/company-settings`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(draft),
      });
      const j = await r.json();
      if (r.ok) toast.success("Settings saved successfully!");
      else toast.error(j.message || "Failed to save settings");
    } catch {
      toast.error("Network error while saving settings");
    }
    setSavingSettings(false);
  };

  const loadData = async (retry = 0) => {
    setLoadingMatrix(true);
    setErrorMessage(null);
    try {
      const [mRes, pRes] = await Promise.all([
        fetch(`${API}/api/leave-balances/matrix?cb=${Date.now()}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }),
        fetch(`${API}/api/leave-policies`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }),
      ]);
      const [mData, pData] = await Promise.all([mRes.json(), pRes.json()]);
      if (!mRes.ok || !pRes.ok) {
        const msg = mData.message || pData.message || "Failed to load data from server";
        setErrorMessage(msg);
        toast.error(msg);
        if (retry < 2) {
          await new Promise((r) => setTimeout(r, 1000 * (retry + 1)));
          return loadData(retry + 1);
        }
      }
      const rows = Array.isArray(mData.data) ? mData.data : [];
      const policiesArr = Array.isArray(pData.data) ? pData.data : [];
      const types = policiesArr.map((p) => p.leaveType);
      const validated = rows.map((row) => {
        const balObj = {};
        types.forEach((t) => {
          const credits = Number(row.balances?.[t] || 0);
          const used = Number(row.usedBalances?.[t] || 0);
          const available = Math.max(credits - used, 0);
          balObj[t] = { credits, used, available };
        });
        return { ...row, balances: balObj };
      });
      setMatrix(validated);
      setPolicies(policiesArr);
      setLeaveTypes(types);
    } catch {
      const msg = "Network error while loading data";
      setErrorMessage(msg);
      toast.error(msg);
    }
    setLoadingMatrix(false);
  };

  const refreshData = async () => {
    setRefreshing(true);
    await Promise.all([loadData(), loadDepartments(), loadSettings()]);
    toast.success("Data refreshed");
    setRefreshing(false);
  };

  useEffect(() => {
    if (token) {
      loadSettings();
      loadData();
      loadDepartments();
    }
  }, [token]);

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <Toaster position="top-center" />
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                <Settings className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              Company Configurations
            </h1>
            <p className="text-muted-foreground">Manage time-keeping settings, leave types, and employee credits</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={refreshData}
              disabled={refreshing}
              className="border-orange-200 text-orange-600 hover:bg-orange-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              onClick={saveSettings}
              disabled={savingSettings || loadingSettings}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {savingSettings ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Settings
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Employees</CardTitle>
                <Users className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.totalEmployees}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Leave Types</CardTitle>
                <Calendar className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.totalLeaveTypes}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Credits</CardTitle>
                <Award className="h-4 w-4 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.totalCredits.toFixed(1)}h</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Hours Used</CardTitle>
                <TrendingUp className="h-4 w-4 text-orange-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.totalUsed.toFixed(1)}h</div>
            </CardContent>
          </Card>
        </div>

        <CompanyTimezoneCard 
          loading={loadingSettings}
          draft={draft}
          currentTime={currentTime}
          onTimezoneChange={handleTimezoneChange}
        />

        <TimezoneConfirmationModal
          open={showTimezoneModal}
          onOpenChange={setShowTimezoneModal}
          pendingTimezone={pendingTimezone}
          currentTimezone={draft?.timezone || "America/Los_Angeles"}
          onConfirm={confirmTimezoneChange}
          previewTime={currentTime}
        />

        <TimeDefaultsCard loading={loadingSettings} draft={draft} setDraft={setDraft} />

        <OvertimeConfigCard loading={loadingSettings} draft={draft} setDraft={setDraft} />
        
        <DepartmentBreakPolicyCard 
          departments={departments}
          departmentBreakSettings={departmentBreakSettings}
          departmentLoading={departmentLoading}
          updateDepartmentBreakSetting={updateDepartmentBreakSetting}
          loading={loadingDepartments}
        />
        
        <DepartmentCoffeeBreakPolicyCard
          departments={departments}
          departmentCoffeeSettings={departmentCoffeeSettings}
          departmentLoading={departmentLoading}
          updateDepartmentCoffeeSetting={updateDepartmentCoffeeSetting}
          loading={loadingDepartments}
        />

        <CheckSettings />

        {/* Leave Types Management */}
        <LeaveTypesCard API={API} token={token} policies={policies} reload={loadData} />
        
        {/* Leave Credits Management */}
        <LeaveAdminCard
          token={token}
          API={API}
          leaveTypes={leaveTypes}
          matrix={matrix}
          loadingMatrix={loadingMatrix}
          errorMessage={errorMessage}
          reload={loadData}
        />
      </div>
    </TooltipProvider>
  );
}

function CompanyTimezoneCard({ loading, draft, currentTime, onTimezoneChange }) {
  const [searchTerm, setSearchTerm] = useState("");
  
  const filteredTimezones = TIMEZONES.filter(tz => 
    tz.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tz.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card className="border-2 shadow-lg border-orange-300 dark:border-orange-700">
      <div className="h-1 w-full bg-gradient-to-r from-orange-500 via-red-500 to-orange-500" />
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-xl font-semibold">
              <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                <Globe className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              Company TimeZone
              <Badge variant="destructive" className="ml-2">Critical Setting</Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              This timezone affects all shift schedules, time calculations, and payroll deductions
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Warning Banner */}
        <div className="bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-300 dark:border-orange-700 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mt-0.5">
              <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-orange-900 dark:text-orange-100">
                Critical: This Setting Impacts All Time-Based Operations
              </h4>
              <ul className="text-xs text-orange-800 dark:text-orange-200 space-y-1">
                <li>• <strong>Payroll Calculations:</strong> Overtime, deductions, and pay periods follow this timezone</li>
                <li>• <strong>Break Policies:</strong> Lunch and coffee break tracking uses this timezone</li>
                <li>• <strong>Reports & Analytics:</strong> All time-based reports reference this timezone</li>
              </ul>
              <p className="text-xs font-semibold text-orange-900 dark:text-orange-100 mt-2">
                Changing this setting requires careful consideration and confirmation.
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {/* TimeZone Selector */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Globe className="h-4 w-4 text-orange-500" />
                Select Company TimeZone
              </Label>
              <Select 
                value={draft?.timezone || "America/Los_Angeles"} 
                onValueChange={onTimezoneChange}
              >
                <SelectTrigger className="bg-background border-2 border-orange-200">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  <div className="p-2 sticky top-0 bg-background">
                    <Input
                      placeholder="Search timezones..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-8"
                    />
                  </div>
                  <ScrollArea className="h-60">
                    {filteredTimezones.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </ScrollArea>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Current: <span className="font-mono font-semibold">{draft?.timezone || "America/Los_Angeles"}</span>
              </p>
            </div>

            {/* Live Time Preview */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2 flex-wrap">
                <Clock className="h-4 w-4 text-orange-500 shrink-0" />
                <span>Current Time Preview</span>
              </Label>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 
                              border-2 border-orange-200 dark:border-orange-700 rounded-lg px-3 py-2 sm:px-4 sm:py-3 
                              flex items-center justify-center min-h-[50px]">
                <div className="text-center w-full">
                  <div className="font-bold font-mono text-orange-600 dark:text-orange-400 
                                  text-lg sm:text-xl md:text-2xl lg:text-3xl 
                                  tracking-tight break-words leading-tight">
                    {currentTime || "Loading..."}
                  </div>
                </div>
              </div>

              <p className="text-[10px] sm:text-xs text-muted-foreground text-center leading-snug">
                All employee operations will use this timezone
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TimezoneConfirmationModal({ open, onOpenChange, pendingTimezone, currentTimezone, onConfirm, previewTime }) {
  const pendingTzLabel = TIMEZONES.find(tz => tz.value === pendingTimezone)?.label || pendingTimezone;
  const currentTzLabel = TIMEZONES.find(tz => tz.value === currentTimezone)?.label || currentTimezone;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <div className="h-1 w-full bg-gradient-to-r from-orange-500 via-red-500 to-orange-500 -mt-6 mb-4" />
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-orange-100 text-orange-500 dark:bg-orange-900/30 dark:text-orange-400">
              <AlertCircle className="h-5 w-5" />
            </div>
            Confirm TimeZone Change
          </DialogTitle>
          <DialogDescription className="text-left pt-2">
            You are about to change the company timezone. This is a critical operation that affects all time-based calculations.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          {/* Change Summary */}
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Current TimeZone:</p>
                <p className="font-mono text-sm font-semibold">{currentTzLabel}</p>
              </div>
              <div className="flex items-center justify-center">
                <ArrowDown className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">New TimeZone:</p>
                <p className="font-mono text-sm font-semibold text-orange-600">{pendingTzLabel}</p>
              </div>
            </div>
          </div>

          {/* Preview Time */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-1">
              Current time in new timezone:
            </p>
            <p className="font-mono text-lg font-bold text-blue-600 dark:text-blue-400">
              {previewTime}
            </p>
          </div>

          {/* Impact Warning */}
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <p className="text-sm font-semibold text-red-900 dark:text-red-100">
                  This change will immediately affect:
                </p>
                <ul className="text-xs text-red-800 dark:text-red-200 space-y-1">
                  <li>✓ All future shift schedules</li>
                  <li>✓ Break time calculations</li>
                  <li>✓ Payroll processing timestamps</li>
                  <li>✓ Overtime and deduction calculations</li>
                  <li>✓ All time-based reports and analytics</li>
                </ul>
                <p className="text-xs font-semibold text-red-900 dark:text-red-100 mt-2">
                  Please ensure all stakeholders are informed of this change.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            <CheckSquare className="h-4 w-4 mr-2" />
            Confirm Change
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ArrowDown({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
    </svg>
  );
}

function TimeDefaultsCard({ loading, draft, setDraft }) {
  return (
    <Card className="border-2 shadow-lg">
      <div className="h-1 w-full bg-orange-500" />
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl font-semibold">
          <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
            <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          Time-keeping Defaults
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            <NumberField
              label="Default Shift Hours"
              value={draft?.defaultShiftHours}
              onChange={(v) => setDraft((o) => ({ ...o, defaultShiftHours: v }))}
              step="0.25"
              icon={<Timer className="h-4 w-4 text-orange-500" />}
            />
            <NumberField
              label="Minimum Lunch Deduction (minutes)"
              value={draft?.minimumLunchMinutes}
              onChange={(v) => setDraft((o) => ({ ...o, minimumLunchMinutes: v }))}
              step="5"
              icon={<Clock className="h-4 w-4 text-orange-500" />}
            />
            <NumberField
              label="Grace Period (minutes)"
              value={draft?.gracePeriodMinutes ?? 15}
              onChange={(v) => setDraft((o) => ({ ...o, gracePeriodMinutes: v }))}
              step="5"
              icon={<AlertCircle />}
              helpText="Allowed lateness before deductions apply"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function OvertimeConfigCard({ loading, draft, setDraft }) {
  const basis = draft?.otBasis ?? "daily";

  const basisConfig = {
    daily: {
      label: "Daily OT Threshold",
      field: "dailyOtThresholdHours",
      default: 8,
      step: "0.25",
      unit: "hours / day",
      description: "Employee works more than N hours in a single day. OT is computed per individual punch log — no cross-record aggregation needed.",
      example: "e.g. 8h → any session exceeding 8 hours triggers OT",
    },
    weekly: {
      label: "Weekly OT Threshold",
      field: "weeklyOtThresholdHours",
      default: 40,
      step: "0.5",
      unit: "hours / week",
      description: "Employee's total hours across a 7-day window exceed N hours. Requires cross-record aggregation — backend job needed.",
      example: "e.g. 40h → cumulative weekly hours past 40 trigger OT",
    },
    cutoff: {
      label: "Cutoff Period OT Threshold",
      field: "cutoffOtThresholdHours",
      default: 80,
      step: "1",
      unit: "hours / cutoff period",
      description: "Employee's total hours within the active payroll cutoff exceed N hours. Requires cross-record aggregation — backend job needed.",
      example: "e.g. 80h → cumulative cutoff hours past 80 trigger OT",
    },
  };

  const active = basisConfig[basis];
  const thresholdValue = draft?.[active.field] ?? active.default;
  const needsBackend = basis === "weekly" || basis === "cutoff";

  return (
    <Card className="border-2 shadow-lg">
      <div className="h-1 w-full bg-orange-500" />
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl font-semibold">
          <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          Overtime (OT) Configuration
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Define how overtime is measured for this company. Employees submit OT requests — this setting determines when the request button becomes available.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <>
            {/* Basis radio cards — replaces dropdown + pills */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-orange-500" />
                OT Calculation Basis
              </Label>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(basisConfig).map(([key, cfg]) => {
                  const val = draft?.[cfg.field] ?? cfg.default;
                  const isActive = basis === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setDraft((prev) => ({ ...prev, otBasis: key }))}
                      className={`text-left p-4 rounded-xl border-2 transition-all focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 ${
                        isActive
                          ? "border-orange-400 bg-orange-50 dark:bg-orange-950/20 shadow-sm"
                          : "border-border bg-card hover:border-orange-200 hover:bg-orange-50/40 dark:hover:bg-orange-950/10"
                      }`}
                    >
                      {/* Selected indicator dot */}
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-bold uppercase tracking-widest ${
                          isActive ? "text-orange-600" : "text-muted-foreground"
                        }`}>
                          {key}
                        </span>
                        <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          isActive
                            ? "border-orange-500 bg-orange-500"
                            : "border-muted-foreground/30"
                        }`}>
                          {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </span>
                      </div>

                      {/* Threshold value — big and prominent */}
                      <div className={`text-3xl font-bold font-mono mb-1 ${
                        isActive ? "text-orange-600" : "text-foreground"
                      }`}>
                        {val}h
                      </div>
                      <div className="text-xs text-muted-foreground mb-3">{cfg.unit}</div>

                      {/* Description */}
                      <p className={`text-xs leading-relaxed ${
                        isActive ? "text-orange-800 dark:text-orange-200" : "text-muted-foreground"
                      }`}>
                        {cfg.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Threshold input — shown below the cards */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Timer className="h-4 w-4 text-orange-500" />
                {active.label}
              </Label>
              <div className="flex items-center gap-3 max-w-xs">
                <Input
                  type="number"
                  step={active.step}
                  min="0"
                  value={thresholdValue}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      [active.field]: e.target.value === "" ? null : Number(e.target.value),
                    }))
                  }
                  className="bg-background text-lg font-mono font-semibold"
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">{active.unit}</span>
              </div>
              <p className="text-xs text-muted-foreground italic">{active.example}</p>
            </div>

            {/* Info callout */}
            <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">How OT Requests Work</p>
                  <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                    <li>• Only <strong>employees</strong> can submit OT requests — from their own Punch Logs view</li>
                    <li>• Supervisors and Admins <strong>approve or reject</strong> requests — they do not submit them</li>
                    <li>• Unapproved OT hours are <strong>not credited</strong> — the session is capped at scheduled end</li>
                    <li>• Each company uses exactly <strong>one basis model</strong> — daily, weekly, or per cutoff</li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function NumberField({ label, value, onChange, step, icon }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium flex items-center gap-2">
        {icon}
        {label}
      </label>
      <Input
        type="number"
        step={step}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        className="bg-background"
      />
    </div>
  );
}

function DepartmentBreakPolicyCard({ departments, departmentBreakSettings, departmentLoading, updateDepartmentBreakSetting, loading }) {
  const totalDepartments = departments.length;
  const paidBreakDepartments = Object.values(departmentBreakSettings).filter(Boolean).length;
  const unpaidBreakDepartments = totalDepartments - paidBreakDepartments;

  return (
    <Card className="border-2 shadow-lg">
      <div className="h-1 w-full bg-orange-500" />
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl font-semibold">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
            <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          Department Lunch Break Policy
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Configure paid lunch break settings for each department individually
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Total Departments</p>
                  <p className="text-2xl font-bold text-blue-600">{totalDepartments}</p>
                </div>
                <Building2 className="h-8 w-8 text-blue-600 opacity-80" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Paid Breaks</p>
                  <p className="text-2xl font-bold text-green-600">{paidBreakDepartments}</p>
                </div>
                <CheckSquare className="h-8 w-8 text-green-600 opacity-80" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-600">Unpaid Breaks</p>
                  <p className="text-2xl font-bold text-amber-600">{unpaidBreakDepartments}</p>
                </div>
                <Clock className="h-8 w-8 text-amber-600 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Department Settings */}
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : departments.length === 0 ? (
          <div className="text-center py-8">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">No departments found</p>
            <p className="text-sm text-muted-foreground">Create departments first to configure lunch break policies</p>
          </div>
        ) : (
          <div className="space-y-3">
            {departments.map((department) => {
              const isPaidBreak = departmentBreakSettings[department.id] || false;
              return (
                <div
                  key={department.id}
                  className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                    isPaidBreak
                      ? 'bg-green-50/50 border-green-200 dark:bg-green-900/10 dark:border-green-800'
                      : 'bg-amber-50/50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isPaidBreak
                          ? 'bg-green-100 dark:bg-green-900/30'
                          : 'bg-amber-100 dark:bg-amber-900/30'
                      }`}
                    >
                      <Building2
                        className={`h-5 w-5 ${
                          isPaidBreak
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-amber-600 dark:text-amber-400'
                        }`}
                      />
                    </div>
                    <div>
                      <h3 className="font-medium">{department.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Department ID: {department.id}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className={`text-sm font-medium ${
                        isPaidBreak ? 'text-green-600' : 'text-amber-600'
                      }`}>
                        {isPaidBreak ? 'Paid Lunch Breaks' : 'Unpaid Lunch Breaks'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {isPaidBreak 
                          ? 'Employees paid during lunch' 
                          : 'Lunch time deducted from pay'
                        }
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => !departmentLoading[department.id] && updateDepartmentBreakSetting(department.id, !isPaidBreak)}
                          disabled={departmentLoading[department.id]}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                            isPaidBreak ? 'bg-green-500' : 'bg-gray-300'
                          }`}
                        >
                          {departmentLoading[department.id] ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Spinner size={12} />
                            </div>
                          ) : (
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                                isPaidBreak ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          )}
                        </button>
                        <span className={`text-sm font-medium transition-colors duration-200 ${
                          departmentLoading[department.id] 
                            ? 'text-orange-600' 
                            : isPaidBreak 
                            ? 'text-green-600' 
                            : 'text-gray-600'
                        }`}>
                          {departmentLoading[department.id] 
                            ? 'Updating...' 
                            : isPaidBreak 
                            ? 'Paid' 
                            : 'Unpaid'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Help Information */}
        <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mt-0.5">
              <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                How Department Lunch Break Policy Works
              </h4>
              <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                <li>• <strong>Paid Breaks:</strong> Employees in this department are paid during lunch breaks</li>
                <li>• <strong>Unpaid Breaks:</strong> Lunch time is deducted from employee pay calculations</li>
                <li>• Changes are applied immediately and affect future payroll calculations</li>
                <li>• Each department can have different lunch break policies</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DepartmentCoffeeBreakPolicyCard({ departments, departmentCoffeeSettings, departmentLoading, updateDepartmentCoffeeSetting, loading }) {
  // Calculate stats for managers
  const totalDepartments = departments.length;
  const departmentsWithCoffeeBreaks = Object.values(departmentCoffeeSettings).filter(s => s.coffeeBreaksAllowed > 0).length;
  const paidCoffeeBreakDepartments = Object.values(departmentCoffeeSettings).filter(s => s.paidCoffeeBreak && s.coffeeBreaksAllowed > 0).length;
  const unpaidCoffeeBreakDepartments = departmentsWithCoffeeBreaks - paidCoffeeBreakDepartments;
  
  // Calculate average total coffee break time across all departments
  const totalCoffeeBreakMinutes = Object.values(departmentCoffeeSettings).reduce((acc, s) => {
    return acc + (s.coffeeBreaksAllowed * s.coffeeBreakMinutes);
  }, 0);
  const avgCoffeeBreakMinutes = totalDepartments > 0 ? (totalCoffeeBreakMinutes / totalDepartments).toFixed(0) : 0;

  return (
    <Card className="border-2 shadow-lg">
      <div className="h-1 w-full bg-orange-500" />
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl font-semibold">
          <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
            <Coffee className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          Department Coffee Break Policy
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Configure coffee break allowances and paid status for each department
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-600">Departments with Breaks</p>
                  <p className="text-2xl font-bold text-amber-600">{departmentsWithCoffeeBreaks}/{totalDepartments}</p>
                </div>
                <Coffee className="h-8 w-8 text-amber-600 opacity-80" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Paid Coffee Breaks</p>
                  <p className="text-2xl font-bold text-green-600">{paidCoffeeBreakDepartments}</p>
                </div>
                <CheckSquare className="h-8 w-8 text-green-600 opacity-80" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-orange-50/50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600">Unpaid Coffee Breaks</p>
                  <p className="text-2xl font-bold text-orange-600">{unpaidCoffeeBreakDepartments}</p>
                </div>
                <Clock className="h-8 w-8 text-orange-600 opacity-80" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-purple-50/50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">Avg Break Time</p>
                  <p className="text-2xl font-bold text-purple-600">{avgCoffeeBreakMinutes}min</p>
                </div>
                <Timer className="h-8 w-8 text-purple-600 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Department Settings */}
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : departments.length === 0 ? (
          <div className="text-center py-8">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">No departments found</p>
            <p className="text-sm text-muted-foreground">Create departments first to configure coffee break policies</p>
          </div>
        ) : (
          <div className="space-y-3">
            {departments.map((department) => {
              const settings = departmentCoffeeSettings[department.id] || {
                coffeeBreaksAllowed: 0,
                coffeeBreakMinutes: 0,
                paidCoffeeBreak: false
              };
              const totalMinutes = settings.coffeeBreaksAllowed * settings.coffeeBreakMinutes;
              const totalHours = (totalMinutes / 60).toFixed(2);
              const hasBreaks = settings.coffeeBreaksAllowed > 0;

              return (
                <div
                  key={department.id}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    hasBreaks && settings.paidCoffeeBreak
                      ? 'bg-green-50/50 border-green-200 dark:bg-green-900/10 dark:border-green-800'
                      : hasBreaks
                      ? 'bg-amber-50/50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800'
                      : 'bg-gray-50/50 border-gray-200 dark:bg-gray-900/10 dark:border-gray-800'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          hasBreaks && settings.paidCoffeeBreak
                            ? 'bg-green-100 dark:bg-green-900/30'
                            : hasBreaks
                            ? 'bg-amber-100 dark:bg-amber-900/30'
                            : 'bg-gray-100 dark:bg-gray-900/30'
                        }`}
                      >
                        <Coffee
                          className={`h-5 w-5 ${
                            hasBreaks && settings.paidCoffeeBreak
                              ? 'text-green-600 dark:text-green-400'
                              : hasBreaks
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-gray-600 dark:text-gray-400'
                          }`}
                        />
                      </div>
                      <div>
                        <h3 className="font-medium">{department.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Department ID: {department.id}
                        </p>
                      </div>
                    </div>
                    
                    {hasBreaks && (
                      <Badge variant={settings.paidCoffeeBreak ? "default" : "secondary"} className="bg-amber-500">
                        {totalMinutes} min ({totalHours}h) Total
                      </Badge>
                    )}
                  </div>

                  <div className="grid md:grid-cols-4 gap-4 items-end">
                    {/* Number of Breaks */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium flex items-center gap-1">
                        <Coffee className="h-3 w-3 text-amber-500" />
                        Coffee Breaks (max 5)
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        max="5"
                        value={settings.coffeeBreaksAllowed}
                        onChange={(e) => {
                          const val = Math.min(5, Math.max(0, parseInt(e.target.value) || 0));
                          updateDepartmentCoffeeSetting(department.id, {
                            coffeeBreaksAllowed: val,
                            coffeeBreakMinutes: settings.coffeeBreakMinutes,
                            paidCoffeeBreak: settings.paidCoffeeBreak
                          });
                        }}
                        className="h-9"
                      />
                    </div>

                    {/* Minutes per Break */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium flex items-center gap-1">
                        <Timer className="h-3 w-3 text-amber-500" />
                        Minutes/Break (max 30)
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        max="30"
                        value={settings.coffeeBreakMinutes}
                        onChange={(e) => {
                          const val = Math.min(30, Math.max(0, parseInt(e.target.value) || 0));
                          updateDepartmentCoffeeSetting(department.id, {
                            coffeeBreaksAllowed: settings.coffeeBreaksAllowed,
                            coffeeBreakMinutes: val,
                            paidCoffeeBreak: settings.paidCoffeeBreak
                          });
                        }}
                        className="h-9"
                      />
                    </div>

                    {/* Total Time Display */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium flex items-center gap-1">
                        <Clock className="h-3 w-3 text-amber-500" />
                        Total Consumable Time
                      </Label>
                      <div className="h-9 px-3 border rounded-md bg-muted/50 flex items-center justify-center font-mono text-sm font-semibold">
                        {totalMinutes} min / {totalHours}h
                      </div>
                    </div>

                    {/* Paid/Unpaid Toggle */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium flex items-center gap-1">
                        <CheckSquare className="h-3 w-3 text-amber-500" />
                        Payment Status
                      </Label>
                      <div className="flex items-center gap-2 h-9">
                        <button
                          onClick={() => {
                            if (!departmentLoading[`coffee_${department.id}`]) {
                              updateDepartmentCoffeeSetting(department.id, {
                                coffeeBreaksAllowed: settings.coffeeBreaksAllowed,
                                coffeeBreakMinutes: settings.coffeeBreakMinutes,
                                paidCoffeeBreak: !settings.paidCoffeeBreak
                              });
                            }
                          }}
                          disabled={departmentLoading[`coffee_${department.id}`]}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                            settings.paidCoffeeBreak ? 'bg-green-500' : 'bg-gray-300'
                          }`}
                        >
                          {departmentLoading[`coffee_${department.id}`] ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Spinner size={12} />
                            </div>
                          ) : (
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                                settings.paidCoffeeBreak ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          )}
                        </button>
                        <span className={`text-xs font-medium transition-colors duration-200 ${
                          departmentLoading[`coffee_${department.id}`]
                            ? 'text-orange-600'
                            : settings.paidCoffeeBreak
                            ? 'text-green-600'
                            : 'text-gray-600'
                        }`}>
                          {departmentLoading[`coffee_${department.id}`]
                            ? 'Saving...'
                            : settings.paidCoffeeBreak
                            ? 'Paid'
                            : 'Unpaid'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Help Information */}
        <div className="bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mt-0.5">
              <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-amber-900 dark:text-amber-100">
                How Department Coffee Break Policy Works
              </h4>
              <ul className="text-xs text-amber-800 dark:text-amber-200 space-y-1">
                <li>• <strong>Maximum Limits:</strong> Up to 5 coffee breaks per day, each up to 30 minutes long</li>
                <li>• <strong>Total Consumable Time:</strong> Calculated as (Breaks × Minutes). Example: 5 breaks × 30 min = 150 min (2.5 hours)</li>
                <li>• <strong>Paid Coffee Breaks:</strong> Employees are paid during coffee breaks</li>
                <li>• <strong>Unpaid Coffee Breaks:</strong> Coffee break time is deducted from employee pay</li>
                <li>• <strong>⚠️ Excess Time Deduction:</strong> If an employee consumes more than the allowed total coffee break time, the excess time will be automatically deducted from their final clock time</li>
                <li>• Changes are applied immediately and affect all future time calculations</li>
                <li>• Each department can have different coffee break allowances and policies</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LeaveTypesCard({ API, token, policies, reload }) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [createName, setCreateName] = useState("");
  const [editName, setEditName] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const processedPolicies = policies.map((policy, index) => ({
    ...policy,
    id: policy.id || index,
    name: policy.leaveType
  }));

  const columns = [
    {
      key: "name",
      label: "Leave Type",
      render: (name) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <Calendar className="h-4 w-4 text-green-600 dark:text-green-400" />
          </div>
          <span className="font-medium">{name}</span>
        </div>
      ),
      sortable: true,
    }
  ];

  const actions = [
    {
      label: "Edit",
      icon: Edit3,
      onClick: (policy) => openEditModal(policy),
      className: "text-orange-600 hover:text-orange-700",
    },
    {
      label: "Delete",
      icon: Trash2,
      onClick: (policy) => openDeleteModal(policy),
      className: "text-red-600 hover:text-red-700",
    },
  ];

  const createLeaveType = async () => {
    if (!createName.trim()) return;
    setCreating(true);
    try {
      const r = await fetch(`${API}/api/leave-policies`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ leaveType: createName.trim() }),
      });
      const j = await r.json();
      if (r.ok) {
        toast.success("Leave type created successfully!");
        setShowCreateModal(false);
        setCreateName("");
        reload();
      } else {
        toast.error(j.message || "Failed to create leave type");
      }
    } catch {
      toast.error("Network error");
    }
    setCreating(false);
  };

  const openEditModal = (policy) => {
    setSelectedPolicy(policy);
    setEditName(policy.leaveType);
    setShowEditModal(true);
  };

  const updateLeaveType = async () => {
    if (!editName.trim() || !selectedPolicy) return;
    setEditing(true);
    try {
      const r = await fetch(`${API}/api/leave-policies/${selectedPolicy.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ leaveType: editName.trim() }),
      });
      const j = await r.json();
      if (r.ok) {
        toast.success("Leave type updated successfully!");
        setShowEditModal(false);
        setSelectedPolicy(null);
        setEditName("");
        reload();
      } else {
        toast.error(j.message || "Failed to update leave type");
      }
    } catch {
      toast.error("Network error");
    }
    setEditing(false);
  };

  const openDeleteModal = (policy) => {
    setSelectedPolicy(policy);
    setShowDeleteModal(true);
  };

  const deleteLeaveType = async () => {
    if (!selectedPolicy) return;
    setDeleting(true);
    try {
      const r = await fetch(`${API}/api/leave-policies/${selectedPolicy.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) {
        toast.success("Leave type deleted successfully!");
        setShowDeleteModal(false);
        setSelectedPolicy(null);
        reload();
      } else {
        const j = await r.json();
        toast.error(j.message || "Failed to delete leave type");
      }
    } catch {
      toast.error("Network error");
    }
    setDeleting(false);
  };

  return (
    <>
      <Card className="border-2 shadow-lg">
        <div className="h-1 w-full bg-orange-500" />
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-xl font-semibold">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <Calendar className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              Manage Leave Types
            </CardTitle>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Leave Type
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            data={processedPolicies}
            columns={columns}
            actions={actions}
            searchPlaceholder="Search leave types..."
            pageSize={10}
            showPagination={false}
          />
        </CardContent>
      </Card>

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <div className="h-1 w-full bg-orange-500 -mt-6 mb-4" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-orange-100 text-orange-500 dark:bg-orange-900/30 dark:text-orange-400">
                <Plus className="h-5 w-5" />
              </div>
              Create Leave Type
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Leave Type Name <span className="text-orange-500">*</span></label>
              <Input
                placeholder="e.g. Vacation, Sick Leave, Personal Leave"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !creating) {
                    createLeaveType();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateModal(false);
                setCreateName("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={createLeaveType}
              disabled={creating || !createName.trim()}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <div className="h-1 w-full bg-orange-500 -mt-6 mb-4" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-orange-100 text-orange-500 dark:bg-orange-900/30 dark:text-orange-400">
                <Edit3 className="h-5 w-5" />
              </div>
              Edit Leave Type
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Leave Type Name <span className="text-orange-500">*</span></label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !editing) {
                    updateLeaveType();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditModal(false);
                setSelectedPolicy(null);
                setEditName("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={updateLeaveType}
              disabled={editing || !editName.trim()}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {editing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Edit3 className="h-4 w-4 mr-2" />}
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="sm:max-w-md">
          <div className="h-1 w-full bg-red-500 -mt-6 mb-4" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400">
                <AlertCircle className="h-5 w-5" />
              </div>
              Delete Leave Type
            </DialogTitle>
          </DialogHeader>
          {selectedPolicy && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
              <p className="text-sm text-red-600 dark:text-red-400">
                Are you sure you want to delete "<strong>{selectedPolicy.leaveType}</strong>"? This action cannot be undone.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteModal(false);
                setSelectedPolicy(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={deleteLeaveType}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function LeaveAdminCard({ token, API, leaveTypes, matrix, loadingMatrix, errorMessage, reload }) {
  const userOptions = matrix.map((r) => ({
    value: r.userId,
    label: `${r.fullName} (${r.email})`,
  }));
  const [userId, setUserId] = useState("");
  const [typesSel, setTypesSel] = useState([]);
  const [hours, setHours] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => setTypesSel(leaveTypes), [leaveTypes]);
  const debouncedSetUserId = useCallback((v) => setUserId(v), []);
  const handleTypeToggle = (t) => setTypesSel((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));

  const applyAdjust = async () => {
    const hrs = Number(hours);
    if (!userId || hrs === 0 || isNaN(hrs)) {
      toast.error("Select employee and hours ≠ 0");
      return;
    }
    if (!typesSel.length) {
      toast.error("Choose at least one leave type");
      return;
    }
    setSaving(true);
    try {
      const r = await fetch(`${API}/api/leave-balances/adjust`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetUserId: userId,
          leaveTypes: typesSel,
          hours: hrs,
        }),
      });
      const j = await r.json();
      if (r.ok) {
        toast.success("Balances adjusted successfully!");
        setHours("");
        reload();
      } else toast.error(j.message || "Failed to adjust balances");
    } catch {
      toast.error("Network error");
    }
    setSaving(false);
  };

  return (
    <Card className="border-2 shadow-lg">
      <div className="h-1 w-full bg-orange-500" />
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl font-semibold">
          <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
            <Award className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          Leave Credits Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Adjustment Controls */}
        <Card className="bg-orange-50/50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800">
          <CardContent className="p-4">
            <div className="grid md:grid-cols-4 gap-4 items-end">
              <div className="space-y-2">
                <label className="text-sm font-medium flex gap-2 items-center">
                  <User className="h-4 w-4 text-orange-500" /> Employee
                </label>
                <Select value={userId} onValueChange={debouncedSetUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {userOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex gap-2 items-center">
                  <CheckSquare className="h-4 w-4 text-orange-500" /> Leave Types
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full">
                      {typesSel.length === leaveTypes.length && leaveTypes.length
                        ? "All types"
                        : typesSel.length
                        ? `${typesSel.length} selected`
                        : "Select leave types"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64">
                    <div className="space-y-2">
                      {leaveTypes.map((t) => (
                        <div key={t} className="flex items-center space-x-2">
                          <Checkbox checked={typesSel.includes(t)} onCheckedChange={() => handleTypeToggle(t)} />
                          <label className="text-sm">{t}</label>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex gap-2 items-center">
                  <Timer className="h-4 w-4 text-orange-500" /> Adjust Hours (±)
                </label>
                <Input type="number" step="0.25" value={hours} onChange={(e) => setHours(e.target.value)} />
              </div>
              <Button
                disabled={saving || loadingMatrix}
                onClick={applyAdjust}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckSquare className="h-4 w-4 mr-2" />}
                Apply
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Employee Leave Credits Table */}
        {loadingMatrix ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : errorMessage ? (
          <div className="flex justify-center items-center text-red-500 gap-2 p-8">
            <AlertCircle className="h-5 w-5" /> {errorMessage}
          </div>
        ) : matrix.length === 0 ? (
          <div className="text-center text-muted-foreground p-8">No leave balance data available</div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead className="font-semibold">Employee</TableHead>
                    <TableHead className="font-semibold">Email</TableHead>
                    {leaveTypes.map((t) => (
                      <TableHead key={t} className="text-center font-semibold">
                        <div className="space-y-1">
                          <div>{t}</div>
                          <div className="text-xs font-normal flex justify-center gap-3 text-muted-foreground">
                            <span>Credits</span>
                            <span>Used</span>
                            <span>Available</span>
                          </div>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matrix.map((row) => (
                    <TableRow key={row.userId} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{row.fullName}</TableCell>
                      <TableCell className="text-muted-foreground">{row.email}</TableCell>
                      {leaveTypes.map((t) => {
                        const cell = row.balances[t];
                        return (
                          <TableCell key={t} className="text-center">
                            <div className="flex justify-center gap-3 bg-muted/30 rounded-md py-1 px-2 text-sm font-mono">
                              <span className="text-green-600 font-medium">{cell.credits.toFixed(2)}</span>
                              <span className="text-red-600 font-medium">{cell.used.toFixed(2)}</span>
                              <span className="text-blue-600 font-medium">{cell.available.toFixed(2)}</span>
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}