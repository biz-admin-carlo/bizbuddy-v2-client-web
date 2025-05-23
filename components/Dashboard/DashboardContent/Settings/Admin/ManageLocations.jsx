/* eslint-disable react-hooks/exhaustive-deps */
"use client";

/* ───────────────────────────────────────────────────────────────────────────
   ManageLocations
   • list / create / edit / delete geofenced locations
   • assign & remove users
   • NEW (2025-05-09)
       – High-accuracy browser geolocation (±50 m or best within 20 s)
       – “View Map” button in each table row (opens Google Maps centered on
         that location)
   ────────────────────────────────────────────────────────────────────────── */

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  PlusCircle,
  Edit3,
  Trash2,
  Users2,
  ChevronUp,
  ChevronDown,
  Search,
  MapPin,
  RefreshCw,
  XCircle,
  Filter,
  AlertCircle,
  UserCheck,
  Loader2,
  ExternalLink,
  Info,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import useAuthStore from "@/store/useAuthStore";

/* ────────── shadcn/ui components ────────── */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/* ────────────────────────────────────
   1.  React-Leaflet (client-side only)
   ──────────────────────────────────── */
const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((m) => m.Marker), { ssr: false });
const Circle = dynamic(() => import("react-leaflet").then((m) => m.Circle), { ssr: false });
const useMapEvents = dynamic(() => import("react-leaflet").then((m) => m.useMapEvents), { ssr: false });

/*  Load Leaflet’s CSS + patch default marker URLs  */
if (typeof window !== "undefined") {
  import("leaflet/dist/leaflet.css");
  import("leaflet/dist/images/marker-icon.png");
  import("leaflet/dist/images/marker-shadow.png");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const L = require("leaflet");
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
}

/* ────────────────────────────────────
   2.  High-accuracy browser-location helper
   ──────────────────────────────────── */
function getPreciseBrowserLocation({ desiredAccuracy = 50, timeoutMs = 20000 } = {}) {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      return resolve({ latitude: null, longitude: null, accuracy: null });
    }

    let settled = false;
    let lastCoords = null;
    const opts = {
      enableHighAccuracy: true,
      timeout: timeoutMs,
      maximumAge: 0,
    };

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
      opts
    );

    const failTimer = setTimeout(() => finish(lastCoords || { latitude: null, longitude: null, accuracy: null }), timeoutMs + 2000);
  });
}

/* ────────────────────────────────────
   3.  LocationPicker (map input field)
   ──────────────────────────────────── */
function LocationPicker({ lat, lng, radius, onChange }) {
  const position = useMemo(() => [Number.parseFloat(lat) || 14.5995, Number.parseFloat(lng) || 120.9842], [lat, lng]);

  function MapEvents() {
    useMapEvents({
      click(e) {
        onChange({
          lat: e.latlng.lat.toFixed(6),
          lng: e.latlng.lng.toFixed(6),
        });
      },
    });
    return null;
  }

  const mapKey = useMemo(() => (typeof crypto !== "undefined" ? crypto.randomUUID() : Date.now()), []);

  return (
    <div className="w-full h-96 rounded-md overflow-hidden mb-4 border-2 border-black/10 dark:border-white/10 shadow-sm">
      <MapContainer key={mapKey} center={position} zoom={15} scrollWheelZoom style={{ height: "100%", width: "100%" }} className="z-0">
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
        />
        <Circle center={position} radius={Number.parseInt(radius || 500, 10)} pathOptions={{ color: "#f97316", fillColor: "#f97316", fillOpacity: 0.2 }} />
        <Marker
          position={position}
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

/* ────────────────────────────────────
   4.  Main component
   ──────────────────────────────────── */
function ManageLocations() {
  const { token } = useAuthStore();
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  /*  Device-location badge  */
  const [deviceLoc, setDeviceLoc] = useState({
    latitude: null,
    longitude: null,
    accuracy: null,
  });
  const [deviceLocLoading, setDeviceLocLoading] = useState(true);

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

  /*  ───── Data state ───── */
  const [locations, setLocations] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  /*  ───── Create dialog ───── */
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    latitude: "14.5995",
    longitude: "120.9842",
    radius: "500",
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [useLocLoadingCreate, setUseLocLoadingCreate] = useState(false);

  /*  ───── Edit dialog ───── */
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    id: null,
    name: "",
    latitude: "",
    longitude: "",
    radius: "500",
  });
  const [editLoading, setEditLoading] = useState(false);
  const [useLocLoadingEdit, setUseLocLoadingEdit] = useState(false);

  /*  ───── Delete confirm ───── */
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  /*  ───── Users dialog ───── */
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [assignedUsers, setAssignedUsers] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [userActionLoading, setUserActionLoading] = useState(false);
  const [loadingUserId, setLoadingUserId] = useState(null);

  /*  ───── Filters / sort ───── */
  const [filters, setFilters] = useState({ name: "" });
  const [sortConfig, setSortConfig] = useState({
    key: "name",
    direction: "ascending",
  });

  /* ───── Fetch data on mount ───── */
  useEffect(() => {
    if (!token) return;
    fetchLocations();
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  /* ───────────────────────────────────
      5.  Data-fetch helpers
      ─────────────────────────────────── */
  async function fetchLocations() {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/location`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await res.json();
      if (res.ok) setLocations(j.data || []);
      else toast.message(j.error || "Failed to fetch locations.");
    } catch (e) {
      console.error(e);
      toast.message("Failed to fetch locations.");
    }
    setLoading(false);
  }

  async function fetchUsers() {
    try {
      const res = await fetch(`${API_URL}/api/employee`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await res.json();
      if (res.ok) setUsers(j.data || []);
      else toast.message(j.error || "Failed to fetch users.");
    } catch (e) {
      console.error(e);
      toast.message("Failed to fetch users.");
    }
  }

  async function fetchAssignedUsers(locationId) {
    try {
      const res = await fetch(`${API_URL}/api/location/${locationId}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await res.json();
      if (res.ok) return j.data || [];
      toast.message(j.error || "Failed to fetch assigned users.");
      return [];
    } catch (e) {
      console.error(e);
      toast.message("Failed to fetch assigned users.");
      return [];
    }
  }

  const refreshData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchLocations(), fetchUsers()]);
      toast.message("Data refreshed successfully");
    } catch (e) {
      console.error(e);
      toast.message("Failed to refresh data");
    }
    setRefreshing(false);
  };

  /* ───────────────────────────────────
      6.  Helpers – filter & sort
      ─────────────────────────────────── */
  function getFilteredAndSorted() {
    const data = locations.filter((l) => l.name.toLowerCase().includes(filters.name.toLowerCase()));

    if (sortConfig.key) {
      data.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        if (sortConfig.key === "radius") {
          aVal = Number(aVal);
          bVal = Number(bVal);
        } else {
          aVal = (aVal ?? "").toString().toLowerCase();
          bVal = (bVal ?? "").toString().toLowerCase();
        }
        if (aVal < bVal) return sortConfig.direction === "ascending" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "ascending" ? 1 : -1;
        return 0;
      });
    }
    return data;
  }

  /* ───────────────────────────────────
      7.  CRUD – create / edit / delete
      ─────────────────────────────────── */
  /* --- Create helpers --- */
  function openCreate() {
    setCreateForm({
      name: "",
      latitude: "14.5995",
      longitude: "120.9842",
      radius: "500",
    });
    setShowCreateModal(true);
  }

  async function handleUseCurrentLocationCreate() {
    setUseLocLoadingCreate(true);
    const loc = await getPreciseBrowserLocation();
    setUseLocLoadingCreate(false);

    if (loc.latitude && loc.longitude) {
      setCreateForm((p) => ({
        ...p,
        latitude: loc.latitude.toFixed(6),
        longitude: loc.longitude.toFixed(6),
      }));
      toast.message(`Coordinates set (±${Math.round(loc.accuracy)} m).`);
    } else {
      toast.message("Location unavailable – enable location services and try again.");
    }
  }

  async function handleCreate() {
    if (!createForm.name.trim()) {
      toast.message("Name required.");
      return;
    }
    setCreateLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/location/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: createForm.name.trim(),
          latitude: Number.parseFloat(createForm.latitude),
          longitude: Number.parseFloat(createForm.longitude),
          radius: Number.parseInt(createForm.radius, 10) || 500,
        }),
      });
      const j = await res.json();
      if (res.ok) {
        toast.message(j.message || "Location created.");
        setShowCreateModal(false);
        fetchLocations();
      } else toast.message(j.error || "Failed to create location.");
    } catch (e) {
      console.error(e);
      toast.message("Failed to create location.");
    }
    setCreateLoading(false);
  }

  /* --- Edit helpers --- */
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
      setEditForm((p) => ({
        ...p,
        latitude: loc.latitude.toFixed(6),
        longitude: loc.longitude.toFixed(6),
      }));
      toast.message(`Coordinates set (±${Math.round(loc.accuracy)} m).`);
    } else {
      toast.message("Location unavailable – enable location services and try again.");
    }
  }

  async function handleSaveEdit() {
    const { id, name, latitude, longitude, radius } = editForm;
    if (!name.trim()) {
      toast.message("Name required.");
      return;
    }
    setEditLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/location/update/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          latitude: Number.parseFloat(latitude),
          longitude: Number.parseFloat(longitude),
          radius: Number.parseInt(radius, 10) || 500,
        }),
      });
      const j = await res.json();
      if (res.ok) {
        toast.message(j.message || "Location updated.");
        setShowEditModal(false);
        fetchLocations();
      } else toast.message(j.error || "Failed to update location.");
    } catch (e) {
      console.error(e);
      toast.message("Failed to update location.");
    }
    setEditLoading(false);
  }

  /* --- Delete helpers --- */
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
    } catch (e) {
      console.error(e);
      toast.message("Failed to delete location.");
    }
    setShowDeleteModal(false);
    setDeleteLoading(false);
  }

  /* --- Users helpers --- */
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
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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
    } catch (e) {
      console.error(e);
      toast.message("Failed to assign user.");
    }
    setUserActionLoading(false);
  }

  async function removeUser(userId) {
    setLoadingUserId(userId);
    try {
      const res = await fetch(`${API_URL}/api/location/${currentLocation.id}/remove-users`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userIds: [userId] }),
      });
      const j = await res.json();
      if (res.ok) {
        toast.message(j.message || "User removed.");
        const removed = assignedUsers.find((u) => u.id === userId);
        setAssignedUsers((prev) => prev.filter((u) => u.id !== userId));
        setAvailableUsers((prev) => [...prev, removed]);
      } else toast.message(j.error || "Failed to remove user.");
    } catch (e) {
      console.error(e);
      toast.message("Failed to remove user.");
    }
    setLoadingUserId(null);
  }

  /* ───────────────────────────────────
      8.  Render
      ─────────────────────────────────── */
  return (
    <div className="max-w-full mx-auto p-4 lg:px-10 px-2 space-y-8">
      <Toaster position="top-center" />

      {/* ────────── Header + actions ────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <MapPin className="h-7 w-7 text-orange-500" />
            Manage Locations
          </h2>
          <p className="text-muted-foreground mt-1">Create and manage geofenced locations for your organization</p>

          {/* device-location badge */}
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
                    <Badge variant="outline" className="text-orange-600 dark:text-orange-400 hover:bg-black/5 dark:hover:bg-white/5 cursor-help">
                      <MapPin className="h-3 w-3 mr-1" />
                      Location Available
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      Device coordinates:&nbsp;
                      {deviceLoc.latitude.toFixed(5)}, {deviceLoc.longitude.toFixed(5)} (±
                      {Math.round(deviceLoc.accuracy)} m)
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-red-600 dark:text-red-400 hover:bg-black/5 dark:hover:bg-white/5 cursor-help">
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

        {/* action buttons */}
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
              <Button onClick={openCreate} className="bg-orange-500 hover:bg-orange-600 text-white font-semibold">
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Location
              </Button>
            </DialogTrigger>

            {/* ───────────────── Create dialog ───────────────── */}
            <DialogContent className="w-[90vw]  sm:max-w-lg     md:max-w-xl max-h-[90vh] overflow-y-auto  border-2 dark:border-white/10">
              <div className="h-1 w-full bg-orange-500 -mt-6 mb-4"></div>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className="p-2 rounded-full bg-orange-500/10 text-orange-500 dark:bg-orange-500/20 dark:text-orange-500">
                    <PlusCircle className="h-5 w-5" />
                  </div>
                  Create New Location
                </DialogTitle>
                <DialogDescription>Add a new geofenced location to your organization</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* map picker */}
                <LocationPicker
                  lat={createForm.latitude}
                  lng={createForm.longitude}
                  radius={createForm.radius}
                  onChange={({ lat, lng }) => setCreateForm((p) => ({ ...p, latitude: lat, longitude: lng }))}
                />
                {/* guidance banner */}
                <div className="flex items-start gap-2 text-sm bg-black/5 dark:bg-white/5 rounded-md p-3">
                  <Info className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                  <span>
                    <b>Heads-up:</b> browser autofill can be imprecise.&nbsp; Drag the orange pin on the map to position the location exactly.
                  </span>
                </div>

                {/* use current location */}
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

                {/* name */}
                <div className="grid:grid-cols-4 items-center gap-4 text-sm">
                  <label className="text-right font-medium" htmlFor="name">
                    Location Name
                  </label>
                  <Input
                    id="name"
                    className="col-span-3"
                    value={createForm.name}
                    onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Enter location name"
                  />
                </div>

                {/* latitude / longitude */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid grid-cols-4 items-center gap-4 text-sm">
                    <label className="text-right font-medium" htmlFor="latitude">
                      Latitude
                    </label>
                    <Input
                      id="latitude"
                      className="col-span-3"
                      value={createForm.latitude}
                      onChange={(e) => setCreateForm((p) => ({ ...p, latitude: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4 text-sm">
                    <label className="text-right font-medium" htmlFor="longitude">
                      Longitude
                    </label>
                    <Input
                      id="longitude"
                      className="col-span-3"
                      value={createForm.longitude}
                      onChange={(e) =>
                        setCreateForm((p) => ({
                          ...p,
                          longitude: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                {/* radius */}
                <div className="grid grid-cols-4 items-center gap-4 text-sm">
                  <label className="text-right font-medium" htmlFor="radius">
                    Radius (m)
                  </label>
                  <Input
                    id="radius"
                    type="number"
                    className="col-span-3"
                    value={createForm.radius}
                    onChange={(e) => setCreateForm((p) => ({ ...p, radius: e.target.value }))}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={createLoading} className="bg-orange-500 hover:bg-orange-600 text-white">
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

      {/* ────────── Filters ────────── */}
      <Card className="border-2 shadow-md overflow-hidden dark:border-white/10">
        <div className="h-1 w-full bg-orange-500" />
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-orange-500/10 text-orange-500 dark:bg-orange-500/20 dark:text-orange-500">
              <Filter className="h-5 w-5" />
            </div>
            Search & Filter
          </CardTitle>
          <CardDescription>Find locations by name</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex-1 min-w-[200px]">
              <div className="flex items-center border rounded-md px-3 py-2 bg-black/5 dark:bg-white/5">
                <Search className="h-4 w-4 mr-2 text-muted-foreground" />
                <Input
                  placeholder="Filter by location name"
                  value={filters.name}
                  onChange={(e) => setFilters({ name: e.target.value })}
                  className="border-0 h-8 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                {filters.name && (
                  <Button variant="ghost" size="icon" onClick={() => setFilters({ name: "" })} className="h-6 w-6 p-0 text-muted-foreground">
                    <XCircle className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              Showing {getFilteredAndSorted().length} of {locations.length} locations
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Sort by:</span>

              {/* sort – name */}
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setSortConfig({
                          key: "name",
                          direction: sortConfig.key === "name" && sortConfig.direction === "ascending" ? "descending" : "ascending",
                        })
                      }
                      className={`${sortConfig.key === "name" ? "border-orange-500 bg-orange-500/10 text-orange-700 dark:text-orange-400" : ""}`}
                    >
                      Name
                      {sortConfig.key === "name" &&
                        (sortConfig.direction === "ascending" ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />)}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Sort by location name</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* sort – radius */}
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setSortConfig({
                          key: "radius",
                          direction: sortConfig.key === "radius" && sortConfig.direction === "ascending" ? "descending" : "ascending",
                        })
                      }
                      className={`${sortConfig.key === "radius" ? "border-orange-500 bg-orange-500/10 text-orange-700 dark:text-orange-400" : ""}`}
                    >
                      Radius
                      {sortConfig.key === "radius" &&
                        (sortConfig.direction === "ascending" ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />)}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Sort by radius size</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ────────── Locations table ────────── */}
      <Card className="border-2 shadow-md overflow-hidden dark:border-white/10">
        <div className="h-1 w-full bg-orange-500" />
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-orange-500/10 text-orange-500 dark:bg-orange-500/20 dark:text-orange-500">
              <MapPin className="h-5 w-5" />
            </div>
            Locations
          </CardTitle>
          <CardDescription>Manage your organization’s geofenced locations</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {/* sortable columns */}
                  <TableHead
                    className="cursor-pointer"
                    onClick={() =>
                      setSortConfig({
                        key: "name",
                        direction: sortConfig.key === "name" && sortConfig.direction === "ascending" ? "descending" : "ascending",
                      })
                    }
                  >
                    <div className="flex items-center">
                      Name
                      {sortConfig.key === "name" &&
                        (sortConfig.direction === "ascending" ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />)}
                    </div>
                  </TableHead>
                  <TableHead>Latitude</TableHead>
                  <TableHead>Longitude</TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() =>
                      setSortConfig({
                        key: "radius",
                        direction: sortConfig.key === "radius" && sortConfig.direction === "ascending" ? "descending" : "ascending",
                      })
                    }
                  >
                    <div className="flex items-center">
                      Radius (m)
                      {sortConfig.key === "radius" &&
                        (sortConfig.direction === "ascending" ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />)}
                    </div>
                  </TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead className="text-center">Map</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <TableRow key={i}>
                        {Array(7)
                          .fill(0)
                          .map((__, j) => (
                            <TableCell key={j}>
                              <Skeleton className="h-6 w-full" />
                            </TableCell>
                          ))}
                      </TableRow>
                    ))
                ) : getFilteredAndSorted().length ? (
                  <AnimatePresence>
                    {getFilteredAndSorted().map((loc) => {
                      const assigned = loc.LocationRestriction?.filter((r) => r.restrictionStatus).length || 0;
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
                          <TableCell className="font-medium">
                            <div className="flex items-center">
                              <div className="w-2 h-2 rounded-full bg-orange-500 mr-2" />
                              <span className="capitalize">{loc.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>{loc.latitude}</TableCell>
                          <TableCell>{loc.longitude}</TableCell>
                          <TableCell>
                            <Badge className="bg-orange-500 hover:bg-orange-600 text-white">{loc.radius ?? 500}m</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="border-orange-500/30 text-orange-700 hover:bg-orange-500/10 dark:border-orange-500/30 dark:text-orange-400 dark:hover:bg-orange-500/20"
                            >
                              <Users2 className="h-3 w-3 mr-1" />
                              {assigned}
                            </Badge>
                          </TableCell>

                          {/* Map button */}
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

                          {/* action buttons */}
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
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
                                      onClick={() => openUsers(loc)}
                                      className="text-orange-700 hover:bg-orange-500/10 dark:text-orange-400 dark:hover:bg-orange-500/20"
                                    >
                                      <Users2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Manage users</TooltipContent>
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
                    <TableCell colSpan={7} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <div className="w-16 h-16 bg-black/5 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                          <MapPin className="h-8 w-8 text-orange-500/50" />
                        </div>
                        <p>No locations found matching your filters</p>
                        {filters.name && (
                          <Button variant="link" onClick={() => setFilters({ name: "" })} className="text-orange-500 hover:text-orange-600 mt-2">
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

      {/* ────────── Edit dialog ────────── */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="w-[90vw]  sm:max-w-lg     md:max-w-xl max-h-[90vh] overflow-y-auto  border-2 dark:border-white/10">
          <div className="h-1 w-full bg-orange-500 -mt-6 mb-4" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-orange-500/10 text-orange-500 dark:bg-orange-500/20 dark:text-orange-500">
                <Edit3 className="h-5 w-5" />
              </div>
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
            {/* guidance banner */}
            <div className="flex items-start gap-2 text-sm bg-black/5 dark:bg-white/5 rounded-md p-3">
              <Info className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
              <span>
                <b>Heads-up:</b> browser autofill can be imprecise.&nbsp; Drag the orange pin on the map to position the location exactly.
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

            <div className="grid grid-cols-4 items-center gap-4 text-sm">
              <label className="text-right font-medium" htmlFor="e-name">
                Location Name
              </label>
              <Input
                id="e-name"
                className="col-span-3"
                value={editForm.name}
                onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Enter location name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid grid-cols-4 items-center gap-4 text-sm">
                <label className="text-right font-medium" htmlFor="e-latitude">
                  Latitude
                </label>
                <Input
                  id="e-latitude"
                  className="col-span-3"
                  value={editForm.latitude}
                  onChange={(e) => setEditForm((p) => ({ ...p, latitude: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4 text-sm">
                <label className="text-right font-medium" htmlFor="e-longitude">
                  Longitude
                </label>
                <Input
                  id="e-longitude"
                  className="col-span-3"
                  value={editForm.longitude}
                  onChange={(e) => setEditForm((p) => ({ ...p, longitude: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4 text-sm">
              <label className="text-right font-medium" htmlFor="e-radius">
                Radius (m)
              </label>
              <Input
                id="e-radius"
                type="number"
                className="col-span-3"
                value={editForm.radius}
                onChange={(e) => setEditForm((p) => ({ ...p, radius: e.target.value }))}
              />
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
                  Saving…
                </span>
              ) : (
                <span>Save Changes</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ────────── Users dialog ────────── */}
      <Dialog open={showUsersModal} onOpenChange={setShowUsersModal}>
        <DialogContent className="w-[90vw] sm:max-w-lg md:max-w-xl max-h-[90vh] overflow-y-auto border-2 dark:border-white/10">
          <div className="h-1 w-full bg-orange-500 -mt-6 mb-4" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-orange-500/10 text-orange-500 dark:bg-orange-500/20 dark:text-orange-500">
                <Users2 className="h-5 w-5" />
              </div>
              Manage Users – {currentLocation?.name}
            </DialogTitle>
            <DialogDescription>Assign or remove users from this location</DialogDescription>
          </DialogHeader>

          {/* Assigned users */}
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
                              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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

          {/* Add user */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <PlusCircle className="h-4 w-4 text-orange-500" />
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
              <Button disabled={!selectedUserId || userActionLoading} onClick={addUser} className="bg-orange-500 hover:bg-orange-600 text-white">
                {userActionLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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

      {/* ────────── Delete confirm ────────── */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="sm:max-w-md border-2 border-red-200 dark:border-red-800/50">
          <div className="h-1 w-full bg-red-500 -mt-6 mb-4" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400">
                <AlertCircle className="h-5 w-5" />
              </div>
              Delete Location
            </DialogTitle>
            <DialogDescription>Are you sure you want to delete this location? This action cannot be undone.</DialogDescription>
          </DialogHeader>

          {locationToDelete && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 my-4">
              <p className="text-sm text-red-600 dark:text-red-400">
                You are about to delete the location <span className="font-bold">{locationToDelete.name}</span>. Any users assigned to this location will
                be unassigned.
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
            <Button variant="destructive" onClick={confirmDelete} className="bg-red-500 hover:bg-red-600">
              {deleteLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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

export default ManageLocations;
