"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { 
  Calendar, 
  Clock, 
  User, 
  AlertCircle, 
  Pencil, 
  Trash2,
  Plus,
  Filter,
  Users,
  CalendarDays,
  TrendingUp,
  Edit3,
  RefreshCw,
  Search,
  Building,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Shield,
  Zap,
  UserCheck,
  UserX,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { RRule } from "rrule";
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
import { Separator } from "@/components/ui/separator";
import ConflictModal from './ConflictModal';

export default function ModernCompanySchedules() {
  const { token, role } = useAuthStore();
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  
  useEffect(() => {
    if (role && !["admin", "superadmin", "supervisor"].includes(role.toLowerCase())) window.location.href = "/dashboard";
    if (!token) {
      toast.error("Session expired. Please log in again.");
      window.location.href = "/login";
    }
  }, [role, token]);

  // Day mappings from original code
  const DAY_OPTIONS = [
    { value: "MO", label: "MO" },
    { value: "TU", label: "TU" },
    { value: "WE", label: "WE" },
    { value: "TH", label: "TH" },
    { value: "FR", label: "FR" },
    { value: "SA", label: "SA" },
    { value: "SU", label: "SU" },
  ];

  const NUM_TO_CODE = { 0: "MO", 1: "TU", 2: "WE", 3: "TH", 4: "FR", 5: "SA", 6: "SU" };
  const DAY_NAME = { 
    MO: "Mon", 
    TU: "Tue", 
    WE: "Wed", 
    TH: "Thu", 
    FR: "Fri", 
    SA: "Sat", 
    SU: "Sun" 
  };

  const DAY_DISPLAY = {
    MO: "Mon",
    TU: "Tue", 
    WE: "Wed",
    TH: "Thu",
    FR: "Fri",
    SA: "Sat",
    SU: "Sun",
    // Handle numeric values that might come from the backend
    0: "Sun",
    1: "Mon", 
    2: "Tue",
    3: "Wed",
    4: "Thu",
    5: "Fri",
    6: "Sat"
  };

  // RRule parsing function from original code
  const parseRRule = (str) => {
    try {
      const rule = RRule.fromString(str);
      return rule.options.byweekday.map((w) => {
        // Handle RRule weekday objects
        if (typeof w === 'object' && w.weekday !== undefined) {
          return NUM_TO_CODE[w.weekday] || w.weekday.toString();
        }
        // Handle direct weekday numbers
        if (typeof w === 'number') {
          return NUM_TO_CODE[w] || w.toString();
        }
        // Handle string representations
        const dayStr = w.toString();
        if (dayStr.length >= 2) {
          return dayStr.slice(0, 2).toUpperCase();
        }
        return NUM_TO_CODE[parseInt(dayStr)] || dayStr;
      });
    } catch {
      // Fallback parsing for malformed RRule strings
      const m = str.match(/BYDAY=([^;]+)/i);
      if (!m) return [];
      return m[1].split(",").map((s) => {
        const trimmed = s.trim();
        // Handle numeric days
        if (/^\d+$/.test(trimmed)) {
          return NUM_TO_CODE[parseInt(trimmed)] || trimmed;
        }
        // Handle 2-letter day codes
        if (trimmed.length >= 2) {
          return trimmed.slice(0, 2).toUpperCase();
        }
        return trimmed;
      });
    }
  };

  // Build RRule function
  const buildRRule = (byday, startISO) =>
    new RRule({
      freq: RRule.WEEKLY,
      byweekday: byday.map((d) => RRule[d]).filter(Boolean),
      dtstart: new Date(startISO),
    }).toString();

  const [schedules, setSchedules] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterUser, setFilterUser] = useState("all");
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [conflictData, setConflictData] = useState(null);
  
  // Multi-step modal states
  const [modalStep, setModalStep] = useState(1); // 1: Form, 2: Conflict Preview
  const [conflictPreview, setConflictPreview] = useState(null);
  const [resolutionChoices, setResolutionChoices] = useState({});
  const [preflightLoading, setPreflightLoading] = useState(false);
  
  // Progress tracking states
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState("");
  const [totalUsers, setTotalUsers] = useState(0);
  
  // Tab state for conflict preview
  const [activeTab, setActiveTab] = useState('successful');
  
  // Stats state - will be populated from API
  const [stats, setStats] = useState({ 
    totalSchedules: 0, 
    activeSchedules: 0, 
    assignedEmployees: 0, 
    averageDaysPerSchedule: 0 
  });
  
  // Form states - using RRule compatible structure
  const [scheduleForm, setScheduleForm] = useState({
    shiftId: "",
    byday: [],
    startDate: "",
    endDate: "", // Now required
    assignedUserId: "",
    assignedToAll: false,
    assignedToDepartment: false,
    departmentId: ""
  });

  // NEW: Validation function to check if all required fields are filled
  const isFormValid = () => {
    // Basic required fields
    if (!scheduleForm.shiftId || scheduleForm.byday.length === 0 || !scheduleForm.startDate || !scheduleForm.endDate) {
      return false;
    }

    // Assignment validation
    const assignmentCount = [
      scheduleForm.assignedToAll, 
      scheduleForm.assignedToDepartment, 
      !!scheduleForm.assignedUserId
    ].filter(Boolean).length;

    if (assignmentCount !== 1) {
      return false;
    }

    // Specific assignment validation
    if (scheduleForm.assignedToDepartment && !scheduleForm.departmentId) {
      return false;
    }

    if (!scheduleForm.assignedToAll && !scheduleForm.assignedToDepartment && !scheduleForm.assignedUserId) {
      return false;
    }

    // Date validation - end date must be after start date
    if (scheduleForm.startDate && scheduleForm.endDate) {
      const start = new Date(scheduleForm.startDate);
      const end = new Date(scheduleForm.endDate);
      if (end < start) {
        return false;
      }
    }

    return true;
  };

  // NEW: Function to check if all conflicts have resolutions
  const areAllConflictsResolved = () => {
    if (!conflictPreview || !conflictPreview.conflicts || conflictPreview.conflicts.length === 0) {
      return true; // No conflicts, so all are "resolved"
    }

    // Get unique user IDs from conflicts
    const uniqueUserIds = [...new Set(conflictPreview.conflicts.map(c => c.userId))];

    // Check if every user has a resolution choice
    return uniqueUserIds.every(userId => {
      const resolution = resolutionChoices[userId];
      if (!resolution) return false;

      // If multi-schedule is selected, check if times are filled
      if (resolution === 'MULTI_SCHEDULE') {
        const firstStart = resolutionChoices[`${userId}_firstStart`];
        const firstEnd = resolutionChoices[`${userId}_firstEnd`];
        const secondStart = resolutionChoices[`${userId}_secondStart`];
        const secondEnd = resolutionChoices[`${userId}_secondEnd`];

        if (!firstStart || !firstEnd || !secondStart || !secondEnd) {
          return false;
        }

        // Validate time logic
        if (firstStart >= firstEnd || secondStart >= secondEnd) {
          return false;
        }

        // Ensure second schedule starts after first ends
        if (secondStart <= firstEnd) {
          return false;
        }
      }

      return true;
    });
  };

  // Day options for shift scheduling - using RRule format
  const dayOptions = [
    { value: "MO", label: "Mon", color: "bg-blue-500" },
    { value: "TU", label: "Tue", color: "bg-green-500" },
    { value: "WE", label: "Wed", color: "bg-yellow-500" },
    { value: "TH", label: "Thu", color: "bg-purple-500" },
    { value: "FR", label: "Fri", color: "bg-pink-500" },
    { value: "SA", label: "Sat", color: "bg-orange-500" },
    { value: "SU", label: "Sun", color: "bg-red-500" }
  ];

  // Fetch stats from backend
  const fetchStats = async () => {
    try {
      const statsRes = await fetch(`${API_URL}/api/company/me/schedule-stats`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.data);
      } else {
        // Fallback to manual calculation if API fails
        const manualStats = calculateStatsManually();
        setStats(manualStats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Fallback to manual calculation
      const manualStats = calculateStatsManually();
      setStats(manualStats);
    }
  };

  // Manual stats calculation as fallback
  const calculateStatsManually = () => {
    const totalSchedules = schedules.length;
    const activeSchedules = schedules.filter(s => {
      const today = new Date();
      const endDate = s.endDate ? new Date(s.endDate) : null;
      return !endDate || endDate >= today;
    }).length;
    const uniqueEmployees = new Set(schedules.map(s => s.assignedUserId)).size;
    const averageDaysPerSchedule = schedules.length > 0 
      ? (schedules.reduce((acc, s) => {
          const days = s.recurrencePattern ? parseRRule(s.recurrencePattern) : [];
          return acc + days.length;
        }, 0) / schedules.length).toFixed(1)
      : 0;
    
    return { totalSchedules, activeSchedules, assignedEmployees: uniqueEmployees, averageDaysPerSchedule };
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [schRes, shiftRes, userRes, deptRes] = await Promise.all([
        fetch(`${API_URL}/api/shiftschedules`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/api/shifts`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/api/employee?all=1`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/api/departments`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const [schData, shiftData, userData, deptData] = await Promise.all([
        schRes.json(),
        shiftRes.json(),
        userRes.json(),
        deptRes.json(),
      ]);
      
      if (schRes.ok) setSchedules(schData.data || []);
      else toast.error(schData.error || "Schedules error");
      
      if (shiftRes.ok) setShifts(shiftData.data || []);
      else toast.error(shiftData.error || "Shifts error");
      
      if (userRes.ok) setEmployees(userData.data || []);
      else toast.error(userData.error || "Users error");
      
      if (deptRes.ok) setDepartments(deptData.data || []);
      else toast.error(deptData.error || "Departments error");

      // Fetch stats after data is loaded
      await fetchStats();
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setScheduleForm({
      shiftId: "",
      byday: [],
      startDate: "",
      endDate: "", // Now required
      assignedUserId: "",
      assignedToAll: false,
      assignedToDepartment: false,
      departmentId: ""
    });
    setModalStep(1);
    setConflictPreview(null);
    setResolutionChoices({});
  };

  const handleDayToggle = (day) => {
    setScheduleForm(prev => ({
      ...prev,
      byday: prev.byday.includes(day)
        ? prev.byday.filter(d => d !== day)
        : [...prev.byday, day]
    }));
  };

  // Preflight conflict check function with progress tracking
  const handlePreflightCheck = async () => {
    // Use the new validation function
    if (!isFormValid()) {
      toast.error("Please fill in all required fields correctly");
      return;
    }

    setPreflightLoading(true);
    setLoadingProgress(0);
    setLoadingStatus("Initializing conflict check...");
    
    try {
      const recurrencePattern = buildRRule(scheduleForm.byday, scheduleForm.startDate);
      
      // Step 1: Prepare payload
      setLoadingProgress(10);
      setLoadingStatus("Preparing schedule data...");
      
      const payload = {
        shiftId: scheduleForm.shiftId,
        recurrencePattern,
        startDate: scheduleForm.startDate,
        endDate: scheduleForm.endDate, // Now always included
        assignedToAll: scheduleForm.assignedToAll,
        assignedToDepartment: scheduleForm.assignedToDepartment,
        departmentId: scheduleForm.assignedToDepartment ? scheduleForm.departmentId : null,
        assignedUserId: scheduleForm.assignedToAll || scheduleForm.assignedToDepartment ? null : scheduleForm.assignedUserId,
        preflightCheck: true
      };

      // Step 2: Start request
      setLoadingProgress(25);
      setLoadingStatus("Contacting server...");
      
      await new Promise(resolve => setTimeout(resolve, 500)); // Brief pause for UX

      // Step 3: Send request with progress simulation
      setLoadingProgress(40);
      setLoadingStatus("Analyzing employee schedules...");

      const response = await fetch(`${API_URL}/api/shiftschedules/preflight-check`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      setLoadingProgress(70);
      setLoadingStatus("Detecting conflicts...");
      
      const data = await response.json();

      setLoadingProgress(90);
      setLoadingStatus("Finalizing results...");

      if (response.ok) {
        setTotalUsers(data.summary?.totalUsers || 0);
        setConflictPreview(data);
        setModalStep(2); // Move to conflict preview step
        
        // Initialize resolution choices for conflicted employees
        const initialChoices = {};
        if (data.conflicts && data.conflicts.length > 0) {
          // Get unique user IDs from conflicts
          const uniqueUserIds = [...new Set(data.conflicts.map(c => c.userId))];
          uniqueUserIds.forEach(userId => {
            initialChoices[userId] = 'SKIP_NEW'; // Default to keeping existing
          });
        }
        setResolutionChoices(initialChoices);
        
        setLoadingProgress(100);
        setLoadingStatus("Complete!");
        
        // Show success message
        toast.success(`Analysis complete! ${data.summary?.successfulUsers || 0} employees ready, ${data.summary?.conflictedUsers || 0} conflicts found.`);
      } else {
        toast.error(data.message || "Failed to check for conflicts");
      }
    } catch (error) {
      console.error("Preflight check error:", error);
      setLoadingStatus("Error occurred");
      toast.error("An error occurred while checking for conflicts");
    } finally {
      setPreflightLoading(false);
      setLoadingProgress(0);
      setLoadingStatus("");
    }
  };

  // Create schedule function with enhanced conflict resolution
  const handleCreateSchedule = async () => {
    // Additional validation before creating
    if (!areAllConflictsResolved()) {
      toast.error("Please resolve all conflicts before creating the schedule");
      return;
    }

    setSaving(true);
    setLoadingProgress(0);
    setLoadingStatus("Creating schedule...");
    
    try {
      const recurrencePattern = buildRRule(scheduleForm.byday, scheduleForm.startDate);
      
      setLoadingProgress(20);
      setLoadingStatus("Preparing assignments...");
      
      // Build schedule data for multi-schedule conflicts
      const enhancedResolutionChoices = {};
      Object.keys(resolutionChoices).forEach(key => {
        if (key.includes('_applyToAll') || key.includes('_firstStart') || key.includes('_firstEnd') || key.includes('_secondStart') || key.includes('_secondEnd')) {
          // Skip these, they're handled separately
          return;
        }
        
        const userId = key;
        const resolution = resolutionChoices[userId];
        
        if (resolution === 'MULTI_SCHEDULE') {
          enhancedResolutionChoices[userId] = {
            resolution: 'MULTI_SCHEDULE',
            applyToAllRecurring: resolutionChoices[`${userId}_applyToAll`] || false,
            scheduleData: {
              firstSchedule: {
                startTime: resolutionChoices[`${userId}_firstStart`] || "08:00",
                endTime: resolutionChoices[`${userId}_firstEnd`] || "17:00"
              },
              secondSchedule: {
                startTime: resolutionChoices[`${userId}_secondStart`] || "18:00",
                endTime: resolutionChoices[`${userId}_secondEnd`] || "22:00"
              }
            }
          };
        } else {
          enhancedResolutionChoices[userId] = resolution;
        }
      });
      
      const payload = {
        shiftId: scheduleForm.shiftId,
        recurrencePattern,
        startDate: scheduleForm.startDate,
        endDate: scheduleForm.endDate, // Now always included
        assignedToAll: scheduleForm.assignedToAll,
        assignedToDepartment: scheduleForm.assignedToDepartment,
        departmentId: scheduleForm.assignedToDepartment ? scheduleForm.departmentId : null,
        assignedUserId: scheduleForm.assignedToAll || scheduleForm.assignedToDepartment ? null : scheduleForm.assignedUserId,
        applyToAllRecurringConflicts: true,
        resolution: "replace",
        conflictResolutions: enhancedResolutionChoices,
      };

      setLoadingProgress(40);
      setLoadingStatus("Saving to database...");

      const response = await fetch(`${API_URL}/api/shiftschedules/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      setLoadingProgress(70);
      setLoadingStatus("Processing assignments...");

      const data = await response.json();

      setLoadingProgress(90);
      setLoadingStatus("Finalizing...");

      if (response.ok) {
        setLoadingProgress(100);
        setLoadingStatus("Complete!");
        
        toast.success(data.message || "Schedule created successfully!");
        setShowCreateModal(false);
        resetForm();
        await fetchAll();
      } else {
        setLoadingStatus("Error occurred");
        toast.error(data.message || "Failed to create schedule");
      }
    } catch (error) {
      console.error("Create schedule error:", error);
      setLoadingStatus("Error occurred");
      toast.error("An error occurred while creating the schedule");
    } finally {
      setSaving(false);
      setLoadingProgress(0);
      setLoadingStatus("");
    }
  };

  const handleEditSchedule = async () => {
    if (!selectedSchedule || !isFormValid()) {
      toast.error("Please fill in all required fields correctly");
      return;
    }

    setSaving(true);
    try {
      const recurrencePattern = buildRRule(scheduleForm.byday, scheduleForm.startDate);
      
      const payload = {
        recurrencePattern,
        startDate: scheduleForm.startDate,
        endDate: scheduleForm.endDate, // Now always included
        assignedToAll: scheduleForm.assignedToAll,
        assignedToDepartment: scheduleForm.assignedToDepartment,
        departmentId: scheduleForm.assignedToDepartment ? scheduleForm.departmentId : null,
        assignedUserId: scheduleForm.assignedToAll || scheduleForm.assignedToDepartment ? null : scheduleForm.assignedUserId
      };

      const response = await fetch(`${API_URL}/api/shiftschedules/${selectedSchedule.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        // Handle conflicts if they exist
        if (data.conflicts && data.conflicts.count > 0) {
          setConflictData(data.conflicts);
          toast.warning(
            `Schedule updated with ${data.conflicts.count} conflicts. Click to resolve.`,
            {
              duration: 8000,
              action: {
                label: "Resolve Conflicts",
                onClick: () => setShowConflictModal(true)
              }
            }
          );
        } else {
          toast.success(data.message || "Schedule updated successfully!");
        }
        
        setShowEditModal(false);
        setSelectedSchedule(null);
        resetForm();
        await fetchAll();
      } else {
        toast.error(data.message || "Failed to update schedule");
      }
    } catch (error) {
      console.error("Update schedule error:", error);
      toast.error("An error occurred while updating the schedule");
    } finally {
      setSaving(false);
    }
  };

  const handleConflictClick = async (scheduleId) => {
    try {
      const response = await fetch(`${API_URL}/api/conflicts/schedule/${scheduleId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (response.ok) {
        setConflictData({
          count: data.data.length,
          details: data.data,
          totalAffectedUsers: [...new Set(data.data.map(c => c.userId))].length
        });
        setShowConflictModal(true);
      } else {
        toast.error(data.message || "Failed to fetch conflicts");
      }
    } catch (error) {
      console.error("Error fetching conflicts:", error);
      toast.error("Failed to fetch conflicts");
    }
  };

  const handleDeleteSchedule = async () => {
    if (!selectedSchedule) return;

    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/shiftschedules/${selectedSchedule.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Schedule "${selectedSchedule.shift?.shiftName}" deleted successfully!`);
        setShowDeleteModal(false);
        setSelectedSchedule(null);
        await fetchAll();
      } else {
        toast.error(data.message || "Failed to delete schedule");
      }
    } catch (error) {
      console.error("Delete schedule error:", error);
      toast.error("An error occurred while deleting the schedule");
    } finally {
      setSaving(false);
    }
  };

  const handleEditClick = (schedule) => {
    const days = parseRRule(schedule.recurrencePattern);
    
    setSelectedSchedule(schedule);
    setScheduleForm({
      shiftId: schedule.shiftId.toString(),
      byday: days,
      startDate: new Date(schedule.startDate).toISOString().split('T')[0],
      endDate: schedule.endDate ? new Date(schedule.endDate).toISOString().split('T')[0] : "",
      assignedUserId: schedule.assignedUserId || "",
      assignedToAll: schedule.assignedToAll || false,
      assignedToDepartment: schedule.assignedToDepartment || false,
      departmentId: schedule.departmentId || ""
    });
    setShowEditModal(true);
  };

  const handleDeleteClick = (schedule) => {
    setSelectedSchedule(schedule);
    setShowDeleteModal(true);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  };

  // Handle conflict resolution choice change
  const handleResolutionChoice = (userId, choice) => {
    setResolutionChoices(prev => ({
      ...prev,
      [userId]: choice
    }));
  };

  // Filter schedules based on search and user filter
  const filteredSchedules = useMemo(() => {
    return schedules.filter(schedule => {
      const matchesSearch = searchQuery === "" || 
        schedule.shift?.shiftName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        schedule.assignedUser?.email.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesUser = filterUser === "all" || schedule.assignedUserId === filterUser;
      
      return matchesSearch && matchesUser;
    });
  }, [schedules, searchQuery, filterUser]);

  useEffect(() => {
    fetchAll();
  }, []);

  if (loading) {
    return (
      <div className="max-w-full mx-auto p-4 lg:px-10 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-4">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-10 w-48" />
              </div>
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="max-w-full mx-auto p-4 lg:px-10 space-y-8">
        <Toaster position="top-center" />
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Calendar className="h-8 w-8 text-orange-500" />
              Company Schedules
            </h1>
            <p className="text-muted-foreground">
              Create and manage recurring shift schedules with proactive conflict resolution
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Schedule
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Schedules</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.totalSchedules}</div>
              <p className="text-xs text-muted-foreground">Active shift schedules</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Schedules</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.activeSchedules}</div>
              <p className="text-xs text-muted-foreground">Currently running</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assigned Employees</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.assignedEmployees}</div>
              <p className="text-xs text-muted-foreground">Unique employees</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Days/Schedule</CardTitle>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.averageDaysPerSchedule}</div>
              <p className="text-xs text-muted-foreground">Days per week</p>
            </CardContent>
          </Card>
        </div>

        {/* Table Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Table Controls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search shifts, employees..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={filterUser} onValueChange={setFilterUser}>
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue placeholder="Filter by Employee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All employees</SelectItem>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.profile?.firstName} {emp.profile?.lastName} ({emp.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Schedules Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Shift Schedules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Shift</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead>Assignment</TableHead>
                    <TableHead>Conflicts</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSchedules.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        {searchQuery || filterUser !== "all" ? "No schedules match your filters" : "No schedules found"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSchedules.map((schedule) => {
                      const days = parseRRule(schedule.recurrencePattern);
                      const user = employees.find(emp => emp.id === schedule.assignedUserId);
                      const department = departments.find(dept => dept.id === schedule.departmentId);
                      
                      return (
                        <TableRow key={schedule.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                                <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                              </div>
                              <span className="font-medium">{schedule.shift?.shiftName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {days.map(day => (
                                <Badge
                                  key={day}
                                  variant="secondary"
                                  className="text-xs px-2 py-1"
                                >
                                  {DAY_DISPLAY[day]}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            {new Date(schedule.startDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {schedule.endDate ? new Date(schedule.endDate).toLocaleDateString() : "Ongoing"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {schedule.assignedToAll ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                                    <Users className="h-3 w-3 text-green-600 dark:text-green-400" />
                                  </div>
                                  <span className="text-sm font-medium text-green-600 dark:text-green-400">
                                    All Employees
                                  </span>
                                </div>
                              ) : schedule.assignedToDepartment ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                                    <Building className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                                  </div>
                                  <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                                    {department?.name || "Department"}
                                  </span>
                                </div>
                              ) : user ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                                    <User className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                                  </div>
                                  <span className="text-sm">
                                    {user.profile?.firstName} {user.profile?.lastName}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 bg-gray-100 dark:bg-gray-900/30 rounded-full flex items-center justify-center">
                                    <AlertCircle className="h-3 w-3 text-gray-600 dark:text-gray-400" />
                                  </div>
                                  <span className="text-sm text-gray-500">Unassigned</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {schedule.pendingConflicts > 0 ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge 
                                    variant="destructive" 
                                    className="gap-1 cursor-pointer hover:bg-red-600 transition-colors"
                                    onClick={() => handleConflictClick(schedule.id)}
                                  >
                                    <AlertTriangle className="h-3 w-3" />
                                    {schedule.pendingConflicts} conflicts
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>Click to resolve conflicts</TooltipContent>
                              </Tooltip>
                            ) : (
                              <Badge variant="outline" className="gap-1 text-green-600">
                                <CheckCircle className="h-3 w-3" />
                                No conflicts
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(schedule.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditClick(schedule)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit schedule</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteClick(schedule)}
                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete schedule</TooltipContent>
                              </Tooltip>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* ENHANCED: Multi-Step Create/Edit Modal with Progress Overlay */}
        <ScheduleModal
          isOpen={showCreateModal || showEditModal}
          onClose={() => {
            setShowCreateModal(false);
            setShowEditModal(false);
            setSelectedSchedule(null);
            resetForm();
          }}
          title={showCreateModal ? "Create New Schedule" : "Edit Schedule"}
          modalStep={modalStep}
          setModalStep={setModalStep}
          scheduleForm={scheduleForm}
          setScheduleForm={setScheduleForm}
          dayOptions={dayOptions}
          handleDayToggle={handleDayToggle}
          employees={employees}
          shifts={shifts}
          departments={departments}
          onNext={handlePreflightCheck}
          onSubmit={showCreateModal ? handleCreateSchedule : handleEditSchedule}
          saving={saving}
          preflightLoading={preflightLoading}
          isEdit={showEditModal}
          conflictPreview={conflictPreview}
          resolutionChoices={resolutionChoices}
          onResolutionChoice={handleResolutionChoice}
          // Progress tracking props
          loadingProgress={loadingProgress}
          loadingStatus={loadingStatus}
          totalUsers={totalUsers}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isFormValid={isFormValid}
          areAllConflictsResolved={areAllConflictsResolved}
        />

        {/* Conflict Resolution Modal */}
        <ConflictModal
          isOpen={showConflictModal}
          onClose={() => setShowConflictModal(false)}
          conflictData={conflictData}
          token={token}
          API_URL={API_URL}
          onResolved={() => {
            setShowConflictModal(false);
            setConflictData(null);
            fetchAll();
          }}
        />

        {/* Delete Modal */}
        <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
          <DialogContent className="sm:max-w-md">
            <div className="h-1 w-full bg-red-500 -mt-6 mb-4" />
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400">
                  <AlertCircle className="h-5 w-5" />
                </div>
                Delete Schedule
              </DialogTitle>
            </DialogHeader>
            {selectedSchedule && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
                <p className="text-sm text-red-600 dark:text-red-400">
                  Are you sure you want to delete the schedule "<strong>{selectedSchedule.shift?.shiftName}</strong>"? 
                  This action cannot be undone.
                </p>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedSchedule(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={saving}
                onClick={handleDeleteSchedule}
              >
                {saving ? <Spinner size={16} className="mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

// ENHANCED: Multi-Step Schedule Modal Component with Stricter Validation
function ScheduleModal({ 
  isOpen, 
  onClose, 
  title, 
  modalStep,
  setModalStep,
  scheduleForm, 
  setScheduleForm, 
  dayOptions, 
  handleDayToggle, 
  employees,
  shifts,
  departments,
  onNext,
  onSubmit, 
  saving,
  preflightLoading,
  isEdit,
  conflictPreview,
  resolutionChoices,
  onResolutionChoice,
  // Progress props
  loadingProgress,
  loadingStatus,
  totalUsers,
  activeTab,
  setActiveTab,
  // NEW: Validation props
  isFormValid,
  areAllConflictsResolved
}) {
  
  const handleBackToForm = () => {
    setModalStep(1);
  };

  // Function to get field-specific errors
  const getFieldError = (field) => {
    switch (field) {
      case 'shift':
        return !scheduleForm.shiftId ? "Please select a shift" : "";
      case 'days':
        return scheduleForm.byday.length === 0 ? "Please select at least one day" : "";
      case 'startDate':
        return !scheduleForm.startDate ? "Please select a start date" : "";
      case 'endDate':
        if (!scheduleForm.endDate) return "Please select an end date";
        if (scheduleForm.startDate && scheduleForm.endDate) {
          const start = new Date(scheduleForm.startDate);
          const end = new Date(scheduleForm.endDate);
          if (end < start) return "End date must be after start date";
        }
        return "";
      case 'assignment':
        const assignmentCount = [
          scheduleForm.assignedToAll, 
          scheduleForm.assignedToDepartment, 
          !!scheduleForm.assignedUserId
        ].filter(Boolean).length;
        if (assignmentCount === 0) return "Please select an assignment type";
        if (assignmentCount > 1) return "Please select only one assignment type";
        if (scheduleForm.assignedToDepartment && !scheduleForm.departmentId) return "Please select a department";
        if (!scheduleForm.assignedToAll && !scheduleForm.assignedToDepartment && !scheduleForm.assignedUserId) return "Please select an employee";
        return "";
      default:
        return "";
    }
  };

  const renderProgressOverlay = () => {
    if (!preflightLoading && !saving) return null;
    
    return (
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="mb-4">
              <Spinner size={32} className="mx-auto" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {preflightLoading ? 'Analyzing Schedules' : 'Creating Schedule'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {loadingStatus || (preflightLoading ? 'Checking for conflicts...' : 'Processing assignments...')}
            </p>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-4">
              <div 
                className="bg-orange-500 h-3 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${loadingProgress}%` }}
              ></div>
            </div>
            
            <div className="text-xs text-muted-foreground">
              {preflightLoading && totalUsers > 0 && (
                <span>Checking {totalUsers} employees for conflicts</span>
              )}
              {loadingProgress > 0 && (
                <span className="block mt-1">{loadingProgress}% complete</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-6">
      <div className="flex items-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          modalStep === 1 ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-600'
        }`}>
          1
        </div>
        <div className={`w-12 h-0.5 mx-2 ${modalStep === 2 ? 'bg-orange-500' : 'bg-gray-200'}`} />
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          modalStep === 2 ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-500'
        }`}>
          2
        </div>
      </div>
    </div>
  );

  const renderConflictPreview = () => {
    if (!conflictPreview) return null;

    const { successful = [], conflicts = [] } = conflictPreview;

    return (
      <div className="space-y-6">
        {/* Summary */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-medium text-blue-900 dark:text-blue-100">Assignment Preview</h3>
          </div>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            We've analyzed your schedule request. {successful.length} employees can be assigned successfully, 
            while {conflicts.length} employees have scheduling conflicts that need your attention.
          </p>
          {conflicts.length > 0 && !areAllConflictsResolved() && (
            <div className="mt-3 p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-md border border-yellow-200 dark:border-yellow-700">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
                  Please resolve all conflicts before creating the schedule
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Custom Tabs */}
        <div className="w-full">
          {/* Tab Headers */}
          <div className="grid grid-cols-2 bg-muted rounded-lg p-1 mb-4">
            <button
              onClick={() => setActiveTab('successful')}
              className={`flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                activeTab === 'successful'
                  ? 'bg-white dark:bg-gray-800 shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <UserCheck className="h-4 w-4" />
              Ready to Assign ({successful.length})
            </button>
            <button
              onClick={() => setActiveTab('conflicts')}
              className={`flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                activeTab === 'conflicts'
                  ? 'bg-white dark:bg-gray-800 shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <UserX className="h-4 w-4" />
              Conflicts ({conflicts.length})
            </button>
          </div>

          {/* Tab Content */}
          <div className="max-h-96 overflow-y-auto">
            {activeTab === 'successful' && (
              <div className="space-y-4">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <h4 className="font-medium text-green-900 dark:text-green-100">
                      Employees Ready for Assignment
                    </h4>
                  </div>
                  {successful.length === 0 ? (
                    <p className="text-sm text-green-700 dark:text-green-300">
                      No employees are ready for assignment due to conflicts.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {successful.map((emp) => (
                        <div key={emp.id} className="flex items-center gap-3 p-2 bg-white dark:bg-gray-800 rounded border">
                          <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                            <User className="h-4 w-4 text-green-600 dark:text-green-400" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{emp.profile?.firstName} {emp.profile?.lastName}</p>
                            <p className="text-xs text-muted-foreground">{emp.email}</p>
                          </div>
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'conflicts' && (
              <div className="space-y-4">
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    <h4 className="font-medium text-yellow-900 dark:text-yellow-100">
                      Scheduling Conflicts Detected
                    </h4>
                  </div>
                  {conflicts.length === 0 ? (
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      Great! No scheduling conflicts detected.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {/* Group conflicts by userId to show one decision per employee */}
                      {Object.entries(conflicts.reduce((acc, conflict) => {
                        if (!acc[conflict.userId]) {
                          acc[conflict.userId] = {
                            user: conflict.user,
                            existingShift: conflict.existingShift,
                            newShift: conflict.newShift,
                            conflictDates: []
                          };
                        }
                        acc[conflict.userId].conflictDates.push(conflict.conflictDate);
                        return acc;
                      }, {})).map(([userId, conflictInfo]) => (
                        <div key={userId} className="border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 bg-white dark:bg-gray-800">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                              <User className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">{conflictInfo.user?.profile?.firstName} {conflictInfo.user?.profile?.lastName}</p>
                              <p className="text-sm text-muted-foreground">{conflictInfo.user?.email}</p>
                              <Badge variant="secondary" className="mt-1">
                                {conflictInfo.conflictDates.length} recurring conflict{conflictInfo.conflictDates.length > 1 ? 's' : ''}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="bg-gray-50 dark:bg-gray-900 rounded-md p-3 mb-3">
                            <div className="grid md:grid-cols-2 gap-3 text-sm">
                              <div>
                                <p className="font-medium text-gray-600 dark:text-gray-400">Current Shift:</p>
                                <p className="font-medium">{conflictInfo.existingShift?.shiftName}</p>
                                <p className="text-xs">{conflictInfo.existingShift?.startTime} - {conflictInfo.existingShift?.endTime}</p>
                              </div>
                              <div>
                                <p className="font-medium text-gray-600 dark:text-gray-400">New Shift:</p>
                                <p className="font-medium">{conflictInfo.newShift?.shiftName}</p>
                                <p className="text-xs">{conflictInfo.newShift?.startTime} - {conflictInfo.newShift?.endTime}</p>
                              </div>
                            </div>
                          </div>

                          {/* Info box about automatic application to all conflicts */}
                          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-md p-2 mb-3">
                            <div className="flex items-start gap-2">
                              <Shield className="h-3 w-3 text-blue-600 dark:text-blue-400 mt-0.5" />
                              <p className="text-xs text-blue-700 dark:text-blue-300">
                                Your decision will automatically apply to all {conflictInfo.conflictDates.length} recurring conflicts for this employee
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <p className="text-sm font-medium">Resolution: <span className="text-red-500">*</span></p>
                            <div className="space-y-3">
                              <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 p-2 rounded-md transition-colors">
                                <input
                                  type="radio"
                                  name={`resolution_${userId}`}
                                  value="SKIP_NEW"
                                  checked={resolutionChoices[userId] === 'SKIP_NEW'}
                                  onChange={(e) => onResolutionChoice(userId, e.target.value)}
                                  className="text-orange-500 focus:ring-orange-500"
                                />
                                <div className="flex-1">
                                  <span className="text-sm font-medium">Keep existing shift</span>
                                  <p className="text-xs text-muted-foreground">Employee remains on {conflictInfo.existingShift?.shiftName}</p>
                                </div>
                              </label>
                              
                              <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 p-2 rounded-md transition-colors">
                                <input
                                  type="radio"
                                  name={`resolution_${userId}`}
                                  value="OVERRIDE_EXISTING"
                                  checked={resolutionChoices[userId] === 'OVERRIDE_EXISTING'}
                                  onChange={(e) => onResolutionChoice(userId, e.target.value)}
                                  className="text-orange-500 focus:ring-orange-500"
                                />
                                <div className="flex-1">
                                  <span className="text-sm font-medium">Replace with new shift</span>
                                  <p className="text-xs text-muted-foreground">Move employee to {conflictInfo.newShift?.shiftName}</p>
                                </div>
                              </label>
                              
                              <div className="border rounded-lg p-3 bg-blue-50 dark:bg-blue-900/20">
                                <label className="flex items-center gap-2 cursor-pointer mb-3">
                                  <input
                                    type="radio"
                                    name={`resolution_${userId}`}
                                    value="MULTI_SCHEDULE"
                                    checked={resolutionChoices[userId] === 'MULTI_SCHEDULE'}
                                    onChange={(e) => onResolutionChoice(userId, e.target.value)}
                                    className="text-orange-500 focus:ring-orange-500"
                                  />
                                  <div className="flex-1">
                                    <span className="text-sm font-medium">Create Multi-Schedule</span>
                                    <p className="text-xs text-blue-600 dark:text-blue-400">Employee works both shifts on the same days</p>
                                  </div>
                                </label>
                                
                                {resolutionChoices[userId] === 'MULTI_SCHEDULE' && (
                                  <div className="ml-6 space-y-4 border-l-2 border-blue-300 pl-4">
                                    {/* First Schedule */}
                                    <div className="bg-white dark:bg-gray-800 rounded-md p-3 border">
                                      <h5 className="text-sm font-medium mb-2 text-green-600">First Shift</h5>
                                      <div className="grid grid-cols-2 gap-2">
                                        <div>
                                          <label className="text-xs text-gray-600 dark:text-gray-400">Clock In <span className="text-red-500">*</span></label>
                                          <Input
                                            type="time"
                                            className="h-8 text-xs"
                                            value={resolutionChoices[`${userId}_firstStart`] || conflictInfo.existingShift?.startTime || "08:00"}
                                            onChange={(e) => onResolutionChoice(`${userId}_firstStart`, e.target.value)}
                                          />
                                        </div>
                                        <div>
                                          <label className="text-xs text-gray-600 dark:text-gray-400">Clock Out <span className="text-red-500">*</span></label>
                                          <Input
                                            type="time"
                                            className="h-8 text-xs"
                                            value={resolutionChoices[`${userId}_firstEnd`] || conflictInfo.existingShift?.endTime || "17:00"}
                                            onChange={(e) => onResolutionChoice(`${userId}_firstEnd`, e.target.value)}
                                          />
                                        </div>
                                      </div>
                                      <div className="text-xs text-gray-500 mt-1">
                                        {conflictInfo.existingShift?.shiftName}
                                      </div>
                                    </div>

                                    {/* Second Schedule */}
                                    <div className="bg-white dark:bg-gray-800 rounded-md p-3 border">
                                      <h5 className="text-sm font-medium mb-2 text-orange-600">Second Shift</h5>
                                      <div className="grid grid-cols-2 gap-2">
                                        <div>
                                          <label className="text-xs text-gray-600 dark:text-gray-400">Clock In <span className="text-red-500">*</span></label>
                                          <Input
                                            type="time"
                                            className="h-8 text-xs"
                                            value={resolutionChoices[`${userId}_secondStart`] || conflictInfo.newShift?.startTime || "18:00"}
                                            onChange={(e) => onResolutionChoice(`${userId}_secondStart`, e.target.value)}
                                          />
                                        </div>
                                        <div>
                                          <label className="text-xs text-gray-600 dark:text-gray-400">Clock Out <span className="text-red-500">*</span></label>
                                          <Input
                                            type="time"
                                            className="h-8 text-xs"
                                            value={resolutionChoices[`${userId}_secondEnd`] || conflictInfo.newShift?.endTime || "22:00"}
                                            onChange={(e) => onResolutionChoice(`${userId}_secondEnd`, e.target.value)}
                                          />
                                        </div>
                                      </div>
                                      <div className="text-xs text-gray-500 mt-1">
                                        {conflictInfo.newShift?.shiftName}
                                      </div>
                                    </div>

                                    {/* Warning */}
                                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-md p-2">
                                      <div className="flex items-start gap-2">
                                        <AlertTriangle className="h-3 w-3 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                                        <p className="text-xs text-yellow-700 dark:text-yellow-300">
                                          <strong>Important:</strong> Ensure adequate rest time between shifts per labor laws.
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                            {!resolutionChoices[userId] && (
                              <p className="text-xs text-red-500 mt-1">Please select a resolution option</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <div className="h-1 w-full bg-orange-500 -mt-6 mb-4" />
        
        {/* Progress Overlay */}
        {renderProgressOverlay()}
        
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-orange-100 text-orange-500 dark:bg-orange-900/30 dark:text-orange-400">
              {isEdit ? <Edit3 className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            </div>
            {title}
          </DialogTitle>
          <DialogDescription>
            {modalStep === 1 
              ? (isEdit ? "Update shift schedule information" : "Create a new recurring shift schedule with required end date")
              : "Review and resolve any scheduling conflicts before finalizing"
            }
          </DialogDescription>
        </DialogHeader>
        
        {!isEdit && renderStepIndicator()}
        
        {/* Content Area with proper scrolling */}
        <div className="flex-1 overflow-y-auto pr-4">
          <div className="py-4">
            {modalStep === 1 ? (
              // Step 1: Form content
              <div className="space-y-6">
                {/* Shift Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Shift <span className="text-orange-500">*</span>
                  </label>
                  <Select
                    value={scheduleForm.shiftId}
                    onValueChange={(value) => setScheduleForm(prev => ({ ...prev, shiftId: value }))}
                  >
                    <SelectTrigger className={getFieldError('shift') ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select a shift" />
                    </SelectTrigger>
                    <SelectContent>
                      {shifts.map(shift => (
                        <SelectItem key={shift.id} value={shift.id.toString()}>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                              <Clock className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                            </div>
                            <span>{shift.shiftName}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {getFieldError('shift') && (
                    <p className="text-xs text-red-500">{getFieldError('shift')}</p>
                  )}
                </div>

                {scheduleForm.shiftId && (() => {
                  const selectedShift = shifts.find(s => s.id.toString() === scheduleForm.shiftId);
                  return selectedShift ? (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30">
                          <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                            Shift Timezone
                          </p>
                          <p className="text-xs text-blue-700 dark:text-blue-300">
                            <strong>{selectedShift.timeZone || 'UTC'}</strong> - All times for this shift are in this timezone
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null;
                })()}

                {/* Days Selection */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">
                    Days <span className="text-orange-500">*</span>
                  </label>
                  <div className="grid grid-cols-7 gap-2">
                    {dayOptions.map(day => (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => handleDayToggle(day.value)}
                        className={`p-2 rounded-md text-xs font-medium transition-all ${
                          scheduleForm.byday.includes(day.value)
                            ? `${day.color} text-white shadow-md`
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                  {getFieldError('days') && (
                    <p className="text-xs text-red-500">{getFieldError('days')}</p>
                  )}
                </div>

                {/* Assignment Type */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">
                    Assignment Type <span className="text-orange-500">*</span>
                  </label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="assignIndividual"
                        name="assignmentType"
                        checked={!scheduleForm.assignedToAll && !scheduleForm.assignedToDepartment}
                        onChange={() => setScheduleForm(prev => ({ 
                          ...prev, 
                          assignedToAll: false, 
                          assignedToDepartment: false,
                          departmentId: "",
                          assignedUserId: ""
                        }))}
                        className="text-orange-500 focus:ring-orange-500"
                      />
                      <label htmlFor="assignIndividual" className="text-sm font-medium cursor-pointer">
                        Assign to specific employee
                      </label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="assignDepartment"
                        name="assignmentType"
                        checked={scheduleForm.assignedToDepartment}
                        onChange={() => setScheduleForm(prev => ({ 
                          ...prev, 
                          assignedToAll: false, 
                          assignedToDepartment: true,
                          assignedUserId: ""
                        }))}
                        className="text-orange-500 focus:ring-orange-500"
                      />
                      <label htmlFor="assignDepartment" className="text-sm font-medium cursor-pointer">
                        Assign to department
                      </label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="assignAll"
                        name="assignmentType"
                        checked={scheduleForm.assignedToAll}
                        onChange={() => setScheduleForm(prev => ({ 
                          ...prev, 
                          assignedToAll: true, 
                          assignedToDepartment: false,
                          departmentId: "",
                          assignedUserId: ""
                        }))}
                        className="text-orange-500 focus:ring-orange-500"
                      />
                      <label htmlFor="assignAll" className="text-sm font-medium cursor-pointer">
                        Assign to all employees
                      </label>
                    </div>
                  </div>
                  {getFieldError('assignment') && (
                    <p className="text-xs text-red-500">{getFieldError('assignment')}</p>
                  )}
                  
                  {scheduleForm.assignedToAll && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-3">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                          This schedule will be assigned to all employees in your company
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {scheduleForm.assignedToDepartment && (
                    <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-md p-3">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                          This schedule will be assigned to all employees in the selected department
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Department Selection - Conditional */}
                {scheduleForm.assignedToDepartment && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Select Department <span className="text-orange-500">*</span>
                    </label>
                    <Select
                      value={scheduleForm.departmentId}
                      onValueChange={(value) => setScheduleForm(prev => ({ ...prev, departmentId: value }))}
                    >
                      <SelectTrigger className={scheduleForm.assignedToDepartment && !scheduleForm.departmentId ? "border-red-500" : ""}>
                        <SelectValue placeholder="Select a department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map(dept => (
                          <SelectItem key={dept.id} value={dept.id}>
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                                <Building className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                              </div>
                              <span>{dept.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Individual Employee Selection - Conditional */}
                {!scheduleForm.assignedToAll && !scheduleForm.assignedToDepartment && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Assign to Employee <span className="text-orange-500">*</span>
                    </label>
                    <Select
                      value={scheduleForm.assignedUserId}
                      onValueChange={(value) => setScheduleForm(prev => ({ ...prev, assignedUserId: value }))}
                    >
                      <SelectTrigger className={!scheduleForm.assignedToAll && !scheduleForm.assignedToDepartment && !scheduleForm.assignedUserId ? "border-red-500" : ""}>
                        <SelectValue placeholder="Select an employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map(emp => (
                          <SelectItem key={emp.id} value={emp.id}>
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                                <User className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                              </div>
                              <span>{emp.profile?.firstName} {emp.profile?.lastName} ({emp.email})</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Date Range - End Date is now REQUIRED */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Start Date <span className="text-orange-500">*</span>
                    </label>
                    <Input
                      type="date"
                      value={scheduleForm.startDate}
                      onChange={(e) => setScheduleForm(prev => ({ ...prev, startDate: e.target.value }))}
                      className={getFieldError('startDate') ? "border-red-500" : ""}
                    />
                    {getFieldError('startDate') && (
                      <p className="text-xs text-red-500">{getFieldError('startDate')}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      End Date <span className="text-orange-500">*</span>
                    </label>
                    <Input
                      type="date"
                      value={scheduleForm.endDate}
                      onChange={(e) => setScheduleForm(prev => ({ ...prev, endDate: e.target.value }))}
                      min={scheduleForm.startDate}
                      className={getFieldError('endDate') ? "border-red-500" : ""}
                    />
                    {getFieldError('endDate') && (
                      <p className="text-xs text-red-500">{getFieldError('endDate')}</p>
                    )}
                  </div>
                </div>

                {/* Proactive Conflict Detection Info */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
                  <div className="flex items-start gap-2">
                    <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                        Proactive Conflict Detection
                      </p>
                      <p className="text-xs text-blue-600/80 dark:text-blue-400/80 mt-1">
                        We'll check for scheduling conflicts before creating assignments, allowing you to resolve them upfront instead of after the fact.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Validation Summary */}
                {!isFormValid() && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                          Please complete all required fields
                        </p>
                        <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-1">
                          All fields marked with * are required.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Step 2: Conflict Preview
              renderConflictPreview()
            )}
          </div>
        </div>

        <DialogFooter className="mt-4">
          {modalStep === 1 ? (
            <>
              <Button variant="outline" onClick={onClose} disabled={preflightLoading}>
                Cancel
              </Button>
              <Button
                onClick={isEdit ? onSubmit : onNext}
                disabled={preflightLoading || saving || !isFormValid()}
                className="bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {preflightLoading || saving ? (
                  <Spinner size={16} className="mr-2" />
                ) : isEdit ? (
                  <Edit3 className="h-4 w-4 mr-2" />
                ) : (
                  <ArrowRight className="h-4 w-4 mr-2" />
                )}
                {preflightLoading ? "Checking..." : saving ? "Saving..." : isEdit ? "Update Schedule" : "Next: Check Conflicts"}
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="outline" 
                onClick={handleBackToForm}
                disabled={saving}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Form
              </Button>
              <Button
                onClick={onSubmit}
                disabled={saving || !areAllConflictsResolved()}
                className="bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <Spinner size={16} className="mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                {saving ? "Creating..." : "Create Schedule"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}