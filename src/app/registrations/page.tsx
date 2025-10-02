"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import axiosInstance from "@/lib/api";
import * as XLSX from "xlsx";
import { ChevronDown, Mail, Pencil, Trash2, Loader2, Download } from "lucide-react";

/* ========================= */
/* Types shared with backend */
/* ========================= */
interface EventOccurrence {
  id: string;
  startTime: string;
  endTime: string | null;
  location: string | null;
}

interface Registration {
  id: string;
  passId: string;
  registrationDate: string;
  status: string;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    phone: string | null;
    company: string | null;
  };
  event: {
    id: string;
    name: string;
    location: string;
  };
  selectedOccurrences: {
    id: string;
    occurrence: EventOccurrence;
  }[];
}

interface SortConfig {
  key: keyof Registration | "user.firstName" | "user.email" | "event.name";
  direction: "ascending" | "descending";
}

/* ------------ Parent constants ------------ */
const STORAGE_KEY = "registrationsAccess";

/* ========================= */
/* Parent: PIN gate wrapper  */
/* ========================= */
export default function RegistrationsPage() {
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinLoading, setPinLoading] = useState(true);
  const [accessGranted, setAccessGranted] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === "granted") setAccessGranted(true);
    } catch {}
    setPinLoading(false);
  }, []);

  const handlePinSubmit = async () => {
    setPinLoading(true);
    setPinError("");
    try {
      const res = await fetch("/api/pin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (data.ok) {
        setAccessGranted(true);
        sessionStorage.setItem(STORAGE_KEY, "granted");
        toast.success("Access granted!");
      } else {
        setAccessGranted(false);
        setPinError("Invalid PIN. Please try again.");
        toast.error("Invalid PIN.");
      }
    } catch {
      setPinError("Failed to verify PIN.");
      toast.error("Failed to verify PIN.");
    } finally {
      setPinLoading(false);
    }
  };

  if (pinLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
        <div className="text-xl font-semibold text-black">Checking access…</div>
      </div>
    );
  }

  if (!accessGranted) {
    return (
      <div className="flex h-screen w-screen items-center justify-center p-4 bg-gray-50">
        <div className="w-full max-w-sm bg-white rounded-xl shadow-2xl overflow-hidden p-8 text-gray-800">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-blue-800 mb-2">Registrations Access</h1>
            <p className="text-sm text-gray-600">Please enter the access PIN to proceed.</p>
          </div>
          <div className="space-y-4">
            <input
              id="pin"
              type="password"
              placeholder="Enter PIN"
              className={`w-full rounded-md border ${pinError ? "border-red-500" : "border-gray-300"} px-4 py-2 text-lg text-center shadow-sm focus:border-blue-500 focus:ring-blue-500`}
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setPinError("");
              }}
              disabled={pinLoading}
            />
            {pinError && <p className="text-sm text-red-500 text-center">{pinError}</p>}
            <button
              onClick={handlePinSubmit}
              disabled={pinLoading || pin.length === 0}
              className={`w-full py-2 px-4 rounded-md text-white font-semibold transition-colors ${
                pinLoading || pin.length === 0 ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {pinLoading ? "Verifying…" : "Access Dashboard"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <RegistrationsContent />;
}

/* ===================================== */
/* Child: all data hooks live down here  */
/* ===================================== */
function RegistrationsContent() {
  /* ---- Event API types ---- */
  type ApiEvent = {
    id: string;
    name: string;
    occurrences: {
      id: string;
      startTime: string;
      endTime: string | null;
      location: string | null;
    }[];
  };
  interface EventItem {
    id: string;
    name: string;
    occurrences: ApiEvent["occurrences"];
  }

  /* ---- Filters (client-side only) ---- */
  interface FilterConfig {
    status: string;
    eventId: string;
    sessionId: string;
  }

  /* ---- State ---- */
  const [events, setEvents] = useState<EventItem[]>([]);
  const [allRows, setAllRows] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Client-side pagination (default to 10,000)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10000);

  // Filters / Sorting (client-side)
  const [filters, setFilters] = useState<FilterConfig>({ status: "", eventId: "", sessionId: "" });
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "registrationDate", direction: "descending" });

  // Live search
  const [searchInput, setSearchInput] = useState("");

  // Jump box
  const [jumpPassId, setJumpPassId] = useState("");
  const [jumpBusy, setJumpBusy] = useState(false);

  // Row UI
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const toggleExpand = (id: string) => setExpandedRowId((prev) => (prev === id ? null : id));
  const [resendingEmailId, setResendingEmailId] = useState<string | null>(null);

  // Edit/Delete modals
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [registrationToDelete, setRegistrationToDelete] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRegistration, setEditingRegistration] = useState<Registration | null>(null);
  const [editFormData, setEditFormData] = useState<{ status?: string }>({});
  const [editErrors, setEditErrors] = useState<{ status?: string }>({});

  /* ---- Helpers (robust normalization) ---- */
  // Replace all common Unicode dashes with a regular hyphen
  const normalizeDash = (s: string | null | undefined) => (s ?? "").replace(/[‐-‒–—―]/g, "-");
  // Lowercase & strip non-alphanumerics (after dash normalization)
  const normalize = (s: string | null | undefined) => normalizeDash(s).toLowerCase().replace(/[^a-z0-9]/g, "");
  // Digits only (after dash normalization)
  const onlyDigits = (s: string | null | undefined) => normalizeDash(s).replace(/\D/g, "");
  // Remove zero-width characters; trim
  const stripInvisibles = (s: string | null | undefined) => (s ?? "").replace(/[\u200B-\u200D\u2060\uFEFF]/g, "").trim();
  const isEmpty = (s: string | null | undefined) => !s || s.trim().length === 0;

  const formatOccurrenceSummary = (reg: Registration) => {
    if (!reg.selectedOccurrences?.length) return "N/A";
    const first = reg.selectedOccurrences[0].occurrence;
    const firstStr = new Date(first.startTime).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" });
    return `${firstStr}${first.location ? ` (${first.location})` : ""}`;
  };

  /* ---- Fetch everything once ---- */
  const fetchEvents = useCallback(async () => {
    try {
      const res = await axiosInstance.get<ApiEvent[]>(`/api/events`);
      const mapped: EventItem[] = res.data.map((e) => ({
        id: e.id,
        name: e.name,
        occurrences: (e.occurrences ?? []).sort(
          (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        ),
      }));
      setEvents([{ id: "", name: "All events", occurrences: [] }, ...mapped]);
    } catch {
      toast.error("Failed to load events.");
    }
  }, []);

  const fetchAllRegistrations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axiosInstance.get<{ data: Registration[]; total: number }>("/api/registrations/all");
      setAllRows(res.data.data);
    } catch (err: any) {
      const msg = err?.response?.data?.error || "Failed to load registrations.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    fetchAllRegistrations();
  }, [fetchEvents, fetchAllRegistrations]);

  /* ---- Session options from selected event ---- */
  const sessionOptions = useMemo(() => {
    const selectedEvent = events.find((e) => e.id === filters.eventId);
    const base = [{ id: "", label: "All sessions" }];
    if (!selectedEvent) return base;
    return [
      ...base,
      ...selectedEvent.occurrences.map((o) => ({
        id: o.id,
        label:
          `${new Date(o.startTime).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}` +
          (o.location ? ` (${o.location})` : ""),
      })),
    ];
  }, [events, filters.eventId]);

  useEffect(() => {
    if (filters.sessionId && !sessionOptions.some((s) => s.id === filters.sessionId)) {
      setFilters((prev) => ({ ...prev, sessionId: "" }));
    }
  }, [sessionOptions, filters.sessionId]);

  /* ---- Client-side filter + live search + sort ---- */
  const filteredSorted = useMemo(() => {
    let data = [...allRows];

    // Filters
    if (filters.status) data = data.filter((r) => r.status === filters.status);
    if (filters.eventId) data = data.filter((r) => r.event.id === filters.eventId);
    if (filters.sessionId) {
      data = data.filter((r) => r.selectedOccurrences.some((so) => so.occurrence.id === filters.sessionId));
    }

    // Live search (as-you-type)
    const rawQuery = stripInvisibles(searchInput);
    const query = normalizeDash(rawQuery).trim(); // normalize dashes, trim spaces

    if (!isEmpty(query)) {
      const q = query.toLowerCase();
      const nq = normalize(query);
      const dq = onlyDigits(query);

      // optional: same-day date match
      const ts = Date.parse(query);
      const dateMatch = !Number.isNaN(ts) ? { start: new Date(ts) } : null;

      if (dateMatch) {
        dateMatch.start.setHours(0, 0, 0, 0);
        const end = new Date(dateMatch.start);
        end.setDate(end.getDate() + 1);
        data = data.filter((r) => {
          const d = new Date(r.registrationDate);
          return d >= dateMatch.start && d < end;
        });
      } else {
        data = data.filter((r) => {
          const name = `${r.user.firstName ?? ""} ${r.user.lastName ?? ""}`.toLowerCase();
          const sessionsStr = r.selectedOccurrences
            .map((so) => `${(so.occurrence.location ?? "").toLowerCase()}`)
            .join(" | ");

          // PASS ID: exact-first (case/format-insensitive), then fuzzy
          const passRaw = stripInvisibles(r.passId);
          const passLower = normalizeDash(passRaw).toLowerCase();
          const passNorm = normalize(passRaw);
          const passDigits = onlyDigits(passRaw);

          const passExact = passLower === q || passNorm === nq;
          const passFuzzy = passLower.includes(q) || passNorm.includes(nq) || (dq.length > 0 && passDigits.includes(dq));

          return (
            passExact ||
            passFuzzy ||
            name.includes(q) ||
            (r.user.email?.toLowerCase() ?? "").includes(q) ||
            (r.user.company?.toLowerCase() ?? "").includes(q) ||
            r.event.name.toLowerCase().includes(q) ||
            r.event.location?.toLowerCase().includes(q) ||
            sessionsStr.includes(q) ||
            r.status.toLowerCase().includes(q)
          );
        });
      }
    }

    // Sort
    const dir = sortConfig.direction === "ascending" ? 1 : -1;
    data.sort((a, b) => {
      const key = sortConfig.key;
      let av: any, bv: any;

      if (key === "registrationDate") {
        av = new Date(a.registrationDate).getTime();
        bv = new Date(b.registrationDate).getTime();
      } else if (key === "status") {
        av = a.status;
        bv = b.status;
      } else if (key === "event.name") {
        av = a.event.name;
        bv = b.event.name;
      } else if (key === "user.email") {
        av = a.user.email;
        bv = b.user.email;
      } else if (key === "user.firstName") {
        av = a.user.firstName ?? "";
        bv = b.user.firstName ?? "";
      } else {
        av = (a as any)[key];
        bv = (b as any)[key];
      }

      if (av == null && bv == null) return 0;
      if (av == null) return -1 * dir;
      if (bv == null) return 1 * dir;

      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });

    return data;
  }, [allRows, filters, searchInput, sortConfig]);

  // Client-side pagination slice
  const total = filteredSorted.length;
  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSorted.slice(start, start + itemsPerPage);
  }, [filteredSorted, currentPage, itemsPerPage]);

  /* ---- Handlers ---- */
  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "eventId") {
      setFilters((prev) => ({ ...prev, eventId: value, sessionId: "" }));
    } else {
      setFilters((prev) => ({ ...prev, [name]: value }));
    }
    setCurrentPage(1);
  };

  const requestSort = (key: SortConfig["key"]) => {
    let direction: SortConfig["direction"] = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") direction = "descending";
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  // Resend email
  const handleResendEmail = async (registrationId: string) => {
    setResendingEmailId(registrationId);
    try {
      const res = await axiosInstance.post("/api/registrations/resend-email", { registrationId });
      toast.success(res.data.message || "Email resent successfully!");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to resend email.");
    } finally {
      setResendingEmailId(null);
    }
  };

  // Delete flow
  const handleDeleteClick = (registrationId: string) => {
    setRegistrationToDelete(registrationId);
    setShowDeleteConfirm(true);
  };
  const confirmDelete = async () => {
    if (!registrationToDelete) return;
    try {
      await axiosInstance.delete(`/api/registrations/${registrationToDelete}`);
      setAllRows((prev) => prev.filter((r) => r.id !== registrationToDelete));
      setShowDeleteConfirm(false);
      setRegistrationToDelete(null);
      toast.success("Registration deleted");
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "Failed to delete");
    }
  };

  // Edit flow
  const handleEditClick = (registration: Registration) => {
    setEditingRegistration(registration);
    setEditFormData({ status: registration.status });
    setEditErrors({});
    setShowEditModal(true);
  };
  const handleEditFormChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
  };
  const handleEditSubmit = async () => {
    const errs: { status?: string } = {};
    if (!editFormData.status) errs.status = "Status is required.";
    setEditErrors(errs);
    if (Object.keys(errs).length) return;

    try {
      const id = editingRegistration?.id as string;
      await axiosInstance.patch(`/api/registrations/${id}`, { status: editFormData.status });

      setAllRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: editFormData.status as string } : r))
      );

      toast.success("Registration updated");
      setShowEditModal(false);
      setEditingRegistration(null);
      setEditFormData({});
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "Failed to update");
    }
  };

  /* ===== Jump to Pass ID → auto check-in → open PDF ===== */
  const checkInAndOpen = async (reg: Registration, indexInAll: number) => {
    // ensure row is visible in the table
    setFilters({ status: "", eventId: "", sessionId: "" });
    setSearchInput(stripInvisibles(reg.passId));
    const page = Math.floor(indexInAll / itemsPerPage) + 1;
    setCurrentPage(page);

    const tab = window.open("about:blank", "_blank", "noopener,noreferrer");
    setJumpBusy(true);
    try {
      if (reg.status !== "checked-in") {
        await axiosInstance.patch(`/api/registrations/${reg.id}`, { status: "checked-in" });
        setAllRows((prev) => prev.map((r) => (r.id === reg.id ? { ...r, status: "checked-in" } : r)));
        toast.success(`${reg.passId} checked-in`);
      }
      const url = `/api/event-pass-pdf/${encodeURIComponent(stripInvisibles(reg.passId))}`;
      if (tab) tab.location.href = url;
      else window.open(url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "Failed to check-in / open pass");
      if (tab && !tab.closed) tab.close();
    } finally {
      setJumpBusy(false);
    }
  };

  const jumpToPassIdAndCheckIn = useCallback(async () => {
    const raw = stripInvisibles(jumpPassId);
    if (!raw) return;

    const targetNorm = normalize(raw);
    let idx = allRows.findIndex((r) => normalize(stripInvisibles(r.passId)) === targetNorm);

    if (idx < 0) {
      // Fallback: digits-only (so “1181” → “BRI-1181”)
      const digits = onlyDigits(raw);
      if (digits) {
        idx = allRows.findIndex((r) => onlyDigits(stripInvisibles(r.passId)).includes(digits));
      }
    }

    if (idx < 0) {
      toast.error(`Pass ID "${raw}" not found`);
      return;
    }

    await checkInAndOpen(allRows[idx], idx);
  }, [jumpPassId, allRows, itemsPerPage]);

  // Excel export (CURRENT filtered list)
  const exportExcel = () => {
    try {
      const regs = filteredSorted;

      const registrationsSheet = regs.map((r) => ({
        Event: r.event.name,
        EventLocation: r.event.location ?? "",
        Name: `${r.user.firstName ?? ""} ${r.user.lastName ?? ""}`.trim(),
        Email: r.user.email,
        Phone: r.user.phone ?? "",
        Company: r.user.company ?? "",
        RegistrationDate: new Date(r.registrationDate).toLocaleString(),
        Status: r.status,
        PassID: r.passId,
        Sessions: r.selectedOccurrences
          .map(
            (so) =>
              new Date(so.occurrence.startTime).toLocaleString("en-US", {
                dateStyle: "short",
                timeStyle: "short",
              }) + (so.occurrence.location ? ` (${so.occurrence.location})` : "")
          )
          .join(" | "),
      }));

      const sessionsRows = regs.flatMap((r) =>
        r.selectedOccurrences.map((so) => ({
          Event: r.event.name,
          SessionStart: new Date(so.occurrence.startTime).toLocaleString("en-US", {
            dateStyle: "short",
            timeStyle: "short",
          }),
          SessionEnd: so.occurrence.endTime
            ? new Date(so.occurrence.endTime).toLocaleTimeString("en-US", { timeStyle: "short" })
            : "",
          SessionLocation: so.occurrence.location ?? "",
          Name: `${r.user.firstName ?? ""} ${r.user.lastName ?? ""}`.trim(),
          Email: r.user.email,
          Company: r.user.company ?? "",
          Phone: r.user.phone ?? "",
          Status: r.status,
          PassID: r.passId,
          RegistrationDate: new Date(r.registrationDate).toLocaleString(),
        }))
      );

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(registrationsSheet), "Registrations");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sessionsRows), "Sessions");

      const selectedEvent = events.find((e) => e.id === filters.eventId)?.name ?? "AllEvents";
      const selectedSessionLabel =
        (filters.sessionId &&
          sessionOptions.find((s) => s.id === filters.sessionId)?.label?.replace(/[^\w\- ]+/g, "")) ||
        "AllSessions";

      XLSX.writeFile(wb, `registrations_${selectedEvent}_${selectedSessionLabel}.xlsx`);
    } catch (err) {
      console.error("Export failed", err);
      toast.error("Failed to export Excel.");
    }
  };

  /* ---- Render guards ---- */
  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
        <div className="text-xl font-semibold text-black">Loading all registrations…</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
        <div className="text-xl font-semibold text-red-600">{error}</div>
      </div>
    );
  }

  const totalPages = Math.ceil(total / itemsPerPage);
  const goToPage = (page: number) => page >= 1 && page <= totalPages && setCurrentPage(page);

  /* ---- UI ---- */
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="w-full mx-auto bg-white rounded-2xl border border-gray-100 shadow-xl p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-black">Event Registrations</h1>
          <button
            onClick={exportExcel}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Download className="h-4 w-4" /> Export {filters.sessionId ? "(Selected Session)" : ""}
          </button>
        </div>

        {/* Top controls */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <label htmlFor="itemsPerPage" className="text-sm font-medium text-gray-700">
              Show:
            </label>
            <select
              id="itemsPerPage"
              value={itemsPerPage}
              onChange={handleItemsPerPageChange}
              className="mt-1 block w-28 border p-2 rounded-md text-black border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm"
            >
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={1000}>1000</option>
              <option value={10000}>10000</option>
            </select>
          </div>
        </div>

        {/* Filters & Live Search */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Event</label>
            <select
              name="eventId"
              value={filters.eventId}
              onChange={handleFilterChange}
              className="mt-1 block w-full rounded-md border p-2 text-black border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm"
            >
              {events.map((e) => (
                <option key={e.id || "all"} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Session</label>
            <select
              name="sessionId"
              value={filters.sessionId}
              onChange={handleFilterChange}
              className="mt-1 block w-full rounded-md border p-2 text-black border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm"
            >
              {sessionOptions.map((s) => (
                <option key={s.id || "all"} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="mt-1 block w-full rounded-md border p-2 text-black border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm"
            >
              <option value="">All</option>
              <option value="registered">Registered</option>
              <option value="checked-in">Checked-in</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* LIVE Search input */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Search registration</label>
            <div className="mt-1 flex gap-2">
              <input
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Type to filter... name, email…"
                className="flex-1 rounded-md border p-2 border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm text-black"
              />
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  setCurrentPage(1);
                }}
                className="px-3 py-2 rounded-md border border-gray-300 text-gray-500 hover:bg-gray-50 text-sm"
              >
                Clear
              </button>
            </div>
          </div>
        </div>


        {/* Table */}
        <div className="overflow-x-auto rounded-lg shadow-sm border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  onClick={() => requestSort("user.firstName")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                >
                  Name
                </th>
                <th
                  onClick={() => requestSort("user.email")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                >
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th
                  onClick={() => requestSort("event.name")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                >
                  Event
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Session
                </th>
                <th
                  onClick={() => requestSort("registrationDate")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                >
                  Reg. Date
                </th>
                <th
                  onClick={() => requestSort("status")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                >
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pass ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pagedRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-4 text-center text-sm text-gray-500">
                    No registrations found.
                  </td>
                </tr>
              ) : (
                pagedRows.map((reg) => {
                  const count = reg.selectedOccurrences.length;
                  return (
                    <React.Fragment key={reg.id}>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {reg.user.firstName} {reg.user.lastName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{reg.user.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {reg.user.company || "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{reg.event.name}</td>

                        <td className="px-6 py-4 text-sm text-gray-500">
                          <div className="flex items-center gap-2 max-w-xs whitespace-nowrap overflow-hidden text-ellipsis">
                            <span className="truncate">{formatOccurrenceSummary(reg)}</span>

                            {count > 1 && (
                              <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-700 text-xs px-2 py-0.5">
                                +{count - 1}
                              </span>
                            )}

                            {count > 0 && (
                              <button
                                type="button"
                                onClick={() => toggleExpand(reg.id)}
                                className="ml-1 inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                                aria-expanded={expandedRowId === reg.id}
                                title={expandedRowId === reg.id ? "Collapse details" : "Expand details"}
                              >
                                <ChevronDown
                                  className={`h-4 w-4 transition-transform ${expandedRowId === reg.id ? "rotate-180" : ""}`}
                                />
                              </button>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(reg.registrationDate).toLocaleString()}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              reg.status === "registered"
                                ? "bg-blue-100 text-blue-800"
                                : reg.status === "checked-in"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {reg.status}
                          </span>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <Link
                            href={`/api/event-pass-pdf/${reg.passId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {reg.passId}
                          </Link>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditClick(reg)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(reg.id)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-red-600 hover:bg-red-50"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleResendEmail(reg.id)}
                              disabled={resendingEmailId === reg.id}
                              className={`inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 ${
                                resendingEmailId === reg.id ? "text-gray-400 cursor-not-allowed" : "text-gray-700 hover:bg-gray-50"
                              }`}
                              title="Resend Email"
                            >
                              {resendingEmailId === reg.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Mail className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded details row */}
                      {expandedRowId === reg.id && (
                        <tr>
                          <td colSpan={9} className="px-6 py-4 bg-gray-50">
                            <div className="rounded-lg border border-gray-200 bg-white p-4">
                              <div className="mb-3 text-sm font-semibold text-gray-800">Session Details</div>
                              <ul className="space-y-2">
                                {reg.selectedOccurrences.map((so) => {
                                  const start = new Date(so.occurrence.startTime);
                                  const end = so.occurrence.endTime ? new Date(so.occurrence.endTime) : null;
                                  return (
                                    <li key={so.id} className="text-sm text-gray-700">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-medium">
                                          {start.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                                          {end && ` – ${end.toLocaleTimeString("en-US", { timeStyle: "short" })}`}
                                        </span>
                                        {so.occurrence.location && (
                                          <span className="text-gray-500">({so.occurrence.location})</span>
                                        )}
                                      </div>
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex justify-between items-center mt-6">
          <div className="text-sm text-gray-700">
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, total)} of {total} entries
          </div>
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-2 py-2 border border-gray-300 bg-white text-sm text-gray-500 rounded-l-md"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => goToPage(page)}
                className={`px-4 py-2 border text-sm font-medium ${
                  page === currentPage ? "z-10 bg-black text-white" : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-2 py-2 border border-gray-300 bg-white text-sm text-gray-500 rounded-r-md"
            >
              Next
            </button>
          </nav>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[9999] bg-black/30 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl p-6">
            <h3 className="text-lg font-semibold mb-2 text-black">Confirm Deletion</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete this registration? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button onClick={confirmDelete} className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingRegistration && (
        <div className="fixed inset-0 z-[9999] bg-black/30 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white w-full max-w-md rounded-xl shadow-2xl p-6">
            <h3 className="text-lg font-semibold mb-4 text-black">Edit Registration</h3>

            <div className="space-y-4">
              <div>
                <label htmlFor="editStatus" className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  id="editStatus"
                  name="status"
                  value={editFormData.status || ""}
                  onChange={handleEditFormChange}
                  className={`mt-1 block w-full text-black rounded-md border ${
                    editErrors.status ? "border-red-500" : "border-gray-300"
                  } px-3 py-2 shadow-sm focus:border-black focus:ring-black sm:text-sm`}
                >
                  <option value="registered">Registered</option>
                  <option value="checked-in">Checked-in</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                {editErrors.status && <p className="mt-1 text-sm text-red-500">{editErrors.status}</p>}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button onClick={handleEditSubmit} className="px-4 py-2 rounded-md bg-black text-white hover:bg-gray-800">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
