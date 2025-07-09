// components/Dashboard/DashboardContent/Profile/MyPrsnlDplymntIdntfctns.jsx
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState } from "react";
import { User, MapPin, Shield, Users } from "lucide-react";
import useAuthStore from "@/store/useAuthStore";
import { toast, Toaster } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";

const API = process.env.NEXT_PUBLIC_API_URL;

/* ────────────────────────── helper components (static) ────────────────────────── */
const FormSection = ({ icon: Icon, title, children }) => (
  <div className="space-y-4">
    <div className="flex items-center gap-2 pb-2 border-b border-orange-500/20">
      <div className="p-2 rounded-full bg-orange-500/10 text-orange-500">
        <Icon className="h-4 w-4" />
      </div>
      <h3 className="font-semibold text-lg">{title}</h3>
    </div>
    <div className="space-y-4 pl-10">{children}</div>
  </div>
);

const FormField = ({ label, children, required = false }) => (
  <div className="space-y-2">
    <Label className="text-sm font-medium text-muted-foreground">
      {label} {required && <span className="text-orange-500">*</span>}
    </Label>
    {children}
  </div>
);
/* ──────────────────────────────────────────────────────────────────────────────── */

export default function MyPrsnlDplymntIdntfctns() {
  const { token } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    ssnItin: "",
    dateOfBirth: "",
    addressLine: "",
    city: "",
    state: "",
    postalCode: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
  });

  /* fetch profile */
  useEffect(() => {
    if (!token) return;
    fetch(`${API}/api/account/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((j) => {
        const p = j?.data?.profile;
        if (p) {
          setForm({
            firstName: p.firstName || "",
            lastName: p.lastName || "",
            phoneNumber: p.phoneNumber || "",
            ssnItin: p.ssnItin || "",
            dateOfBirth: p.dateOfBirth ? p.dateOfBirth.split("T")[0] : "",
            addressLine: p.addressLine || "",
            city: p.city || "",
            state: p.state || "",
            postalCode: p.postalCode || "",
            emergencyContactName: p.emergencyContactName || "",
            emergencyContactPhone: p.emergencyContactPhone || "",
          });
        }
      })
      .catch(() => toast.error("Failed to load profile"))
      .finally(() => setLoading(false));
  }, [token]);

  const save = async () => {
    setSaving(true);
    try {
      const r = await fetch(`${API}/api/account/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      if (r.ok) toast.success("Profile saved successfully!");
      else {
        const j = await r.json();
        toast.error(j.error || "Save failed");
      }
    } catch {
      toast.error("Save failed");
    }
    setSaving(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 lg:px-6 px-2 space-y-6">
      <Toaster />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <User className="h-7 w-7 text-orange-500" />
            Personal &amp; Identification
          </h2>
          <p className="text-muted-foreground mt-1">Manage your personal information and identification details</p>
        </div>
      </div>

      <Card className="border-2 shadow-md overflow-hidden dark:border-white/10">
        <div className="h-1 w-full bg-orange-500" />
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-orange-500/10 text-orange-500">
              <Shield className="h-5 w-5" />
            </div>
            Profile Information
          </CardTitle>
          <CardDescription>Update your personal details and contact information</CardDescription>
        </CardHeader>

        <CardContent className="space-y-8">
          {loading ? (
            <div className="space-y-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-4 w-32" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <FormSection icon={User} title="Personal Information">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="First Name" required>
                    <Input
                      placeholder="Enter your first name"
                      value={form.firstName}
                      onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                      className="focus:border-orange-500 focus:ring-orange-500/20"
                    />
                  </FormField>
                  <FormField label="Last Name" required>
                    <Input
                      placeholder="Enter your last name"
                      value={form.lastName}
                      onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                      className="focus:border-orange-500 focus:ring-orange-500/20"
                    />
                  </FormField>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="Phone Number" required>
                    <Input
                      placeholder="(555) 123-4567"
                      value={form.phoneNumber}
                      onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                      className="focus:border-orange-500 focus:ring-orange-500/20"
                    />
                  </FormField>
                  <FormField label="Date of Birth">
                    <Input
                      type="date"
                      value={form.dateOfBirth}
                      onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
                      className="focus:border-orange-500 focus:ring-orange-500/20"
                    />
                  </FormField>
                </div>
              </FormSection>

              <FormSection icon={Shield} title="Identification">
                <FormField label="SSN / ITIN" required>
                  <Input
                    placeholder="XXX-XX-XXXX"
                    type="password"
                    value={form.ssnItin}
                    onChange={(e) => setForm((f) => ({ ...f, ssnItin: e.target.value }))}
                    className="focus:border-orange-500 focus:ring-orange-500/20"
                  />
                </FormField>
              </FormSection>

              <FormSection icon={MapPin} title="Address Information">
                <FormField label="Address Line" required>
                  <Input
                    placeholder="123 Main Street, Apt 4B"
                    value={form.addressLine}
                    onChange={(e) => setForm((f) => ({ ...f, addressLine: e.target.value }))}
                    className="focus:border-orange-500 focus:ring-orange-500/20"
                  />
                </FormField>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField label="City" required>
                    <Input
                      placeholder="City"
                      value={form.city}
                      onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                      className="focus:border-orange-500 focus:ring-orange-500/20"
                    />
                  </FormField>
                  <FormField label="State" required>
                    <Input
                      placeholder="State"
                      value={form.state}
                      onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                      className="focus:border-orange-500 focus:ring-orange-500/20"
                    />
                  </FormField>
                  <FormField label="Postal Code" required>
                    <Input
                      placeholder="12345"
                      value={form.postalCode}
                      onChange={(e) => setForm((f) => ({ ...f, postalCode: e.target.value }))}
                      className="focus:border-orange-500 focus:ring-orange-500/20"
                    />
                  </FormField>
                </div>
              </FormSection>

              <FormSection icon={Users} title="Emergency Contact">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="Contact Name" required>
                    <Input
                      placeholder="Emergency contact full name"
                      value={form.emergencyContactName}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          emergencyContactName: e.target.value,
                        }))
                      }
                      className="focus:border-orange-500 focus:ring-orange-500/20"
                    />
                  </FormField>
                  <FormField label="Contact Phone" required>
                    <Input
                      placeholder="(555) 987-6543"
                      value={form.emergencyContactPhone}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          emergencyContactPhone: e.target.value,
                        }))
                      }
                      className="focus:border-orange-500 focus:ring-orange-500/20"
                    />
                  </FormField>
                </div>
              </FormSection>

              <div className="pt-6 border-t border-orange-500/20">
                <Button disabled={saving} onClick={save} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-3" size="lg">
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Saving Changes...
                    </>
                  ) : (
                    "Save Profile Information"
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
