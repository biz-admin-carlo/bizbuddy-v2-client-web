// components/Dashboard/DashboardContent/CompanyPanel/Locations/Locations.jsx
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  Edit3,
  Trash2,
  Users2,
  ChevronUp,
  ChevronDown,
  MapPin,
  RefreshCw,
  Filter,
  AlertCircle,
  UserCheck,
  Loader2,
  ExternalLink,
  Info,
  Check,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { toast, Toaster } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import useAuthStore from "@/store/useAuthStore";
import { fmtMMDDYYYY_hhmma } from "@/lib/dateTimeFormatter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((m) => m.Marker), { ssr: false });
const Circle = dynamic(() => import("react-leaflet").then((m) => m.Circle), { ssr: false });
const useMapEvents = dynamic(() => import("react-leaflet").then((m) => m.useMapEvents), { ssr: false });

if (typeof window !== "undefined") {
  import("leaflet/dist/leaflet.css");
  import("leaflet/dist/images/marker-icon.png");
  import("leaflet/dist/images/marker-shadow.png");
  const L = require("leaflet");
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
}

function getPreciseBrowserLocation({ desiredAccuracy = 50, timeoutMs = 20000 } = {}) {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("geolocation" in navigator))
      return resolve({ latitude: null, longitude: null, accuracy: null });
    let settled = false;
    let lastCoords = null;
    const finish = (coords) => {
      if (settled) return;
      settled = true;
      navigator.geolocation.clearWatch(watcher);
      clearTimeout(failTimer);
      resolve(coords);
    };
    const watcher = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        lastCoords = { latitude, longitude, accuracy };
        if (accuracy <= desiredAccuracy) finish(lastCoords);
      },
      () => finish({ latitude: null, longitude: null, accuracy: null }),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 }
    );
    const failTimer = setTimeout(
      () => finish(lastCoords || { latitude: null, longitude: null, accuracy: null }),
      timeoutMs + 2000
    );
  });
}

function LocationPicker({ lat, lng, radius, onChange }) {
  const center = useMemo(() => [parseFloat(lat) || 14.5995, parseFloat(lng) || 120.9842], [lat, lng]);
  const mapKey = useMemo(() => (typeof crypto !== "undefined" ? crypto.randomUUID() : Date.now()), []);

  function MapEvents() {
    useMapEvents({
      click(e) {
        onChange({ lat: e.latlng.lat.toFixed(6), lng: e.latlng.lng.toFixed(6) });
      },
    });
    return null;
  }

  return (
    <div className="w-full h-96 rounded-md overflow-hidden mb-4 border-2 border-black/10 dark:border-white/10 shadow-sm">
      <MapContainer key={mapKey} center={center} zoom={15} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
        />
        <Circle
          center={center}
          radius={parseInt(radius || 500, 10)}
          pathOptions={{ color: "#f97316", fillColor: "#f97316", fillOpacity: 0.2 }}
        />
        <Marker
          position={center}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const p = e.target.getLatLng();
              onChange({ lat: p.lat.toFixed(6), lng: p.lng.toFixed(6) });
            },
          }}
        />
        <MapEvents />
      </MapContainer>
    </div>
  );
}

const columnOptions = [
  { value: "id", label: "Location ID" },
  { value: "name", label: "Location Name" },
  { value: "latitude", label: "Latitude" },
  { value: "longitude", label: "Longitude" },
  { value: "radius", label: "Radius" },
  { value: "users", label: "Users" },
  { value: "map", label: "Map" },
  { value: "createdAt", label: "Created At" },
  { value: "updatedAt", label: "Updated At" },
];

export default function Locations() {
  const { token } = useAuthStore();
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const [deviceLoc, setDeviceLoc] = useState({ latitude: null, longitude: null, accuracy: null });
  const [deviceLocLoading, setDeviceLocLoading] = useState(true);
  const [locations, setLocations] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", latitude: "14.5995", longitude: "120.9842", radius: "500" });
  const [createLoading, setCreateLoading] = useState(false);
  const [useLocLoadingCreate, setUseLocLoadingCreate] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ id: null, name: "", latitude: "", longitude: "", radius: "500" });
  const [editLoading, setEditLoading] = useState(false);
  const [useLocLoadingEdit, setUseLocLoadingEdit] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [assignedUsers, setAssignedUsers] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [userActionLoading, setUserActionLoading] = useState(false);
  const [loadingUserId, setLoadingUserId] = useState(null);
  const [filters, setFilters] = useState({ names: [], userCounts: [] });
  const [sortConfig, setSortConfig] = useState({ key: "name", direction: "ascending" });
  const [columnVisibility, setColumnVisibility] = useState(columnOptions.map((c) => c.value));

  useEffect(() => {
    let mounted = true;
    setDeviceLocLoading(true);
    getPreciseBrowserLocation().then((loc) => {
      if (mounted) {
        setDeviceLoc(loc);
        setDeviceLocLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!token) return;
    fetchLocations();
    fetchUsers();
  }, [token]);

  async function fetchLocations() {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/location`, { headers: { Authorization: `Bearer ${token}` } });
      const j = await res.json();
      if (res.ok) setLocations(j.data || []);
      else toast.message(j.error || "Failed to fetch locations.");
    } catch {
      toast.message("Failed to fetch locations.");
    }
    setLoading(false);
  }

  async function fetchUsers() {
    try {
      const res = await fetch(`${API_URL}/api/employee`, { headers: { Authorization: `Bearer ${token}` } });
      const j = await res.json();
      if (res.ok) setUsers(j.data || []);
      else toast.message(j.error || "Failed to fetch users.");
    } catch {
      toast.message("Failed to fetch users.");
    }
  }

  async function fetchAssignedUsers(locationId) {
    try {
      const res = await fetch(`${API_URL}/api/location/${locationId}/users`, { headers: { Authorization: `Bearer ${token}` } });
      const j = await res.json();
      if (res.ok) return j.data || [];
      toast.message(j.error || "Failed to fetch assigned users.");
      return [];
    } catch {
      toast.message("Failed to fetch assigned users.");
      return [];
    }
  }

  const refreshData = async () => {
    setRefreshing(true);
    await Promise.all([fetchLocations(), fetchUsers()]);
    setRefreshing(false);
  };

  const getAssignedCount = (loc) => loc.LocationRestriction?.filter((r) => r.restrictionStatus).length || 0;

  const getSortValue = (loc, key) => {
    switch (key) {
      case "id":
        return loc.id;
      case "name":
        return loc.name.toLowerCase();
      case "latitude":
        return Number(loc.latitude);
      case "longitude":
        return Number(loc.longitude);
      case "radius":
        return Number(loc.radius);
      case "users":
        return getAssignedCount(loc);
      case "createdAt":
      case "updatedAt":
        return new Date(loc[key]).getTime();
      default:
        return 0;
    }
  };

  const passesFilters = (loc) => {
    if (filters.names.length && !filters.names.includes(loc.name)) return false;
    if (filters.userCounts.length && !filters.userCounts.includes(getAssignedCount(loc))) return false;
    return true;
  };

  const tableData = useMemo(() => {
    const filtered = locations.filter(passesFilters);
    if (!sortConfig.key) return filtered;
    return [...filtered].sort((a, b) => {
      const A = getSortValue(a, sortConfig.key);
      const B = getSortValue(b, sortConfig.key);
      if (A < B) return sortConfig.direction === "ascending" ? -1 : 1;
      if (A > B) return sortConfig.direction === "ascending" ? 1 : -1;
      return 0;
    });
  }, [locations, filters, sortConfig]);

  const toggleColumn = (c) => setColumnVisibility((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  const MultiColumnSelect = () => {
    const allChecked = columnVisibility.length === columnOptions.length;
    const toggle = (val) => {
      if (val === "all") return setColumnVisibility(allChecked ? [] : columnOptions.map((o) => o.value));
      toggleColumn(val);
    };
    const label = allChecked
      ? "All columns"
      : columnVisibility.length === 0
      ? "No columns"
      : `${columnVisibility.length} selected`;
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
                <div
                  key={opt.value}
                  className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer"
                  onClick={() => toggle(opt.value)}
                >
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

  const NameFilterSelect = () => {
    const names = Array.from(new Set(locations.map((l) => l.name))).sort();
    const allChecked = filters.names.length === names.length;
    const toggle = (val) => {
      if (val === "all") return setFilters((p) => ({ ...p, names: allChecked ? [] : names }));
      setFilters((p) => ({
        ...p,
        names: p.names.includes(val) ? p.names.filter((n) => n !== val) : [...p.names, val],
      }));
    };
    const label = allChecked ? "All names" : filters.names.length === 0 ? "No names" : `${filters.names.length} selected`;
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
            <span>All names</span>
            {allChecked && <Check className="ml-auto h-4 w-4 text-orange-500" />}
          </div>
          <div className="max-h-64 overflow-y-auto pr-1">
            {names.map((n) => {
              const checked = filters.names.includes(n);
              return (
                <div
                  key={n}
                  className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer"
                  onClick={() => toggle(n)}
                >
                  <Checkbox checked={checked} />
                  <span>{n}</span>
                  {checked && <Check className="ml-auto h-4 w-4 text-orange-500" />}
                </div>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  const UsersFilterSelect = () => {
    const counts = Array.from(new Set(locations.map(getAssignedCount))).sort((a, b) => a - b);
    const allChecked = filters.userCounts.length === counts.length;
    const toggle = (val) => {
      if (val === "all") return setFilters((p) => ({ ...p, userCounts: allChecked ? [] : counts }));
      const num = Number(val);
      setFilters((p) => ({
        ...p,
        userCounts: p.userCounts.includes(num) ? p.userCounts.filter((c) => c !== num) : [...p.userCounts, num],
      }));
    };
    const label = allChecked
      ? "All users"
      : filters.userCounts.length === 0
      ? "No users"
      : `${filters.userCounts.length} selected`;
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
            <span>All users</span>
            {allChecked && <Check className="ml-auto h-4 w-4 text-orange-500" />}
          </div>
          <div className="max-h-64 overflow-y-auto pr-1">
            {counts.map((c) => {
              const checked = filters.userCounts.includes(c);
              return (
                <div
                  key={c}
                  className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer"
                  onClick={() => toggle(c)}
                >
                  <Checkbox checked={checked} />
                  <span>{c}</span>
                  {checked && <Check className="ml-auto h-4 w-4 text-orange-500" />}
                </div>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  const labelClass = "my-auto shrink-0 text-sm font-medium text-muted-foreground";

  function openCreate() {
    setCreateForm({ name: "", latitude: "14.5995", longitude: "120.9842", radius: "500" });
    setShowCreateModal(true);
  }

  async function handleUseCurrentLocationCreate() {
    setUseLocLoadingCreate(true);
    const loc = await getPreciseBrowserLocation();
    setUseLocLoadingCreate(false);
    if (loc.latitude && loc.longitude) {
      setCreateForm((p) => ({ ...p, latitude: loc.latitude.toFixed(6), longitude: loc.longitude.toFixed(6) }));
      toast.message(`Coordinates set (±${Math.round(loc.accuracy)} m).`);
    } else {
      toast.message("Location unavailable – enable location services and try again.");
    }
  }

  async function handleCreate() {
    if (!createForm.name.trim()) return toast.message("Name required.");
    setCreateLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/location/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: createForm.name.trim(),
          latitude: parseFloat(createForm.latitude),
          longitude: parseFloat(createForm.longitude),
          radius: parseInt(createForm.radius, 10) || 500,
        }),
      });
      const j = await res.json();
      if (res.ok) {
        toast.message(j.message || "Location created.");
        setShowCreateModal(false);
        fetchLocations();
      } else toast.message(j.error || "Failed to create location.");
    } catch {
      toast.message("Failed to create location.");
    }
    setCreateLoading(false);
  }

  function openEdit(loc) {
    setEditForm({
      id: loc.id,
      name: loc.name,
      latitude: String(loc.latitude),
      longitude: String(loc.longitude),
      radius: String(loc.radius ?? 500),
    });
    setShowEditModal(true);
  }

  async function handleUseCurrentLocationEdit() {
    setUseLocLoadingEdit(true);
    const loc = await getPreciseBrowserLocation();
    setUseLocLoadingEdit(false);
    if (loc.latitude && loc.longitude) {
      setEditForm((p) => ({ ...p, latitude: loc.latitude.toFixed(6), longitude: loc.longitude.toFixed(6) }));
      toast.message(`Coordinates set (±${Math.round(loc.accuracy)} m).`);
    } else {
      toast.message("Location unavailable – enable location services and try again.");
    }
  }

  async function handleSaveEdit() {
    const { id, name, latitude, longitude, radius } = editForm;
    if (!name.trim()) return toast.message("Name required.");
    setEditLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/location/update/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: name.trim(),
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          radius: parseInt(radius, 10) || 500,
        }),
      });
      const j = await res.json();
      if (res.ok) {
        toast.message(j.message || "Location updated.");
        setShowEditModal(false);
        fetchLocations();
      } else toast.message(j.error || "Failed to update location.");
    } catch {
      toast.message("Failed to update location.");
    }
    setEditLoading(false);
  }

  function openDelete(id, name) {
    setLocationToDelete({ id, name });
    setShowDeleteModal(true);
  }

  async function confirmDelete() {
    if (!locationToDelete) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/location/delete/${locationToDelete.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await res.json();
      if (res.ok) {
        toast.message(j.message || "Location deleted.");
        setLocations((prev) => prev.filter((l) => l.id !== locationToDelete.id));
      } else toast.message(j.error || "Failed to delete location.");
    } catch {
      toast.message("Failed to delete location.");
    }
    setShowDeleteModal(false);
    setDeleteLoading(false);
  }

  async function openUsers(loc) {
    setCurrentLocation(loc);
    const assigned = await fetchAssignedUsers(loc.id);
    setAssignedUsers(assigned);
    const assignedIds = assigned.map((u) => u.id);
    setAvailableUsers(users.filter((u) => !assignedIds.includes(u.id)));
    setSelectedUserId("");
    setShowUsersModal(true);
  }

  async function addUser() {
    if (!selectedUserId) return;
    setUserActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/location/${currentLocation.id}/assign-users`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userIds: [selectedUserId] }),
      });
      const j = await res.json();
      if (res.ok) {
        toast.message(j.message || "User assigned.");
        const added = availableUsers.find((u) => u.id === selectedUserId);
        setAssignedUsers((prev) => [...prev, added]);
        setAvailableUsers((prev) => prev.filter((u) => u.id !== selectedUserId));
        setSelectedUserId("");
      } else toast.message(j.error || "Failed to assign user.");
    } catch {
      toast.message("Failed to assign user.");
    }
    setUserActionLoading(false);
  }

  async function removeUser(userId) {
    setLoadingUserId(userId);
    try {
      const res = await fetch(`${API_URL}/api/location/${currentLocation.id}/remove-users`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userIds: [userId] }),
      });
      const j = await res.json();
      if (res.ok) {
        toast.message(j.message || "User removed.");
        const removed = assignedUsers.find((u) => u.id === userId);
        setAssignedUsers((prev) => prev.filter((u) => u.id !== userId));
        setAvailableUsers((prev) => [...prev, removed]);
      } else toast.message(j.error || "Failed to remove user.");
    } catch {
      toast.message("Failed to remove user.");
    }
    setLoadingUserId(null);
  }

  return (
    <div className="max-w-full mx-auto p-4 lg:px-10 px-2 space-y-8">
      <Toaster position="top-center" />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <MapPin className="h-7 w-7 text-orange-500" />
            Company Locations
          </h2>
          <div className="mt-2">
            {deviceLocLoading ? (
              <Badge variant="outline" className="animate-pulse">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Locating…
              </Badge>
            ) : deviceLoc.latitude ? (
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className="text-orange-600 dark:text-orange-400 hover:bg-black/5 dark:hover:bg-white/5 cursor-help"
                    >
                      <MapPin className="h-3 w-3 mr-1" />
                      Location Available
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      Device coordinates:&nbsp;
                      {deviceLoc.latitude.toFixed(5)}, {deviceLoc.longitude.toFixed(5)} (±{Math.round(deviceLoc.accuracy)} m)
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className="text-red-600 dark:text-red-400 hover:bg-black/5 dark:hover:bg-white/5 cursor-help"
                    >
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Location Unavailable
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Enable browser location services to use this feature</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" asChild>
            <Link href="/dashboard/company/shifts">Shifts</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/company/schedules">Shift&nbsp;Schedules</Link>
          </Button>

          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={refreshData} disabled={refreshing}>
                  <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh table</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogTrigger asChild>
              <Badge onClick={openCreate} className="bg-orange-500 hover:bg-orange-600 text-white cursor-pointer ml-auto">
                <Plus />
              </Badge>
            </DialogTrigger>
            <DialogContent className="w-[90vw] sm:max-w-lg md:max-w-xl max-h-[90vh] overflow-y-auto border-2 dark:border-white/10">
              <div className="h-1 w-full bg-orange-500 -mt-6 mb-4" />
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5 text-orange-500" />
                  Create Location
                </DialogTitle>
                <DialogDescription>Add a new company location with geofence radius</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <LocationPicker
                  lat={createForm.latitude}
                  lng={createForm.longitude}
                  radius={createForm.radius}
                  onChange={({ lat, lng }) => setCreateForm((p) => ({ ...p, latitude: lat, longitude: lng }))}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUseCurrentLocationCreate}
                  disabled={useLocLoadingCreate}
                  className="mb-2 border-orange-500/30 text-orange-700 hover:bg-orange-500/10 dark:border-orange-500/30 dark:text-orange-400 dark:hover:bg-orange-500/20"
                >
                  {useLocLoadingCreate ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <MapPin className="h-4 w-4 mr-2" />}
                  Use Current Location
                </Button>
                <div className="flex flex-row justify-between items-center gap-2">
                  <label className="text-right text-sm text-nowrap" htmlFor="c-name">
                    Location Name:
                  </label>
                  <Input
                    id="c-name"
                    className=""
                    value={createForm.name}
                    onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Enter location name"
                  />
                </div>
                <div className="flex flex-row justify-between items-center gap-2">
                  <div className="flex flex-row justify-between items-center gap-2">
                    <label className="text-right text-sm" htmlFor="c-latitude">
                      Latitude:
                    </label>
                    <Input
                      id="c-latitude"
                      className="col-span-3"
                      value={createForm.latitude}
                      onChange={(e) => setCreateForm((p) => ({ ...p, latitude: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-row justify-between items-center gap-2">
                    <label className="text-right text-sm" htmlFor="c-longitude">
                      Longitude:
                    </label>
                    <Input
                      id="c-longitude"
                      className="col-span-3"
                      value={createForm.longitude}
                      onChange={(e) => setCreateForm((p) => ({ ...p, longitude: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex flex-row justify-between items-center gap-2">
                  <label className="text-right text-sm" htmlFor="c-radius">
                    Radius&nbsp;(m)
                  </label>
                  <Input
                    id="c-radius"
                    type="number"
                    min="1"
                    max="9999"
                    step="1"
                    value={createForm.radius}
                    onChange={(e) => {
                      const v = Math.min(Number(e.target.value), 9999);
                      setCreateForm((p) => ({ ...p, radius: v ? String(v) : "" }));
                    }}
                    placeholder="500"
                  />
                  <p className="text-xs text-muted-foreground text-nowrap">
                    Max:&nbsp;
                    <span className="font-medium">9999</span>
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={createLoading} variant="outline">
                  {createLoading ? (
                    <span className="flex items-center">
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Creating…
                    </span>
                  ) : (
                    <span>Create Location</span>
                  )}
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
            <Filter className="h-5 w-5 text-orange-500" />
            Table Controls
          </CardTitle>
          <span className="absolute top-2 right-4 text-sm text-muted-foreground">
            {tableData.length} of {locations.length}
          </span>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 items-center">
              <span className={labelClass}>Columns:</span>
              <MultiColumnSelect />
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <span className={labelClass}>Filter:</span>
              <NameFilterSelect />
              <span className={labelClass}>Users:</span>
              <UsersFilterSelect />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 shadow-md overflow-hidden dark:border-white/10">
        <div className="h-1 w-full bg-orange-500" />
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-orange-500" />
            Locations
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {columnOptions
                    .filter((c) => columnVisibility.includes(c.value))
                    .map(({ value, label }) => (
                      <TableHead
                        key={value}
                        className="text-center text-nowrap cursor-pointer"
                        onClick={() =>
                          setSortConfig({
                            key: value,
                            direction:
                              sortConfig.key === value && sortConfig.direction === "ascending" ? "descending" : "ascending",
                          })
                        }
                      >
                        <div className="flex items-center justify-center">
                          {label}
                          {sortConfig.key === value &&
                            (sortConfig.direction === "ascending" ? (
                              <ChevronUp className="ml-1 h-4 w-4" />
                            ) : (
                              <ChevronDown className="ml-1 h-4 w-4" />
                            ))}
                        </div>
                      </TableHead>
                    ))}
                  <TableHead className="text-center text-nowrap">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      {columnVisibility.concat("actions").map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-6 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : tableData.length ? (
                  <AnimatePresence>
                    {tableData.map((loc) => {
                      const assigned = getAssignedCount(loc);
                      const mapUrl = `https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`;
                      return (
                        <motion.tr
                          key={loc.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border-b transition-colors hover:bg-muted/50"
                        >
                          {columnVisibility.includes("id") && <TableCell className="text-xs">{loc.id}</TableCell>}
                          {columnVisibility.includes("name") && <TableCell className="text-xs">{loc.name}</TableCell>}
                          {columnVisibility.includes("latitude") && <TableCell className="text-xs">{loc.latitude}</TableCell>}
                          {columnVisibility.includes("longitude") && <TableCell className="text-xs">{loc.longitude}</TableCell>}
                          {columnVisibility.includes("radius") && <TableCell className="text-xs">{loc.radius}</TableCell>}
                          {columnVisibility.includes("users") && (
                            <TableCell>
                              <Badge
                                className="bg-orange-500 hover:bg-orange-600 text-white cursor-pointer"
                                onClick={() => openUsers(loc)}
                              >
                                <Users2 className="h-3 w-3 mr-1" />
                                {assigned}
                              </Badge>
                            </TableCell>
                          )}
                          {columnVisibility.includes("map") && (
                            <TableCell className="text-center">
                              <TooltipProvider delayDuration={300}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => window.open(mapUrl, "_blank", "noopener")}
                                      className="text-orange-700 hover:bg-orange-500/10 dark:text-orange-400 dark:hover:bg-orange-500/20"
                                    >
                                      <ExternalLink className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Open in Google Maps</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                          )}
                          {columnVisibility.includes("createdAt") && (
                            <TableCell className="text-xs text-nowrap">{fmtMMDDYYYY_hhmma(loc.createdAt)}</TableCell>
                          )}
                          {columnVisibility.includes("updatedAt") && (
                            <TableCell className="text-xs text-nowrap">{fmtMMDDYYYY_hhmma(loc.updatedAt)}</TableCell>
                          )}
                          <TableCell>
                            <div className="flex justify-center gap-1">
                              <TooltipProvider delayDuration={300}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openEdit(loc)}
                                      className="text-orange-700 hover:bg-orange-500/10 dark:text-orange-400 dark:hover:bg-orange-500/20"
                                    >
                                      <Edit3 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Edit location</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                              <TooltipProvider delayDuration={300}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openDelete(loc.id, loc.name)}
                                      className="text-red-500 hover:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Delete location</TooltipContent>
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
                    <TableCell colSpan={columnVisibility.length + 1} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <div className="w-16 h-16 bg-black/5 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                          <MapPin className="h-8 w-8 text-orange-500/50" />
                        </div>
                        <p>No locations found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="w-[90vw] sm:max-w-lg md:max-w-xl max-h-[90vh] overflow-y-auto border-2 dark:border-white/10">
          <div className="h-1 w-full bg-orange-500 -mt-6 mb-4" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-orange-500" />
              Edit Location
            </DialogTitle>
            <DialogDescription>Update location information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <LocationPicker
              lat={editForm.latitude}
              lng={editForm.longitude}
              radius={editForm.radius}
              onChange={({ lat, lng }) => setEditForm((p) => ({ ...p, latitude: lat, longitude: lng }))}
            />
            <div className="flex items-start gap-2 text-sm bg-black/5 dark:bg-white/5 rounded-md p-3">
              <Info className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
              <span>
                <b>Heads-up:</b> browser autofill can be imprecise.&nbsp; Drag the orange pin on the map to position the location
                exactly.
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleUseCurrentLocationEdit}
              disabled={useLocLoadingEdit}
              className="mb-2 border-orange-500/30 text-orange-700 hover:bg-orange-500/10 dark:border-orange-500/30 dark:text-orange-400 dark:hover:bg-orange-500/20"
            >
              {useLocLoadingEdit ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <MapPin className="h-4 w-4 mr-2" />}
              Use Current Location
            </Button>
            <div className="flex flex-row justify-between items-center gap-2">
              <label className="text-right text-sm text-nowrap" htmlFor="e-name">
                Location Name:
              </label>
              <Input
                id="e-name"
                className="col-span-3"
                value={editForm.name}
                onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Enter location name"
              />
            </div>
            <div className="flex flex-row justify-between items-center gap-2">
              <div className="flex flex-row justify-between items-center gap-2">
                <label className="text-right text-sm" htmlFor="e-latitude">
                  Latitude:
                </label>
                <Input
                  id="e-latitude"
                  className="col-span-3"
                  value={editForm.latitude}
                  onChange={(e) => setEditForm((p) => ({ ...p, latitude: e.target.value }))}
                />
              </div>
              <div className="flex flex-row justify-between items-center gap-2">
                <label className="text-right text-sm" htmlFor="e-longitude">
                  Longitude:
                </label>
                <Input
                  id="e-longitude"
                  className="col-span-3"
                  value={editForm.longitude}
                  onChange={(e) => setEditForm((p) => ({ ...p, longitude: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex flex-row justify-between items-center gap-2">
              <label className="text-right text-sm" htmlFor="e-radius">
                Radius&nbsp;(m)
              </label>
              <Input
                id="e-radius"
                type="number"
                min="1"
                max="9999"
                step="1"
                value={editForm.radius}
                onChange={(e) => {
                  const v = Math.min(Number(e.target.value), 9999);
                  setEditForm((p) => ({ ...p, radius: v ? String(v) : "" }));
                }}
                placeholder="500"
              />
              <p className="text-xs text-muted-foreground mt-1 text-nowrap">
                Max:&nbsp;
                <span className="font-medium">9999</span>
              </p>
            </div>
          </div>
          <DialogFooter>
            <div className="flex flex-row gap-2 justify-center items-center">
              <Button variant="outline" onClick={() => setShowEditModal(false)} className>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={editLoading} variant="outline">
                {editLoading ? (
                  <span className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Saving…
                  </span>
                ) : (
                  <span>Save Changes</span>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Users modal */}
      <Dialog open={showUsersModal} onOpenChange={setShowUsersModal}>
        <DialogContent className="w-[90vw] sm:max-w-lg md:max-w-xl max-h-[90vh] overflow-y-auto border-2 dark:border-white/10">
          <div className="h-1 w-full bg-orange-500 -mt-6 mb-4" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users2 className="h-5 w-5 text-orange-500" />
              Manage Users – {currentLocation?.name}
            </DialogTitle>
            <DialogDescription>Assign or remove users from this location</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-orange-500" />
              Assigned Users
            </h4>
            <div className="border-2 rounded-md max-h-60 overflow-y-auto mb-4 border-black/10 dark:border-white/10">
              {assignedUsers.length ? (
                <Table>
                  <TableBody>
                    {assignedUsers.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div className="flex items-center">
                            <div className="w-7 h-7 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center mr-2">
                              <UserCheck className="h-4 w-4 text-orange-500" />
                            </div>
                            {u.profile?.firstName} {u.profile?.lastName}
                          </div>
                        </TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeUser(u.id)}
                            disabled={loadingUserId === u.id}
                            className="text-red-500 hover:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                          >
                            {loadingUserId === u.id ? (
                              <svg
                                className="animate-spin h-4 w-4"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                />
                              </svg>
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  <div className="w-12 h-12 bg-black/5 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Users2 className="h-6 w-6 text-orange-500/50" />
                  </div>
                  <p>No users assigned to this location</p>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Plus className="h-4 w-4 text-orange-500" />
              Add User
            </h4>
            <div className="flex gap-3 mb-2">
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {availableUsers.length ? (
                    availableUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.email}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-3 text-sm text-muted-foreground text-center">No available users.</div>
                  )}
                </SelectContent>
              </Select>
              <Button
                disabled={!selectedUserId || userActionLoading}
                onClick={addUser}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                {userActionLoading ? (
                  <span className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Adding…
                  </span>
                ) : (
                  <span>Add User</span>
                )}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowUsersModal(false)} className="bg-orange-500 hover:bg-orange-600 text-white">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="sm:max-w-md border-2 border-red-200 dark:border-red-800/50">
          <div className="h-1 w-full bg-red-500 -mt-6 mb-4" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Delete Location
            </DialogTitle>
            <DialogDescription>Are you sure you want to delete this location? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          {locationToDelete && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 my-4">
              <p className="text-sm text-red-600 dark:text-red-400">
                You are about to delete the location <span className="font-bold">{locationToDelete.name}</span>. Any users
                assigned to this location will be unassigned.
              </p>
            </div>
          )}
          <DialogFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              className="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800/50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteLoading}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleteLoading ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Deleting…
                </span>
              ) : (
                <span>Delete Location</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
