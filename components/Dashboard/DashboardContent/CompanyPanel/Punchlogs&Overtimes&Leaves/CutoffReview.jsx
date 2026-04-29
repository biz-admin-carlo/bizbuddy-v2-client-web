// components/Dashboard/DashboardContent/CompanyPanel/PunchlogsB&OvertimesB&Leaves/CutoffReview.jsx
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ChevronRight,
  CircleDot,
  Lock,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Timer,
  Check,
  X,
  Pencil,
  XCircle,
  Zap,
  GitMerge,
  CalendarCheck,
  ChevronDown,
  Search,
  Loader2,
  LayoutList,
  AlertCircle,
  CalendarX,
  Info,
  FileText,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import useAuthStore from "@/store/useAuthStore";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  open:      { label: "Open",      icon: CircleDot,    color: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400" },
  locked:    { label: "Locked",    icon: Lock,         color: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400" },
  processed: { label: "Processed", icon: CheckCircle2, color: "bg-blue-100  text-blue-700  border-blue-200  dark:bg-blue-900/30  dark:text-blue-400"  },
};

const ROW_TYPE_CONFIG = {
  punch:       { label: "Punch",    icon: Clock,         rowBg: "bg-white dark:bg-neutral-900",          typeColor: "text-blue-600",   typeBg: "bg-blue-50  dark:bg-blue-900/20"  },
  leave:       { label: "Leave",    icon: CalendarCheck, rowBg: "bg-green-50 dark:bg-green-900/10",      typeColor: "text-green-600",  typeBg: "bg-green-50 dark:bg-green-900/30" },
  rest:        { label: "Rest",     icon: X,             rowBg: "bg-neutral-50 dark:bg-neutral-800/40",  typeColor: "text-neutral-400",typeBg: "bg-neutral-100 dark:bg-neutral-800"},
  unscheduled: { label: "Punch",    icon: AlertTriangle, rowBg: "bg-amber-50  dark:bg-amber-900/10",     typeColor: "text-amber-600",  typeBg: "bg-amber-50 dark:bg-amber-900/30" },
  conflict:    { label: "Conflict", icon: GitMerge,      rowBg: "bg-red-50    dark:bg-red-900/10",       typeColor: "text-red-600",    typeBg: "bg-red-50   dark:bg-red-900/30"   },
  approved:    { label: "Punch",    icon: CheckCircle2,  rowBg: "bg-green-50  dark:bg-green-900/10",     typeColor: "text-green-600",  typeBg: "bg-green-50 dark:bg-green-900/30" },
  excluded:    { label: "Punch",    icon: XCircle,       rowBg: "bg-neutral-50 dark:bg-neutral-800/40 opacity-60", typeColor: "text-neutral-400", typeBg: "bg-neutral-100" },
};

const EXCLUDE_REASONS = [
  "Unscheduled punch — non-working day",
  "Duplicate entry",
  "Suspected invalid punch",
  "Leave takes precedence",
  "Data / system error",
  "Other",
];

const TAG_TOOLTIPS = {
  snap: "Clock-in will snap to scheduled start — within the grace period.",
  late: "Clocked in after the grace period ended. Late minutes flagged for review.",
  flag: "This record has been flagged and needs attention.",
  ot:   "Approved overtime included. Extra hours added to total payable.",
  auto: "System auto clock-out triggered — no manual clock-out recorded.",
};

const SEGMENT_LABELS = { driver_am: "Driver AM", regular: "Regular", driver_pm: "Driver PM" };
const SEGMENT_ORDER  = { driver_am: 0, regular: 1, driver_pm: 2 };

const formatDate = (d) => {
  if (!d) return "—";
  const [year, month, day] = d.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
};

/** Inline info tooltip — renders below the icon to avoid overflow clipping */
const InfoTooltip = ({ text, side = "bottom" }) => (
  <span className="relative group inline-flex items-center ml-0.5 cursor-help align-middle">
    <Info className="w-3 h-3 text-neutral-300 group-hover:text-neutral-500 transition-colors duration-100" />
    <span className={`
      pointer-events-none absolute z-[9999]
      ${side === "top"
        ? "bottom-full left-1/2 -translate-x-1/2 mb-2"
        : "top-full left-1/2 -translate-x-1/2 mt-2"}
      w-52 rounded-xl bg-neutral-900 text-white text-[11px] font-normal leading-relaxed
      px-3 py-2.5 shadow-2xl
      opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100
      transition-all duration-150 origin-top
      whitespace-normal break-words
    `}>
      {text}
      <span className={`
        absolute left-1/2 -translate-x-1/2
        ${side === "top"
          ? "top-full border-4 border-transparent border-t-neutral-900"
          : "bottom-full border-4 border-transparent border-b-neutral-900"}
      `} />
    </span>
  </span>
);

const formatDateTime = (d, tz = "UTC") =>
  d ? new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true, timeZone: tz }) : "—";

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

/** Sticky page header */
const PageHeader = ({ cutoff, status, onFinalize, finalizeReady, getDepartmentName, onSync, syncing }) => {
  const StatusIcon = STATUS_CONFIG[status]?.icon || CircleDot;
  return (
    <div className="sticky top-0 z-30 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 shadow-sm">
      {/* Top row */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-neutral-500 hover:text-neutral-800"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <span className="text-neutral-300 dark:text-neutral-600 text-lg font-light">/</span>
          <nav className="flex items-center gap-1.5 text-sm">
            <span className="text-neutral-500">Cutoff Periods</span>
            <ChevronRight className="w-3.5 h-3.5 text-neutral-300" />
            <span className="text-neutral-500">{getDepartmentName(cutoff?.departmentId)}</span>
            <ChevronRight className="w-3.5 h-3.5 text-neutral-300" />
            <span className="font-semibold text-neutral-800 dark:text-neutral-200">
              {formatDate(cutoff?.periodStart)} – {formatDate(cutoff?.periodEnd)}
            </span>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Badge className={`gap-1.5 border ${STATUS_CONFIG[status]?.color || ""}`}>
            <StatusIcon className="w-3 h-3" />
            {STATUS_CONFIG[status]?.label || status}
          </Badge>
          <span className="text-xs text-neutral-400">
            Payment: <strong className="text-neutral-700 dark:text-neutral-300">{formatDate(cutoff?.paymentDate)}</strong>
          </span>

          {/* ✅ Sync button — picks up new employees/punches added after cutoff was created */}
          {status === "open" && (
            <Button
              size="sm"
              variant="outline"
              onClick={onSync}
              disabled={syncing}
              className="gap-2 border-neutral-200 text-neutral-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing…" : "Sync Records"}
            </Button>
          )}

          <Button
            size="sm"
            disabled={!finalizeReady}
            onClick={onFinalize}
            className={`gap-2 transition-all ${
              finalizeReady
                ? "bg-orange-500 hover:bg-orange-600 text-white"
                : "bg-neutral-200 text-neutral-400 cursor-not-allowed"
            }`}
          >
            <Lock className="w-3.5 h-3.5" /> Finalize Cutoff
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-0 px-6 py-2.5 border-b border-neutral-100 dark:border-neutral-800">
        {[
          { label: "Total Records", value: null, id: "total",     icon: LayoutList,   color: "text-neutral-800 dark:text-neutral-200" },
          { label: "Approved",      value: null, id: "approved",   icon: CheckCircle2, color: "text-green-600" },
          { label: "Unreviewed",    value: null, id: "unreviewed", icon: Clock,        color: "text-neutral-700 dark:text-neutral-300" },
          { label: "Flagged",       value: null, id: "flagged",    icon: AlertTriangle,color: "text-red-600" },
          { label: "Total Hours",   value: null, id: "hours",      icon: Timer,        color: "text-blue-600" },
        ].map((s, i) => (
          <div key={s.id} className={`flex items-center gap-2.5 pr-6 mr-6 ${i < 4 ? "border-r border-neutral-200 dark:border-neutral-700" : ""}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0`}
              style={{ background: "var(--stat-bg)" }}>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">{s.label}</div>
              <div className={`text-lg font-extrabold leading-none ${s.color}`} id={`stat-${s.id}`}>—</div>
            </div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div id="progress-wrap" className="h-0.5 bg-neutral-100 dark:bg-neutral-800">
        <div
          id="progress-fill"
          className="h-full bg-orange-500 transition-all duration-500"
          style={{ width: "0%" }}
        />
      </div>
    </div>
  );
};

/** Filter bar */
const FilterBar = ({ tabs, activeTab, onTab, search, onSearch, chips, onChip }) => (
  <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6">
    {/* Tabs */}
    <div className="flex items-center gap-1 border-b border-neutral-100 dark:border-neutral-800">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onTab(t.id)}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-all
            ${activeTab === t.id
              ? "text-orange-500 border-orange-500 font-bold"
              : "text-neutral-500 border-transparent hover:text-neutral-800"
            }`}
        >
          {t.label}
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full
            ${activeTab === t.id ? "bg-orange-100 text-orange-500" : "bg-neutral-100 text-neutral-500"}`}>
            {t.count}
          </span>
        </button>
      ))}
    </div>
    {/* Chips */}
    <div className="flex items-center gap-2 py-2.5 flex-wrap">
      <div className="flex items-center gap-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-1.5 max-w-[240px]">
        <Search className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
        <input
          type="text"
          placeholder="Search employees..."
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="bg-transparent text-sm outline-none text-neutral-700 dark:text-neutral-300 placeholder:text-neutral-400 w-full"
        />
      </div>
      {chips.map((c) => (
        <button
          key={c.id}
          onClick={() => onChip(c.id)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
            ${c.active
              ? "bg-orange-500 border-orange-500 text-white"
              : "bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:border-orange-400 hover:text-orange-500"
            }`}
        >
          <c.icon className="w-3 h-3" /> {c.label}
        </button>
      ))}
    </div>
  </div>
);

/** Tag pill with tooltip */
const TagPill = ({ cls, label, tooltip }) => {
  const styles = {
    snap:  "bg-emerald-50 text-emerald-700 border border-emerald-200",
    late:  "bg-red-50    text-red-600    border border-red-200",
    flag:  "bg-amber-50  text-amber-700  border border-amber-200",
    ot:    "bg-violet-50 text-violet-700 border border-violet-200",
    auto:  "bg-sky-50    text-sky-700    border border-sky-200",
  };
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full
      ${styles[cls] || "bg-neutral-100 text-neutral-500 border border-neutral-200"}`}>
      {label}
      {tooltip && <InfoTooltip text={tooltip} />}
    </span>
  );
};

/** Action button */
const ActionBtn = ({ color, icon: Icon, label, onClick }) => {
  const variants = {
    green:   "text-emerald-600 border-emerald-200 hover:bg-emerald-500 hover:text-white hover:border-emerald-500",
    purple:  "text-violet-600  border-violet-200  hover:bg-violet-500  hover:text-white hover:border-violet-500",
    blue:    "text-blue-600    border-blue-200    hover:bg-blue-500    hover:text-white hover:border-blue-500",
    neutral: "text-neutral-600 border-neutral-200 hover:bg-neutral-100",
    red:     "text-red-500     border-red-200     hover:bg-red-500     hover:text-white hover:border-red-500",
  };
  return (
    <button onClick={onClick}
      className={`inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border bg-white transition-all duration-150 ${variants[color] || variants.neutral}`}>
      <Icon className="w-3 h-3" /> {label}
    </button>
  );
};

/** Single timeline row inside an employee card */
const TimelineRow = ({ rec, onApprove, onApproveOT, onEdit, onExclude, onConflict }) => {
  const cfg = ROW_TYPE_CONFIG[rec.localStatus || rec.type] || ROW_TYPE_CONFIG.punch;
  const TypeIcon = cfg.icon;
  const isLocked         = ["approved", "excluded", "resolved"].includes(rec.localStatus);
  const isRestOrPreApproved = rec.type === "rest" || rec.actions?.includes("pre-approved");

  return (
    <tr className={`border-b border-neutral-100 dark:border-neutral-800 last:border-b-0 transition-colors ${cfg.rowBg}`}>

      {/* Date */}
      <td className="px-4 py-3 w-20 align-top">
        <span className="font-mono text-[11px] font-medium text-neutral-400">{rec.date}</span>
      </td>

      {/* Type badge */}
      <td className="px-3 py-3 w-24 align-top">
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${cfg.typeBg}`}>
          <TypeIcon className={`w-3 h-3 ${cfg.typeColor}`} />
          <span className={cfg.typeColor}>{cfg.label}</span>
        </div>
      </td>

      {/* Detail column */}
      <td className="px-3 py-3 align-top">

        {/* Schedule strip */}
        {rec.scheduleInfo && (
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-neutral-500">
              {rec.scheduleInfo.scheduledHours}h scheduled
              <InfoTooltip text="Total hours in this shift. Payable hours are calculated from this baseline after applying snap rules and break deductions." />
            </span>
          </div>
        )}

        {/* No schedule warning + employee remark */}
        {!rec.scheduleInfo && rec.type !== "leave" && rec.type !== "rest" && (
          <div className="mb-2">
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              <AlertTriangle className="w-2.5 h-2.5" />
              No schedule for this day
              <InfoTooltip text="No shift assigned. If approved, actual clocked hours will be used as payable hours." />
            </span>
          </div>
        )}

        {/* Employee reason — shown whenever a no_schedule remark exists,
            regardless of whether a schedule was matched (timezone mismatches
            can cause a wrong shift to be found even for unscheduled punches) */}
        {rec.noScheduleRemark && (
          <div className="mb-2 flex items-start gap-2 px-2.5 py-2 rounded-xl bg-neutral-50 border border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700 max-w-md">
            <FileText className="w-3.5 h-3.5 text-neutral-400 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide mb-0.5">Employee Reason</p>
              <p className="text-[11px] text-neutral-700 dark:text-neutral-300 leading-relaxed break-words">
                {rec.noScheduleRemark.message}
              </p>
            </div>
          </div>
        )}

        {/* Pending leave warning */}
        {rec.pendingLeave && (
          <div className="mb-2">
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200">
              <CalendarCheck className="w-2.5 h-2.5" />
              Pending {rec.pendingLeave.leaveType} leave
              <InfoTooltip text="A pending leave request exists for this day. Review and approve or reject the leave before finalizing this punch." />
            </span>
          </div>
        )}

        {/* Punch times */}
        <div className="text-[12px] font-medium text-neutral-700 dark:text-neutral-300 mb-1.5"
          dangerouslySetInnerHTML={{ __html: rec.detail }} />

        {/* Tag pills */}
        {rec.tags?.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {rec.tags.map((t, i) => (
              <TagPill key={i} cls={t.cls} label={t.label} tooltip={TAG_TOOLTIPS[t.cls]} />
            ))}
          </div>
        )}
      </td>

      {/* Hours */}
      <td className="px-3 py-3 w-24 text-right align-top">
        {rec.hours > 0 ? (
          <div>
            <div className="inline-flex items-center gap-0.5 justify-end">
              <span className={`font-mono text-sm font-extrabold
                ${rec.type === "leave"    ? "text-emerald-600" :
                  rec.type === "conflict" ? "text-red-500"     :
                  rec.type === "rest"     ? "text-neutral-300" :
                  "text-neutral-800 dark:text-neutral-100"}`}>
                {parseFloat(rec.hours).toFixed(2).replace(/\.?0+$/, "")}h
              </span>
              <InfoTooltip text="Payable hours after snap rules and break deductions. This goes to payroll on approval." />
            </div>
            {rec.scheduledHours > 0 && (
              <div className="text-[10px] text-neutral-400 mt-0.5 tabular-nums">
                / {rec.scheduledHours}h sched.
              </div>
            )}
          </div>
        ) : (
          <span className="text-neutral-300 text-sm">—</span>
        )}
      </td>

      {/* Actions */}
      <td className="px-3 py-3 w-52 align-top">
        {isLocked && (
          <div className="flex justify-end">
            {rec.localStatus === "excluded"
              ? <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg bg-neutral-100 text-neutral-400 border border-neutral-200"><XCircle className="w-3 h-3" /> Excluded</span>
              : <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200"><Check className="w-3 h-3" /> Approved</span>
            }
          </div>
        )}
        {isRestOrPreApproved && !isLocked && (
          <div className="flex justify-end">
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Pre-approved
            </span>
          </div>
        )}
        {!isLocked && !isRestOrPreApproved && (
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {rec.actions?.includes("approve")      && <ActionBtn color="green"   icon={Check}        label="Approve"      onClick={() => onApprove(rec.id)} />}
              {rec.actions?.includes("approve-ot")   && <ActionBtn color="purple"  icon={Zap}          label="+ OT"         onClick={() => onApproveOT(rec.id)} />}
              {rec.actions?.includes("honor-punch")  && <ActionBtn color="blue"    icon={Clock}        label="Honor Punch"  onClick={() => onConflict(rec.id, "punch")} />}
              {rec.actions?.includes("honor-leave")  && <ActionBtn color="green"   icon={CalendarCheck} label="Honor Leave" onClick={() => onConflict(rec.id, "leave")} />}
              {rec.actions?.includes("edit")         && <ActionBtn color="neutral" icon={Pencil}       label="Edit"         onClick={(e) => { e.stopPropagation(); onEdit(rec); }} />}
            </div>
            {rec.actions?.includes("exclude") && (
              <ActionBtn color="red" icon={X} label="Exclude" onClick={(e) => { e.stopPropagation(); onExclude(rec.id); }} />
            )}
          </div>
        )}
      </td>
    </tr>
  );
};

/** Single segment row inside a driver day group */
const DriverSegmentRow = ({ seg, onApprove, onApproveOT, onExclude }) => {
  const isLocked = ["approved", "excluded", "resolved"].includes(seg.localStatus);
  return (
    <tr className="border-b border-neutral-100 dark:border-neutral-800 last:border-b-0 bg-white dark:bg-neutral-900">
      <td className="px-4 py-2.5 w-20 align-top">
        <span className="font-mono text-[10px] text-neutral-300 pl-2">└</span>
      </td>
      <td className="px-3 py-2.5 w-28 align-top">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-violet-50 dark:bg-violet-900/20 whitespace-nowrap">
          <Clock className="w-3 h-3 text-violet-600" />
          <span className="text-violet-600">{SEGMENT_LABELS[seg.segmentType] || seg.segmentType}</span>
        </div>
      </td>
      <td className="px-3 py-2.5 align-top">
        <div className="text-[12px] font-medium text-neutral-700 dark:text-neutral-300 mb-1.5"
          dangerouslySetInnerHTML={{ __html: seg.detail }} />
        {seg.tags?.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {seg.tags.map((t, i) => (
              <TagPill key={i} cls={t.cls} label={t.label} tooltip={TAG_TOOLTIPS[t.cls]} />
            ))}
          </div>
        )}
      </td>
      <td className="px-3 py-2.5 w-24 text-right align-top">
        {seg.hours > 0 ? (
          <span className="font-mono text-sm font-extrabold text-neutral-800 dark:text-neutral-100">
            {parseFloat(seg.hours).toFixed(2).replace(/\.?0+$/, "")}h
          </span>
        ) : (
          <span className="text-neutral-300 text-sm">—</span>
        )}
      </td>
      <td className="px-3 py-2.5 w-52 align-top">
        {isLocked ? (
          <div className="flex justify-end">
            {seg.localStatus === "excluded"
              ? <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg bg-neutral-100 text-neutral-400 border border-neutral-200"><XCircle className="w-3 h-3" /> Excluded</span>
              : <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200"><Check className="w-3 h-3" /> Approved</span>
            }
          </div>
        ) : (
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-1.5">
              {seg.actions?.includes("approve")    && <ActionBtn color="green"  icon={Check} label="Approve" onClick={() => onApprove(seg.id)} />}
              {seg.actions?.includes("approve-ot") && <ActionBtn color="purple" icon={Zap}   label="+ OT"    onClick={() => onApproveOT(seg.id)} />}
            </div>
            {seg.actions?.includes("exclude") && (
              <ActionBtn color="red" icon={X} label="Exclude" onClick={() => onExclude(seg.id)} />
            )}
          </div>
        )}
      </td>
    </tr>
  );
};

/** Driver day group — header row + one DriverSegmentRow per segment */
const DriverGroupRow = ({ group, onApprove, onApproveOT, onExclude }) => (
  <>
    <tr className="bg-violet-50/40 dark:bg-violet-900/10 border-b border-violet-100 dark:border-violet-900/20">
      <td className="px-4 py-2 w-20 align-middle">
        <span className="font-mono text-[11px] font-medium text-neutral-400">{group.date}</span>
      </td>
      <td colSpan={3} className="px-3 py-2 align-middle">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-violet-600">
          <Timer className="w-3 h-3" /> Driver Day — {group.segments.length} segments
        </span>
      </td>
      <td className="px-3 py-2 text-right align-middle">
        <span className="font-mono text-sm font-extrabold text-neutral-600 dark:text-neutral-300">
          {parseFloat(group.hours).toFixed(2).replace(/\.?0+$/, "")}h total
        </span>
      </td>
    </tr>
    {group.segments.map((seg) => (
      <DriverSegmentRow key={seg.id} seg={seg} onApprove={onApprove} onApproveOT={onApproveOT} onExclude={onExclude} />
    ))}
  </>
);

/** Employee card */
const EmployeeCard = ({ emp, onApprove, onApproveOT, onEdit, onExclude, onConflict, onBulkApprove }) => {
  const [expanded, setExpanded] = useState(false);
  const hasConflict  = emp.records.some((r) => r.type === "conflict" && !r.localStatus);
  const hasFlag      = emp.records.some((r) => {
    if (r.type === "driver_group") return r.segments.some((s) => s.tags?.length && !s.localStatus);
    return (r.type === "unscheduled" || r.tags?.length) && !r.localStatus;
  });
  const allDone      = emp.pending === 0;
  const punchCount   = emp.records.reduce((n, r) => {
    if (r.type === "driver_group") return n + r.segments.length;
    return ["rest", "leave"].includes(r.type) ? n : n + 1;
  }, 0);
  const leaveCount   = emp.records.filter((r) => r.type === "leave").length;

  const cardBorder = hasConflict
    ? "border-red-200 dark:border-red-800"
    : hasFlag
    ? "border-amber-200 dark:border-amber-800"
    : allDone
    ? "border-green-200 dark:border-green-800"
    : "border-neutral-200 dark:border-neutral-800";

  return (
    <div className={`bg-white dark:bg-neutral-900 rounded-xl border ${cardBorder} overflow-hidden shadow-sm hover:shadow-md transition-shadow`}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Avatar */}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-extrabold text-white flex-shrink-0"
          style={{ background: emp.color }}
        >
          {emp.initials}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm text-neutral-800 dark:text-neutral-200 truncate">{emp.name}</div>
          <div className="text-xs text-neutral-400 truncate">{emp.email}</div>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {hasConflict  && <Badge className="bg-red-100    text-red-600    border-red-200    text-[10px] gap-1"><GitMerge className="w-2.5 h-2.5" /> Conflict</Badge>}
          {hasFlag && !hasConflict && <Badge className="bg-amber-100  text-amber-600  border-amber-200  text-[10px] gap-1"><AlertTriangle className="w-2.5 h-2.5" /> Flagged</Badge>}
          {emp.hasOT    && <Badge className="bg-purple-100 text-purple-600 border-purple-200 text-[10px] gap-1"><Zap className="w-2.5 h-2.5" /> OT</Badge>}
          {allDone      && <Badge className="bg-green-100  text-green-600  border-green-200  text-[10px] gap-1"><CheckCircle2 className="w-2.5 h-2.5" /> Done</Badge>}
        </div>

        {/* Pills */}
        <div className="flex items-center gap-2 ml-2">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
            <Check className="w-2.5 h-2.5" /> {emp.approved}
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500">
            <Clock className="w-2.5 h-2.5" /> {emp.pending}
          </span>
        </div>

        {/* Total */}
        <div className="text-right ml-2 min-w-[52px]">
          <div className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wide">Payable</div>
          <div className={`text-base font-extrabold font-mono ${emp.pending > 0 ? "text-orange-500" : "text-neutral-800 dark:text-neutral-200"}`}>
            {parseFloat(emp.totalHours).toFixed(2).replace(/\.?0+$/, "")}h
          </div>
        </div>

        {/* Expand icon */}
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="w-6 h-6 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center flex-shrink-0"
        >
          <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
        </motion.div>
      </div>

      {/* Body */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-neutral-100 dark:border-neutral-800"
          >
            {/* Conflict banner */}
            {hasConflict && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 text-xs text-red-600 font-medium">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Conflict detected — a punch and an approved leave exist on the same day. Resolve before approving.</span>
              </div>
            )}

            {/* Timeline table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-100 dark:border-neutral-800">
                    {["Date", "Type", "Details", "Hours", ""].map((h) => (
                      <th key={h} className={`px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-neutral-400 ${h === "" ? "text-right" : ""}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {emp.records.map((rec) =>
                    rec.type === "driver_group" ? (
                      <DriverGroupRow
                        key={rec.id}
                        group={rec}
                        onApprove={onApprove}
                        onApproveOT={onApproveOT}
                        onExclude={onExclude}
                      />
                    ) : (
                      <TimelineRow
                        key={rec.id}
                        rec={rec}
                        onApprove={onApprove}
                        onApproveOT={onApproveOT}
                        onEdit={onEdit}
                        onExclude={onExclude}
                        onConflict={onConflict}
                      />
                    )
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-3 bg-neutral-50 dark:bg-neutral-800/50 border-t border-neutral-100 dark:border-neutral-800">
              <span className="text-xs text-neutral-500">
                {punchCount} punch {punchCount !== 1 ? "records" : "record"} · {leaveCount} leave {leaveCount !== 1 ? "records" : "record"}
              </span>
              <div className="flex items-center gap-3">
                {emp.hasBulk && emp.pending > 0 && (
                  <Button size="sm" className="bg-orange-500 hover:bg-orange-600 gap-1.5 text-xs h-7" onClick={() => onBulkApprove(emp.id)}>
                    <CheckCircle2 className="w-3 h-3" /> Approve All Clean
                  </Button>
                )}
                <div className="text-right">
                  <div className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wide">Total Payable</div>
                  <div className="text-lg font-extrabold font-mono text-neutral-800 dark:text-neutral-200">{parseFloat(emp.totalHours).toFixed(2).replace(/\.?0+$/, "")}h</div>
                  <div className="text-[10px] text-neutral-400">{parseFloat(emp.punchHours).toFixed(2).replace(/\.?0+$/, "")}h punch · {parseFloat(emp.leaveHours).toFixed(2).replace(/\.?0+$/, "")}h leave</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function CutoffReview({ cutoffId }) {
  const { token } = useAuthStore();
  const router = useRouter();

  // ── Server data ──
  const [cutoff,           setCutoff]           = useState(null);
  const [departments,      setDepartments]      = useState([]);
  const [employees,        setEmployees]        = useState([]); // processed employee objects
  const [isLoading,        setIsLoading]        = useState(true);
  const [syncing,          setSyncing]          = useState(false);
  const [companyTimezone,  setCompanyTimezone]  = useState("UTC");

  // ── Local action state (optimistic UI) ──
  const [localStatus,  setLocalStatus]  = useState({}); // { [recId]: 'approved'|'excluded'|'resolved' }

  // ── Modals ──
  const [editModal,     setEditModal]     = useState(null); // { rec }
  const [excludeModal,  setExcludeModal]  = useState(null); // { recId }
  const [finalizeModal, setFinalizeModal] = useState(false);
  const [isSaving,      setIsSaving]      = useState(false);
  const [excludeReason, setExcludeReason] = useState("");
  const [excludeNote,   setExcludeNote]   = useState("");

  // ── Filters ──
  const [activeTab,    setActiveTab]    = useState("all");
  const [search,       setSearch]       = useState("");
  const [chips, setChips] = useState([
    { id: "late",       label: "Late Arrivals",  icon: Clock,          active: false },
    { id: "unscheduled",label: "No Schedule",    icon: CalendarX,      active: false },
    { id: "ot",         label: "Has OT",         icon: Zap,            active: false },
    { id: "conflict",   label: "Conflicts",      icon: GitMerge,       active: false },
    { id: "leave",      label: "Has Leave",      icon: CalendarCheck,  active: false },
  ]);

  // ─────────────────────────────────────────────────────────────────────
  // FETCH
  // ─────────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!token || !cutoffId) return;
    try {
      setIsLoading(true);
      const [cutoffRes, deptRes, approvalsRes, settingsRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/cutoff-periods/${cutoffId}`,         { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/departments`,                         { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/cutoff-periods/${cutoffId}/approvals`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/company-settings/`,                   { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const [cutoffData, deptData, approvalsData, settingsData] = await Promise.all([
        cutoffRes.ok    ? cutoffRes.json()    : { data: null },
        deptRes.ok      ? deptRes.json()      : { data: [] },
        approvalsRes.ok ? approvalsRes.json() : { data: [] },
        settingsRes.ok  ? settingsRes.json()  : { data: {} },
      ]);

      setCutoff(cutoffData.data);
      setDepartments(deptData.data || []);
      // prefer timezone embedded in approvals payload; fall back to company settings
      setCompanyTimezone(
        approvalsData.companyTimezone ||
        settingsData.data?.timezone ||
        settingsData.data?.companyTimezone ||
        "UTC"
      );

      // Transform approvals into employee-grouped records
      const empMap = {};
      const COLORS = ["#f97316","#8b5cf6","#2563eb","#ec4899","#0891b2","#16a34a","#7c3aed","#0d9488","#db2777","#b45309","#be185d","#0369a1","#ca8a04"];
      let colorIdx = 0;

      // Process punch approval records
      (approvalsData.data || []).forEach((approval) => {
        const user   = approval.timeLog?.user;
        const userId = user?.id;
        if (!userId) return;

        if (!empMap[userId]) {
          const initials = ((user.profile?.firstName?.[0] || "") + (user.profile?.lastName?.[0] || "") || user.username?.[0] || "?").toUpperCase();
          empMap[userId] = {
            id:        userId,
            name:      `${user.profile?.firstName || ""} ${user.profile?.lastName || user.username || ""}`.trim(),
            email:     user.email,
            initials,
            color:     COLORS[colorIdx++ % COLORS.length],
            records:   [],
            hasOT:     false,
            hasBulk:   false,
          };
        }

        const emp     = empMap[userId];
        const details = buildDetails(approval);
        emp.records.push(details);
        if (details.hasOT) emp.hasOT = true;
        if (details.actions?.includes("approve") && !["conflict","unscheduled"].includes(details.type)) {
          emp.hasBulk = true;
        }
      });

      // ✅ Process standalone leave rows (approved leaves with no punch on same day)
      (approvalsData.leaves || []).forEach((leaveRow) => {
        const user   = leaveRow.user;
        const userId = user?.id;
        if (!userId) return;

        if (!empMap[userId]) {
          const initials = ((user.profile?.firstName?.[0] || "") + (user.profile?.lastName?.[0] || "") || user.username?.[0] || "?").toUpperCase();
          empMap[userId] = {
            id:        userId,
            name:      `${user.profile?.firstName || ""} ${user.profile?.lastName || user.username || ""}`.trim(),
            email:     user.email,
            initials,
            color:     COLORS[colorIdx++ % COLORS.length],
            records:   [],
            hasOT:     false,
            hasBulk:   false,
          };
        }

        empMap[userId].records.push({
          id:           leaveRow.id,
          timeLogId:    null,
          segmentType:  null,
          date:         new Date(leaveRow.leaveDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: companyTimezone }),
          type:         "leave",
          detail:       `${leaveRow.leave.leaveType} — <strong>Approved</strong>`,
          tags:         [],
          actions:      ["pre-approved"],
          hours:        8,
          scheduledHours: 0,
          scheduleInfo: null,
          hasOT:        false,
          timeIn:       "—",
          timeOut:      "—",
          localStatus:  null,
          pendingLeave: null,
        });
      });

      setEmployees(Object.values(empMap).map((emp) => ({
        ...emp,
        records: groupDriverRecords(emp.records),
      })));
    } catch (err) {
      console.error("CutoffReview fetchData:", err);
      toast.error("Failed to load review data");
    } finally {
      setIsLoading(false);
    }
  }, [token, cutoffId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─────────────────────────────────────────────────────────────────────
  // SYNC — picks up new employees / punch records added after cutoff creation
  // ─────────────────────────────────────────────────────────────────────
  const doSync = useCallback(async () => {
    if (!token || !cutoffId || syncing) return;
    setSyncing(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/cutoff-periods/${cutoffId}/sync`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Sync failed");

      if (data.data?.created > 0) {
        toast.success(`Synced — ${data.data.created} new record(s) added`);
        await fetchData(); // refresh the full list
      } else {
        toast.info("Already up to date — no new records found");
      }
    } catch (err) {
      toast.error(err.message || "Sync failed");
    } finally {
      setSyncing(false);
    }
  }, [token, cutoffId, syncing, fetchData]);

  // ─────────────────────────────────────────────────────────────────────
  // BUILD RECORD DETAILS FROM API APPROVAL OBJECT
  // ─────────────────────────────────────────────────────────────────────
  function buildDetails(approval) {
    const tl       = approval.timeLog || {};
    const schedule = approval.schedule;
    const calc     = approval.calculatedData || {};
    const payroll  = approval.payrollSummary || {};
    const date     = tl.timeIn ? new Date(tl.timeIn).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: companyTimezone }) : "—";

    const isLate        = calc.lateMinutes > 0 && calc.lateStatus === "beyond_grace";
    const withinGrace   = calc.lateMinutes > 0 && calc.lateStatus === "within_grace";
    const leftEarly     = calc.earlyMinutes > 0;
    const hasOT         = calc.hasApprovedOT || false;
    const isUnscheduled = !schedule;
    const isConflict    = approval.hasLeaveConflict || false;

    // Determine type
    let type = "punch";
    if (isConflict)    type = "conflict";
    else if (isUnscheduled) type = "unscheduled";

    // Build detail HTML
    const inTime  = tl.timeIn  ? formatDateTime(tl.timeIn,  companyTimezone) : "—";
    const outTime = tl.timeOut ? formatDateTime(tl.timeOut, companyTimezone) : "Not clocked out";
    let detail = `<strong>In: ${inTime}</strong> &rarr; <strong>Out: ${outTime}</strong>`;
    if (isConflict && approval.leaveRecord) {
      detail = `<strong>Punch:</strong> ${inTime} &rarr; ${outTime} &nbsp;|&nbsp; <strong>Leave:</strong> ${approval.leaveRecord.leaveType} (Approved)`;
    }

    // Tags
    const tags = [];
    if (isLate)      tags.push({ cls: "late", label: `${calc.lateMinutes}min late` });
    if (withinGrace) tags.push({ cls: "snap", label: "Within grace — snaps to schedule" });
    if (leftEarly)   tags.push({ cls: "flag", label: `Left ${calc.earlyMinutes}min early` });
    if (hasOT)       tags.push({ cls: "ot",   label: `+${calc.overtimeHours}h OT` });
    if (calc.willSnapIn)  tags.push({ cls: "snap", label: "Clock-in will snap" });
    if (calc.willSnapOut) tags.push({ cls: "snap", label: "Clock-out will snap" });
    if (tl.autoClockOut)  tags.push({ cls: "auto", label: "Auto clock-out triggered" });
    if (approval.isDuplicate) tags.push({ cls: "flag", label: "Possible duplicate" });

    // Actions
    const actions = [];
    if (isConflict) {
      actions.push("honor-punch", "honor-leave");
    } else {
      actions.push("approve");
      if (hasOT || calc.potentialOT) actions.push("approve-ot");
      actions.push("edit", "exclude");
    }

    const actualHours   = calc.actualHours   || 0;
    const payableHours  = payroll.payableRegularHours || calc.payableHours || 0;
    const totalPayable  = payroll.totalPayableHours   || payableHours;

    const scheduleInfo = schedule
      ? { scheduledHours: schedule.scheduledHours || 0 }
      : null;

    // Extract no_schedule remark from TimeLog.remarks JSON array
    const remarks = Array.isArray(tl.remarks) ? tl.remarks : [];
    const noScheduleRemark = remarks.find((r) => r.type === "no_schedule") || null;

    return {
      id:           approval.id,
      timeLogId:    tl.id,
      segmentType:  approval.segmentType ?? null,
      date,
      type,
      detail,
      tags,
      actions,
      hours:        parseFloat(totalPayable) || 0,
      scheduledHours: schedule?.scheduledHours || 0,
      scheduleInfo,
      hasOT,
      timeIn:       inTime,
      timeOut:      outTime,
      pendingLeave:       approval.pendingLeave || null,
      noScheduleRemark,   // ✅ reason employee clocked in with no schedule
      localStatus:  approval.status === "approved" ? "approved" : approval.status === "excluded" ? "excluded" : null,
    };
  }

  // ─────────────────────────────────────────────────────────────────────
  // DRIVER RECORD GROUPING
  // ─────────────────────────────────────────────────────────────────────
  function groupDriverRecords(records) {
    const result = [];
    const driverGroupMap = {};

    for (const rec of records) {
      if (rec.segmentType !== null) {
        if (!driverGroupMap[rec.date]) {
          const group = { id: `driver-group-${rec.date}`, type: "driver_group", date: rec.date, segments: [], hours: 0 };
          driverGroupMap[rec.date] = group;
          result.push(group);
        }
        const group = driverGroupMap[rec.date];
        group.segments.push(rec);
        group.hours += rec.hours || 0;
      } else {
        result.push(rec);
      }
    }

    for (const group of Object.values(driverGroupMap)) {
      group.segments.sort((a, b) => (SEGMENT_ORDER[a.segmentType] ?? 99) - (SEGMENT_ORDER[b.segmentType] ?? 99));
    }

    return result;
  }

  // ─────────────────────────────────────────────────────────────────────
  // DERIVED — MERGE LOCAL STATUS INTO EMPLOYEE RECORDS
  // ─────────────────────────────────────────────────────────────────────
  const mergedEmployees = useMemo(() =>
    employees.map((emp) => {
      const records = emp.records.map((r) => {
        if (r.type === "driver_group") {
          const segments = r.segments.map((s) => ({ ...s, localStatus: localStatus[s.id] ?? s.localStatus }));
          return { ...r, segments, hours: segments.reduce((sum, s) => sum + (s.hours || 0), 0) };
        }
        return { ...r, localStatus: localStatus[r.id] ?? r.localStatus };
      });

      // Flatten actionable records — driver segments counted individually
      const actionableFlat = [];
      records.forEach((r) => {
        if (r.type === "driver_group") {
          r.segments.forEach((s) => actionableFlat.push(s));
        } else if (!["rest", "leave"].includes(r.type) && !r.actions?.includes("pre-approved")) {
          actionableFlat.push(r);
        }
      });

      const approved   = actionableFlat.filter((r) => r.localStatus === "approved" || r.localStatus === "resolved").length;
      const pending    = actionableFlat.filter((r) => !r.localStatus).length;
      const punchHours = records.reduce((s, r) => r.type === "leave" ? s : s + (r.hours || 0), 0);
      const leaveHours = records.filter((r) => r.type === "leave").reduce((s, r) => s + (r.hours || 0), 0);
      return { ...emp, records, approved, pending, totalHours: punchHours + leaveHours, punchHours, leaveHours };
    }),
  [employees, localStatus]);

  // Global stats
  const globalStats = useMemo(() => {
    const totalActionable = mergedEmployees.reduce((s, e) => s + e.approved + e.pending, 0);
    const totalApproved   = mergedEmployees.reduce((s, e) => s + e.approved, 0);
    const totalPending    = mergedEmployees.reduce((s, e) => s + e.pending, 0);
    const totalHours      = mergedEmployees.reduce((s, e) => s + e.totalHours, 0);
    const totalFlagged    = mergedEmployees.filter((e) =>
      e.records.some((r) => {
        if (r.type === "driver_group") return r.segments.some((s) => s.tags?.length && !s.localStatus);
        return (r.type === "conflict" || r.type === "unscheduled" || r.tags?.length) && !r.localStatus;
      })
    ).length;
    const pct = totalActionable > 0 ? Math.round(((totalApproved) / totalActionable) * 100) : 0;
    return { totalActionable, totalApproved, totalPending, totalHours, totalFlagged, pct };
  }, [mergedEmployees]);

  // Update DOM stats imperatively to avoid re-renders of the sticky header
  useEffect(() => {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set("stat-total",     globalStats.totalActionable);
    set("stat-approved",  globalStats.totalApproved);
    set("stat-unreviewed",globalStats.totalPending);
    set("stat-flagged",   globalStats.totalFlagged);
    set("stat-hours",     globalStats.totalHours.toFixed(1) + "h");
    const fill = document.getElementById("progress-fill");
    if (fill) fill.style.width = globalStats.pct + "%";
  }, [globalStats]);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    const activeChips = chips.filter((c) => c.active).map((c) => c.id);
    return mergedEmployees.filter((emp) => {
      // Tab filter
      if (activeTab === "flagged"  && !emp.records.some((r) => (r.type === "conflict" || r.type === "unscheduled") && !r.localStatus)) return false;
      if (activeTab === "approved" && emp.pending > 0) return false;
      if (activeTab === "excluded" && !emp.records.some((r) => r.localStatus === "excluded")) return false;
      // Search
      if (search && !emp.name.toLowerCase().includes(search.toLowerCase()) && !emp.email.toLowerCase().includes(search.toLowerCase())) return false;
      // Chips
      if (activeChips.includes("late")        && !emp.records.some((r) => r.type === "driver_group" ? r.segments.some((s) => s.tags?.some((t) => t.cls === "late")) : r.tags?.some((t) => t.cls === "late")))   return false;
      if (activeChips.includes("unscheduled") && !emp.records.some((r) => r.type === "unscheduled"))                return false;
      if (activeChips.includes("ot")          && !emp.hasOT)                                                        return false;
      if (activeChips.includes("conflict")    && !emp.records.some((r) => r.type === "conflict"))                   return false;
      if (activeChips.includes("leave")       && !emp.records.some((r) => r.type === "leave"))                      return false;
      return true;
    });
  }, [mergedEmployees, activeTab, search, chips]);

  const tabs = useMemo(() => [
    { id: "all",      label: "All",      count: mergedEmployees.length },
    { id: "flagged",  label: "Flagged",  count: mergedEmployees.filter((e) => e.records.some((r) => ["conflict","unscheduled"].includes(r.type) && !r.localStatus)).length },
    { id: "approved", label: "Approved", count: mergedEmployees.filter((e) => e.pending === 0 && e.approved > 0).length },
    { id: "excluded", label: "Excluded", count: mergedEmployees.filter((e) => e.records.some((r) => r.localStatus === "excluded")).length },
  ], [mergedEmployees]);

  const getDepartmentName = useCallback(
    (id) => departments.find((d) => d.id === id)?.name || "No Department",
    [departments]
  );

  // ─────────────────────────────────────────────────────────────────────
  // ACTIONS
  // ─────────────────────────────────────────────────────────────────────
  const findRecord = useCallback((recId) => {
    for (const emp of mergedEmployees) {
      for (const r of emp.records) {
        if (r.type === "driver_group") {
          const seg = r.segments.find((s) => s.id === recId);
          if (seg) return seg;
        } else if (r.id === recId) {
          return r;
        }
      }
    }
    return null;
  }, [mergedEmployees]);

  const doApprove = useCallback(async (recId, withOT = false) => {
    setLocalStatus((s) => ({ ...s, [recId]: "approved" }));
    try {
      const rec = findRecord(recId);
      if (!rec) return;
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/cutoff-periods/${cutoffId}/approvals/${rec.id}`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ action: "approve", withOT }),
        }
      );
      if (!res.ok) throw new Error();
      toast.success("Approved");
    } catch {
      setLocalStatus((s) => { const n = { ...s }; delete n[recId]; return n; });
      toast.error("Failed to approve");
    }
  }, [token, cutoffId, findRecord]);

  const doConflict = useCallback(async (recId, choice) => {
    setLocalStatus((s) => ({ ...s, [recId]: "resolved" }));
    try {
      const rec = findRecord(recId);
      if (!rec) return;
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/cutoff-periods/${cutoffId}/approvals/${rec.id}/conflict`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ choice }),
        }
      );
      if (!res.ok) throw new Error();
      toast.success(choice === "punch" ? "Punch honored — leave credit returned" : "Leave honored — punch excluded");
    } catch {
      setLocalStatus((s) => { const n = { ...s }; delete n[recId]; return n; });
      toast.error("Failed to resolve conflict");
    }
  }, [token, cutoffId, findRecord]);

  const confirmExclude = useCallback(async () => {
    if (!excludeReason) { toast.error("Please select a reason"); return; }
    const { recId } = excludeModal;
    setIsSaving(true);
    setLocalStatus((s) => ({ ...s, [recId]: "excluded" }));
    try {
      const rec = findRecord(recId);
      if (!rec) return;
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/cutoff-periods/${cutoffId}/approvals/${rec.id}`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ action: "exclude", reason: excludeReason, notes: excludeNote }),
        }
      );
      if (!res.ok) throw new Error();
      toast.success("Record excluded");
      setExcludeModal(null);
      setExcludeReason("");
      setExcludeNote("");
    } catch {
      setLocalStatus((s) => { const n = { ...s }; delete n[recId]; return n; });
      toast.error("Failed to exclude record");
    } finally {
      setIsSaving(false);
    }
  }, [token, cutoffId, excludeModal, excludeReason, excludeNote, findRecord]);

  const doBulkApprove = useCallback((empId) => {
    const emp = mergedEmployees.find((e) => e.id === empId);
    if (!emp) return;
    emp.records.forEach((r) => {
      if (r.type === "driver_group") {
        r.segments.forEach((s) => {
          if (!s.localStatus && s.actions?.includes("approve")) doApprove(s.id);
        });
      } else if (!r.localStatus && r.actions?.includes("approve") && !["conflict","unscheduled"].includes(r.type)) {
        doApprove(r.id);
      }
    });
  }, [mergedEmployees, doApprove]);

  const confirmFinalize = useCallback(async () => {
    setIsSaving(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/cutoff-periods/${cutoffId}/finalize`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        }
      );
      if (!res.ok) throw new Error();
      toast.success("Cutoff period finalized and locked");
      setFinalizeModal(false);
      router.push("/dashboard/company/cutoff-periods");
    } catch {
      toast.error("Failed to finalize cutoff period");
    } finally {
      setIsSaving(false);
    }
  }, [token, cutoffId, router]);

  const finalizeReady = globalStats.totalPending === 0 && mergedEmployees.length > 0;

  // ─────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-10 w-full" />
        {[1,2,3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50 dark:bg-neutral-950">

      {/* Sticky Header */}
      <PageHeader
        cutoff={cutoff}
        status={cutoff?.status || "open"}
        onFinalize={() => setFinalizeModal(true)}
        finalizeReady={finalizeReady}
        getDepartmentName={getDepartmentName}
        onSync={doSync}
        syncing={syncing}
      />

      {/* Filter Bar */}
      <FilterBar
        tabs={tabs}
        activeTab={activeTab}
        onTab={setActiveTab}
        search={search}
        onSearch={setSearch}
        chips={chips}
        onChip={(id) => setChips((c) => c.map((chip) => chip.id === id ? { ...chip, active: !chip.active } : chip))}
      />

      {/* Employee Cards */}
      <div className="flex-1 p-6 space-y-3">
        {filteredEmployees.length === 0 ? (
          <div className="text-center py-24">
            <AlertCircle className="w-14 h-14 mx-auto text-neutral-200 mb-4" />
            <p className="font-semibold text-neutral-500">No employees match your filters</p>
            <button onClick={() => { setSearch(""); setActiveTab("all"); setChips((c) => c.map((ch) => ({ ...ch, active: false }))); }}
              className="mt-3 text-sm text-orange-500 hover:underline">
              Clear all filters
            </button>
          </div>
        ) : (
          filteredEmployees.map((emp, i) => (
            <motion.div
              key={emp.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <EmployeeCard
                emp={emp}
                onApprove={(id) => doApprove(id, false)}
                onApproveOT={(id) => doApprove(id, true)}
                onEdit={(rec) => setEditModal({ rec })}
                onExclude={(id) => setExcludeModal({ recId: id })}
                onConflict={doConflict}
                onBulkApprove={doBulkApprove}
              />
            </motion.div>
          ))
        )}
      </div>

      {/* ── Edit Modal ── */}
      <Dialog open={!!editModal} onOpenChange={() => setEditModal(null)}>
        <DialogContent className="w-[90vw] sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-4 h-4 text-amber-500" /> Edit Punch Log
            </DialogTitle>
            <DialogDescription>
              {editModal?.rec?.date} — corrections will be applied on approval
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-3 text-sm space-y-1.5">
              <div className="flex justify-between"><span className="text-neutral-400">Original Clock-In</span><span className="font-semibold">{editModal?.rec?.timeIn}</span></div>
              <div className="flex justify-between"><span className="text-neutral-400">Original Clock-Out</span><span className="font-semibold">{editModal?.rec?.timeOut}</span></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wide text-neutral-500">Corrected Clock-In</Label>
                <Input type="text" defaultValue={editModal?.rec?.timeIn} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wide text-neutral-500">Corrected Clock-Out</Label>
                <Input type="text" defaultValue={editModal?.rec?.timeOut} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wide text-neutral-500">Reason for Edit</Label>
              <Input placeholder="Brief reason for this correction..." />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditModal(null)}>Cancel</Button>
              <Button className="bg-green-500 hover:bg-green-600 gap-2" onClick={() => { doApprove(editModal.rec.id); setEditModal(null); }}>
                <Check className="w-4 h-4" /> Save & Approve
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Exclude Modal ── */}
      <Dialog open={!!excludeModal} onOpenChange={() => setExcludeModal(null)}>
        <DialogContent className="w-[90vw] sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-500" /> Exclude Record
            </DialogTitle>
            <DialogDescription>
              This record will be removed from payroll. A reason is required for audit purposes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wide text-neutral-500">Reason *</Label>
              <Select value={excludeReason} onValueChange={setExcludeReason}>
                <SelectTrigger><SelectValue placeholder="Select a reason..." /></SelectTrigger>
                <SelectContent>
                  {EXCLUDE_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wide text-neutral-500">Additional Notes (optional)</Label>
              <Input
                placeholder="Any additional context for the audit log..."
                value={excludeNote}
                onChange={(e) => setExcludeNote(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setExcludeModal(null)}>Cancel</Button>
              <Button
                variant="destructive"
                className="gap-2"
                onClick={confirmExclude}
                disabled={isSaving || !excludeReason}
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                Confirm Exclusion
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Finalize Modal ── */}
      <Dialog open={finalizeModal} onOpenChange={setFinalizeModal}>
        <DialogContent className="w-[90vw] sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-orange-500" /> Finalize Cutoff Period
            </DialogTitle>
            <DialogDescription>
              {getDepartmentName(cutoff?.departmentId)} &nbsp;·&nbsp; {formatDate(cutoff?.periodStart)} – {formatDate(cutoff?.periodEnd)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-300 leading-relaxed">
                This action is <strong>permanent and non-reversible.</strong> Once finalized, all records will be locked and passed to payroll. No further edits are possible.
              </p>
            </div>
            <div className="space-y-2">
              {[
                { pass: globalStats.totalPending === 0, label: "All punch logs reviewed" },
                { pass: !mergedEmployees.some((e) => e.records.some((r) => r.type === "conflict" && !r.localStatus)), label: "All conflicts resolved" },
                { pass: true, label: "OT flags actioned" },
              ].map((item) => (
                <div key={item.label} className={`flex items-center gap-2.5 text-sm ${item.pass ? "text-green-700 dark:text-green-400" : "text-red-600"}`}>
                  {item.pass
                    ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    : <XCircle className="w-4 h-4 flex-shrink-0" />}
                  {item.label}
                </div>
              ))}
            </div>
            <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-3 text-sm space-y-1.5">
              <div className="flex justify-between"><span className="text-neutral-400">Department</span><span className="font-semibold">{getDepartmentName(cutoff?.departmentId)}</span></div>
              <div className="flex justify-between"><span className="text-neutral-400">Period</span><span className="font-semibold">{formatDate(cutoff?.periodStart)} – {formatDate(cutoff?.periodEnd)}</span></div>
              <div className="flex justify-between"><span className="text-neutral-400">Payment Date</span><span className="font-semibold">{formatDate(cutoff?.paymentDate)}</span></div>
              <div className="flex justify-between"><span className="text-neutral-400">Total Approved Hours</span><span className="font-semibold">{globalStats.totalHours.toFixed(1)}h</span></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setFinalizeModal(false)}>Cancel</Button>
              <Button
                className="bg-orange-500 hover:bg-orange-600 gap-2"
                onClick={confirmFinalize}
                disabled={isSaving || !finalizeReady}
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                Finalize &amp; Lock
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}