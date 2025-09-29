"use client";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { toast } from "react-hot-toast";
import axiosInstance from "@/lib/api";
import Link from "next/link";
import { ChevronDown, Mail, Pencil, Trash2, Loader2, Download } from "lucide-react";
import * as XLSX from "xlsx";

/* ------------ Shared types ------------ */
interface EventOccurrence { id: string; startTime: string; endTime: string | null; location: string | null; }
interface Registration {
  id: string;
  passId: string;
  registrationDate: string;
  status: string;
  user: { id: string; firstName: string | null; lastName: string | null; email: string; phone: string | null; company: string | null; };
  event: { id: string; name: string; location: string };
  selectedOccurrences: { id: string; occurrence: EventOccurrence }[];
}
interface SortConfig { key: keyof Registration | "user.firstName" | "user.email" | "event.name"; direction: "ascending" | "descending"; }

/* ------------ Constants ------------ */
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
    } catch { }
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
              onChange={(e) => { setPin(e.target.value); setPinError(""); }}
              disabled={pinLoading}
            />
            {pinError && <p className="text-sm text-red-500 text-center">{pinError}</p>}
            <button
              onClick={handlePinSubmit}
              disabled={pinLoading || pin.length === 0}
              className={`w-full py-2 px-4 rounded-md text-white font-semibold transition-colors ${pinLoading || pin.length === 0 ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}`}
            >
              {pinLoading ? "Verifying…" : "Access Dashboard"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render the data-heavy child only after access is granted.
  return <RegistrationsContent />;
}

/* ===================================== */
/* Child: all data hooks live down here  */
/* ===================================== */
function RegistrationsContent() {
  // Events API payload
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
  interface EventItem { id: string; name: string; occurrences: ApiEvent["occurrences"]; }

  // Filters: removed eventName text & userEmail; we use a single searchTerm instead
  interface FilterConfig { status: string; eventId: string; sessionId: string; }

  const [events, setEvents] = useState<EventItem[]>([]);
  const [rows, setRows] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filters / Sorting / Search
  const [filters, setFilters] = useState<FilterConfig>({ status: "", eventId: "", sessionId: "" });
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "registrationDate", direction: "descending" });
  const [searchTerm, setSearchTerm] = useState("");

  // UI bits
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const toggleExpand = (id: string) => setExpandedRowId(prev => (prev === id ? null : id));
  const [resendingEmailId, setResendingEmailId] = useState<string | null>(null);

  const formatOccurrenceSummary = (reg: Registration) => {
    if (!reg.selectedOccurrences?.length) return "N/A";
    const first = reg.selectedOccurrences[0].occurrence;
    const firstStr = new Date(first.startTime).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" });
    return `${firstStr}${first.location ? ` (${first.location})` : ""}`;
  };

  const buildParams = (override?: Partial<{ page: number; limit: number }>) => {
    const params = new URLSearchParams();
    params.append("page", String(override?.page ?? currentPage));
    params.append("limit", String(override?.limit ?? itemsPerPage));
    params.append("sortBy", String(sortConfig.key));
    params.append("sortDirection", sortConfig.direction);
    if (filters.status) params.append("status", filters.status);
    if (filters.eventId) params.append("eventId", filters.eventId);
    if (filters.sessionId) params.append("sessionId", filters.sessionId);
    if (searchTerm) params.append("searchTerm", searchTerm);
    return params;
  };

  // Fetch events (events API returns occurrences too)
  const fetchEvents = useCallback(async () => {
    try {
      const res = await axiosInstance.get<ApiEvent[]>(`/api/events`);
      const mapped: EventItem[] = res.data.map(e => ({
        id: e.id,
        name: e.name,
        occurrences: (e.occurrences ?? []).sort(
          (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        ),
      }));
      setEvents([{ id: "", name: "All events", occurrences: [] }, ...mapped]);

      // If selected event vanished, reset
      if (filters.eventId && !mapped.some(ev => ev.id === filters.eventId)) {
        setFilters(prev => ({ ...prev, eventId: "", sessionId: "" }));
      }
    } catch {
      toast.error("Failed to load events.");
    }
  }, [filters.eventId]);

  // Build session options from selected event’s occurrences
  const sessionOptions = useMemo(() => {
    const selectedEvent = events.find(e => e.id === filters.eventId);
    const base = [{ id: "", label: "All sessions" }];
    if (!selectedEvent) return base;
    return [
      ...base,
      ...selectedEvent.occurrences.map(o => ({
        id: o.id,
        label:
          `${new Date(o.startTime).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}` +
          (o.location ? ` (${o.location})` : ""),
      })),
    ];
  }, [events, filters.eventId]);

  // If selected session no longer exists (event changed), clear it
  useEffect(() => {
    if (filters.sessionId && !sessionOptions.some(s => s.id === filters.sessionId)) {
      setFilters(prev => ({ ...prev, sessionId: "" }));
    }
  }, [sessionOptions, filters.sessionId]);

  // Fetch registrations
  const fetchRegistrations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = buildParams();
      const res = await axiosInstance.get<{ data: Registration[]; total: number }>(`/api/registrations?${params.toString()}`);
      setRows(res.data.data);
      setTotal(res.data.total);
    } catch (err: any) {
      const msg = err?.response?.data?.error || "Failed to load registrations.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, sortConfig, filters, searchTerm]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);
  useEffect(() => { fetchRegistrations(); }, [fetchRegistrations]);

  // Handlers
  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); };
  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "eventId") {
      setFilters(prev => ({ ...prev, eventId: value, sessionId: "" }));
    } else {
      setFilters(prev => ({ ...prev, [name]: value }));
    }
    setCurrentPage(1);
  };
  const requestSort = (key: keyof Registration | "user.firstName" | "user.email" | "event.name") => {
    let direction: SortConfig["direction"] = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") direction = "descending";
    setSortConfig({ key, direction }); setCurrentPage(1);
  };

  // Excel export (session-aware)
  const exportExcel = async () => {
    try {
      const params = buildParams({ page: 1, limit: 100000 });
      const res = await axiosInstance.get<{ data: Registration[]; total: number }>(`/api/registrations?${params.toString()}`);
      const regs = res.data.data;

      // Sheet 1
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
        Sessions: r.selectedOccurrences.map(so =>
          new Date(so.occurrence.startTime).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" }) +
          (so.occurrence.location ? ` (${so.occurrence.location})` : "")
        ).join(" | "),
      }));

      // Sheet 2
      const sessionsRows = regs.flatMap((r) =>
        r.selectedOccurrences.map((so) => ({
          Event: r.event.name,
          SessionStart: new Date(so.occurrence.startTime).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" }),
          SessionEnd: so.occurrence.endTime ? new Date(so.occurrence.endTime).toLocaleTimeString("en-US", { timeStyle: "short" }) : "",
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

      const selectedEvent = events.find(e => e.id === filters.eventId)?.name ?? "AllEvents";
      const selectedSessionLabel =
        (filters.sessionId &&
          sessionOptions.find(s => s.id === filters.sessionId)?.label?.replace(/[^\w\- ]+/g, "")) || "AllSessions";

      XLSX.writeFile(wb, `registrations_${selectedEvent}_${selectedSessionLabel}.xlsx`);
    } catch (err) {
      console.error("Export failed", err);
      toast.error("Failed to export Excel.");
    }
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

  if (loading) {
    return <div className="flex h-screen w-screen items-center justify-center bg-gray-50"><div className="text-xl font-semibold text-black">Loading Registrations...</div></div>;
  }
  if (error) {
    return <div className="flex h-screen w-screen items-center justify-center bg-gray-50"><div className="text-xl font-semibold text-red-600">{error}</div></div>;
  }

  const totalPages = Math.ceil(total / itemsPerPage);
  const goToPage = (page: number) => page >= 1 && page <= totalPages && setCurrentPage(page);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="w-full mx-auto bg-white rounded-2xl border border-gray-100 shadow-xl p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-black">Event Registrations</h1>
          <button onClick={exportExcel} className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
            <Download className="h-4 w-4" /> Export {filters.sessionId ? "(Selected Session)" : ""}
          </button>
        </div>

        {/* Top controls */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <label htmlFor="itemsPerPage" className="text-sm font-medium text-gray-700">Show:</label>
            <select id="itemsPerPage" value={itemsPerPage} onChange={handleItemsPerPageChange} className="mt-1 block w-24 border p-2 rounded-md text-black border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm">
              <option value={10}>10</option><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Filters (Event + Session + Status + Search) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Event</label>
            <select name="eventId" value={filters.eventId} onChange={handleFilterChange} className="mt-1 block w-full rounded-md border p-2 text-black border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm">
              {events.map(e => <option key={e.id || "all"} value={e.id}>{e.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Session</label>
            <select name="sessionId" value={filters.sessionId} onChange={handleFilterChange} className="mt-1 block w-full rounded-md border p-2 text-black border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm">
              {sessionOptions.map(s => <option key={s.id || "all"} value={s.id}>{s.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select name="status" value={filters.status} onChange={handleFilterChange} className="mt-1 block w-full rounded-md border p-2 text-black border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm">
              <option value="">All</option>
              <option value="registered">Registered</option>
              <option value="checked-in">Checked-in</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Search registration</label>
            <input
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder="Name, email, event, pass, session…"
              className="mt-1 block w-full rounded-md border p-2 border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm text-black"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg shadow-sm border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th onClick={() => requestSort("user.firstName")} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">Name</th>
                <th onClick={() => requestSort("user.email")} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                <th onClick={() => requestSort("event.name")} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">Event</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Session</th>
                <th onClick={() => requestSort("registrationDate")} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">Reg. Date</th>
                <th onClick={() => requestSort("status")} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pass ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rows.length === 0 ? (
                <tr><td colSpan={9} className="px-6 py-4 text-center text-sm text-gray-500">No registrations found.</td></tr>
              ) : rows.map((reg) => {
                const count = reg.selectedOccurrences.length;
                return (
                  <React.Fragment key={reg.id}>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{reg.user.firstName} {reg.user.lastName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{reg.user.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{reg.user.company || "N/A"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{reg.event.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div className="flex items-center gap-2 max-w-xs whitespace-nowrap overflow-hidden text-ellipsis">
                          <span className="truncate">{formatOccurrenceSummary(reg)}</span>
                          {count > 1 && <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-700 text-xs px-2 py-0.5">+{count - 1}</span>}
                          {count > 0 && (
                            <button type="button" onClick={() => toggleExpand(reg.id)} className="ml-1 inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50" aria-expanded={expandedRowId === reg.id} title={expandedRowId === reg.id ? "Collapse details" : "Expand details"}>
                              <ChevronDown className={`h-4 w-4 transition-transform ${expandedRowId === reg.id ? "rotate-180" : ""}`} />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(reg.registrationDate).toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${reg.status === "registered" ? "bg-blue-100 text-blue-800" :
                            reg.status === "checked-in" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                          }`}>{reg.status}</span>
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
                          <button className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50" title="Edit"><Pencil className="h-4 w-4" /></button>
                          <button className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-red-600 hover:bg-red-50" title="Delete"><Trash2 className="h-4 w-4" /></button>
                          <button onClick={() => handleResendEmail(reg.id)} disabled={resendingEmailId === reg.id} className={`inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 ${resendingEmailId === reg.id ? "text-gray-400 cursor-not-allowed" : "text-gray-700 hover:bg-gray-50"}`} title="Resend Email">
                            {resendingEmailId === reg.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>

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
                                      {so.occurrence.location && <span className="text-gray-500">({so.occurrence.location})</span>}
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
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex justify-between items-center mt-6">
          <div className="text-sm text-gray-700">Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, total)} of {total} entries</div>
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
            <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className="px-2 py-2 border border-gray-300 bg-white text-sm text-gray-500 rounded-l-md">Previous</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button key={page} onClick={() => goToPage(page)} className={`px-4 py-2 border text-sm font-medium ${page === currentPage ? "z-10 bg-black text-white" : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"}`}>{page}</button>
            ))}
            <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} className="px-2 py-2 border border-gray-300 bg-white text-sm text-gray-500 rounded-r-md">Next</button>
          </nav>
        </div>
      </div>
    </div>
  );
}
