"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import axiosInstance from "@/lib/api";
import Link from "next/link";
import {
  ChevronDown,
  Pencil,
  Trash2,
  CalendarDays,
  Users,
  Mail,
  Phone,
  MapPin,
  Eye,
  QrCode, // <-- QR icon
} from "lucide-react";
import QRCode from "qrcode"; // <-- npm i qrcode

/* ---------------- Types ---------------- */
interface EventOccurrence {
  id: string;
  startTime: string;
  endTime: string | null;
  location: string | null;
}

interface Event {
  id: string;
  name: string;
  description: string | null;
  location: string;
  googleMapsLink: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  maxCapacity: number | null;
  createdAt: string;
  updatedAt: string;
  occurrences: EventOccurrence[];
  registrations: Array<{
    id: string;
    userId: string;
    eventId: string;
    status: string;
  }>;
}

type SortKey = "name" | "location" | "createdAt" | "updatedAt" | "maxCapacity";

interface SortConfig {
  key: SortKey;
  direction: "ascending" | "descending";
}

interface FilterConfig {
  name: string;
  location: string;
  contactEmail: string;
}

/* ---------------- Component ---------------- */
export default function EventsPage() {
  const router = useRouter();

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<FilterConfig>({
    name: "",
    location: "",
    contactEmail: "",
  });

  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "createdAt",
    direction: "descending",
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Expanded details
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const toggleExpand = (id: string) =>
    setExpandedRowId((prev) => (prev === id ? null : id));

  // Delete modal
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
  const [deleting, setDeleting] = useState(false);

  // QR modal
  const [qrOpen, setQrOpen] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrPngDataUrl, setQrPngDataUrl] = useState<string | null>(null);
  const [qrForEvent, setQrForEvent] = useState<{ id: string; url: string; name: string } | null>(null);

  /* ---------------- Data fetch ---------------- */
  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axiosInstance.get<Event[]>("/api/events");
        const data = [...response.data].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setEvents(data);
      } catch (err: any) {
        console.error("Failed to fetch events:", err);
        setError(err.response?.data?.error || "Failed to load events.");
        toast.error(err.response?.data?.error || "Failed to load events.");
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  /* ---------------- Helpers ---------------- */
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "https://bri-event.vercel.app"; // fallback to your domain

  const eventUrl = (id: string) => `${origin}/events/${id}`;

  const formatDateShort = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

  const sessionSummary = (e: Event) => {
    if (!e.occurrences || e.occurrences.length === 0) return "N/A";
    const sorted = [...e.occurrences].sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
    const first = sorted[0];
    const more = sorted.length - 1;
    const firstStr = `${formatDateShort(first.startTime)} ${formatTime(
      first.startTime
    )}`;
    return more > 0 ? `${firstStr} · +${more} more` : firstStr;
  };

  /* ---------------- Filtering + Search ---------------- */
  const filtered = useMemo(() => {
    let data = [...events];

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      data = data.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.location.toLowerCase().includes(q) ||
          e.contactEmail?.toLowerCase().includes(q) ||
          e.contactPhone?.toLowerCase().includes(q) ||
          e.description?.toLowerCase().includes(q)
      );
    }

    if (filters.name) {
      const v = filters.name.toLowerCase();
      data = data.filter((e) => e.name.toLowerCase().includes(v));
    }
    if (filters.location) {
      const v = filters.location.toLowerCase();
      data = data.filter((e) => e.location.toLowerCase().includes(v));
    }
    if (filters.contactEmail) {
      const v = filters.contactEmail.toLowerCase();
      data = data.filter((e) => e.contactEmail?.toLowerCase().includes(v));
    }

    return data;
  }, [events, searchTerm, filters]);

  /* ---------------- Sorting ---------------- */
  const sorted = useMemo(() => {
    const data = [...filtered];
    const { key, direction } = sortConfig;

    data.sort((a, b) => {
      let va: any = a[key];
      let vb: any = b[key];

      if (key === "maxCapacity") {
        va = va ?? -1;
        vb = vb ?? -1;
      }

      if (key === "createdAt" || key === "updatedAt") {
        va = new Date(va).getTime();
        vb = new Date(vb).getTime();
      }

      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();

      if (va < vb) return direction === "ascending" ? -1 : 1;
      if (va > vb) return direction === "ascending" ? 1 : -1;
      return 0;
    });

    return data;
  }, [filtered, sortConfig]);

  /* ---------------- Pagination ---------------- */
  const totalFilteredItems = sorted.length;
  const totalPages = Math.ceil(totalFilteredItems / itemsPerPage) || 1;
  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  const paged = sorted.slice(startIdx, endIdx);

  const goToPage = (page: number) => {
    const p = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(p);
  };

  /* ---------------- Handlers ---------------- */
  const handleItemsPerPageChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleFilterChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
    setCurrentPage(1);
  };

  const requestSort = (key: SortKey) => {
    let direction: SortConfig["direction"] = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  const handleView = (id: string) => {
    router.push(`/events/${id}`);
  };

  const handleEdit = (id: string) => {
    router.push(`/events/edit/${id}`);
  };

  const handleDeleteClick = (ev: Event) => {
    setEventToDelete(ev);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!eventToDelete) return;
    setDeleting(true);
    try {
      await axiosInstance.delete(`/api/events/${eventToDelete.id}`);
      setEvents((prev) => prev.filter((e) => e.id !== eventToDelete.id));
      toast.success("Event deleted successfully!");
      setShowDeleteConfirm(false);
      setEventToDelete(null);
    } catch (err: any) {
      console.error("Failed to delete event:", err);
      toast.error(err.response?.data?.error || "Failed to delete event.");
    } finally {
      setDeleting(false);
    }
  };

  // QR logic
  const openQrForEvent = async (ev: Event) => {
    try {
      setQrOpen(true);
      setQrLoading(true);
      const url = eventUrl(ev.id);

      // "Smallest" QR: tiny size, no margin
      const dataUrl = await QRCode.toDataURL(url, {
        margin: 0,
        scale: 4,      // small bitmap
        width: 128,    // compact footprint
        errorCorrectionLevel: "M", // decent readability while staying small
      });

      setQrPngDataUrl(dataUrl);
      setQrForEvent({ id: ev.id, url, name: ev.name });
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate QR code.");
      setQrOpen(false);
    } finally {
      setQrLoading(false);
    }
  };

  const closeQr = () => {
    setQrOpen(false);
    setQrPngDataUrl(null);
    setQrForEvent(null);
  };

  /* ---------------- UI ---------------- */
  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
        <div className="text-xl font-semibold text-black">Loading Events...</div>
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

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="w-full mx-auto bg-white rounded-2xl border border-gray-100 shadow-xl p-8">
        <h1 className="text-2xl font-semibold text-center text-black mb-6">
          Events
        </h1>

        {/* Top Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          {/* Items per page */}
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <label
              htmlFor="itemsPerPage"
              className="text-sm font-medium text-gray-700 whitespace-nowrap"
            >
              Show:
            </label>
            <select
              id="itemsPerPage"
              value={itemsPerPage}
              onChange={handleItemsPerPageChange}
              className="mt-1 block w-24 border p-2 rounded-md text-black border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm board"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          {/* Search + New Event button grouped */}
          <div className="w-full sm:w-auto flex items-center gap-3">
            <input
              type="text"
              placeholder="Search events..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="flex-1 sm:w-80 mt-1 block border p-2 rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm text-black"
            />
            <Link
              href="/events/create"
              className="inline-flex items-center justify-center whitespace-nowrap px-4 py-2 rounded-md bg-black text-white text-sm font-medium hover:bg-gray-800 transition-colors"
              aria-label="Create new event"
              title="Create new event"
            >
              New Event
            </Link>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg shadow-sm border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  onClick={() => requestSort("name")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                >
                  Name
                  {sortConfig.key === "name" &&
                    (sortConfig.direction === "ascending" ? " ▲" : " ▼")}
                </th>
                <th
                  onClick={() => requestSort("location")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                >
                  Location
                  {sortConfig.key === "location" &&
                    (sortConfig.direction === "ascending" ? " ▲" : " ▼")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sessions
                </th>
                <th
                  onClick={() => requestSort("maxCapacity")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                >
                  Capacity
                  {sortConfig.key === "maxCapacity" &&
                    (sortConfig.direction === "ascending" ? " ▲" : " ▼")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-gray-200">
              {paged.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-4 text-center text-sm text-gray-500"
                  >
                    No events found.
                  </td>
                </tr>
              ) : (
                paged.map((e) => {
                  const count = e.occurrences?.length || 0;
                  return (
                    <React.Fragment key={e.id}>
                      <tr>
                        {/* Name */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          <div className="max-w-[280px] truncate">{e.name}</div>
                          {e.description && (
                            <div className="text-xs text-gray-500 mt-0.5 max-w-[420px] truncate">
                              {e.description}
                            </div>
                          )}
                        </td>

                        {/* Location */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          <div className="flex items-center gap-2 max-w-[260px]">
                            <MapPin className="h-4 w-4 text-gray-500" />
                            <span className="truncate">{e.location}</span>
                          </div>
                          {e.googleMapsLink && (
                            <div className="text-xs mt-1">
                              <a
                                href={e.googleMapsLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                View map
                              </a>
                            </div>
                          )}
                        </td>

                        {/* Sessions summary + chevron */}
                        <td className="px-6 py-4 text-sm text-gray-600">
                          <div className="flex items-center gap-2 max-w-xs whitespace-nowrap overflow-hidden text-ellipsis">
                            <CalendarDays className="h-4 w-4 text-gray-500" />
                            <span className="truncate">{sessionSummary(e)}</span>
                            {count > 0 && (
                              <button
                                type="button"
                                onClick={() => toggleExpand(e.id)}
                                className="ml-1 inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                                aria-expanded={expandedRowId === e.id}
                                aria-label={
                                  expandedRowId === e.id
                                    ? "Collapse details"
                                    : "Expand details"
                                }
                                title={
                                  expandedRowId === e.id
                                    ? "Collapse details"
                                    : "Expand details"
                                }
                              >
                                <ChevronDown
                                  className={`h-4 w-4 transition-transform ${
                                    expandedRowId === e.id ? "rotate-180" : ""
                                  }`}
                                />
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Capacity */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-gray-500" />
                            {e.maxCapacity ? (
                              <span>
                                {(e.registrations?.length || 0)} / {e.maxCapacity}
                              </span>
                            ) : (
                              <span>—</span>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                          <div className="flex items-center gap-2">
                            {/* VIEW */}
                            <button
                              onClick={() => handleView(e.id)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                              title="View"
                              aria-label="View"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            {/* EDIT */}
                            <button
                              onClick={() => handleEdit(e.id)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                              title="Edit"
                              aria-label="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            {/* QR CODE */}
                            <button
                              onClick={() => openQrForEvent(e)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                              title="QR Code"
                              aria-label="QR Code"
                            >
                              <QrCode className="h-4 w-4" />
                            </button>
                            {/* DELETE */}
                            <button
                              onClick={() => handleDeleteClick(e)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-red-600 hover:bg-red-50"
                              title="Delete"
                              aria-label="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded details row */}
                      {expandedRowId === e.id && (
                        <tr>
                          <td colSpan={7} className="px-6 py-4 bg-gray-50">
                            <div className="rounded-lg border border-gray-200 bg-white p-4">
                              <div className="mb-3 text-sm font-semibold text-gray-800">
                                Session Details
                              </div>

                              {(!e.occurrences || e.occurrences.length === 0) && (
                                <div className="text-sm text-gray-600">
                                  No sessions for this event.
                                </div>
                              )}

                              <ul className="space-y-2">
                                {e.occurrences
                                  ?.slice()
                                  .sort(
                                    (a, b) =>
                                      new Date(a.startTime).getTime() -
                                      new Date(b.startTime).getTime()
                                  )
                                  .map((occ) => {
                                    const end = occ.endTime
                                      ? ` – ${formatTime(occ.endTime)}`
                                      : "";
                                    const loc =
                                      occ.location && occ.location !== e.location
                                        ? ` (${occ.location})`
                                        : "";
                                    return (
                                      <li key={occ.id} className="text-sm text-gray-700">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span className="font-medium">
                                            {formatDateShort(occ.startTime)}{" "}
                                            {formatTime(occ.startTime)}
                                            {end}
                                          </span>
                                          {loc && (
                                            <span className="text-gray-500">{loc}</span>
                                          )}
                                        </div>
                                      </li>
                                    );
                                  })}
                              </ul>

                              {/* Contact quick view */}
                              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                <div>
                                  <div className="text-xs uppercase tracking-wide text-gray-500">
                                    Contact
                                  </div>
                                  <div className="text-sm text-gray-800">
                                    {e.contactEmail ? (
                                      <a
                                        href={`mailto:${e.contactEmail}`}
                                        className="text-blue-600 hover:underline"
                                      >
                                        <Mail className="inline h-4 w-4 mr-1" />
                                        {e.contactEmail}
                                      </a>
                                    ) : (
                                      "—"
                                    )}
                                    {e.contactPhone && (
                                      <>
                                        {" "}
                                        |{" "}
                                        <a
                                          href={`tel:${e.contactPhone}`}
                                          className="text-blue-600 hover:underline"
                                        >
                                          <Phone className="inline h-4 w-4 mr-1" />
                                          {e.contactPhone}
                                        </a>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs uppercase tracking-wide text-gray-500">
                                    Location
                                  </div>
                                  <div className="text-sm text-gray-800">
                                    {e.location}
                                  </div>
                                </div>
                              </div>
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
            Showing {totalFilteredItems === 0 ? 0 : startIdx + 1} to{" "}
            {Math.min(endIdx, totalFilteredItems)} of {totalFilteredItems} entries
          </div>
          <nav
            className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
            aria-label="Pagination"
          >
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-2 py-2 border border-gray-300 bg-white text-sm text-gray-500 rounded-l-md disabled:opacity-50"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => goToPage(page)}
                className={`px-4 py-2 border text-sm font-medium ${
                  page === currentPage
                    ? "z-10 bg-black text-white"
                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-2 py-2 border border-gray-300 bg-white text-sm text-gray-500 rounded-r-md disabled:opacity-50"
            >
              Next
            </button>
          </nav>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && eventToDelete && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-black">Delete Event</h3>
            <p className="mb-6 text-black">
              Are you sure you want to delete{" "}
              <span className="font-semibold">{eventToDelete.name}</span>? This
              action cannot be undone.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setEventToDelete(null);
                }}
                className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className={`px-4 py-2 rounded-md text-white ${
                  deleting ? "bg-red-400 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {qrOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-xs text-center">
            <h3 className="text-base font-semibold mb-3 text-black">
              Event QR Code
            </h3>
            {qrLoading ? (
              <div className="text-sm text-gray-600">Generating...</div>
            ) : (
              <>
                {qrPngDataUrl && (
                  <img
                    src={qrPngDataUrl}
                    alt="Event QR"
                    className="mx-auto mb-3 h-28 w-28"
                  />
                )}
                {qrForEvent && (
                  <div className="text-xs text-gray-600 break-words mb-3">
                    {qrForEvent.url}
                  </div>
                )}
                <div className="flex items-center justify-center gap-2">
                  {qrPngDataUrl && (
                    <a
                      href={qrPngDataUrl}
                      download={qrForEvent ? `${qrForEvent.id}-qr.png` : "event-qr.png"}
                      className="px-3 py-2 rounded-md bg-black text-white text-xs hover:bg-gray-800"
                    >
                      Download PNG
                    </a>
                  )}
                  <button
                    onClick={closeQr}
                    className="px-3 py-2 rounded-md border border-gray-300 text-gray-700 text-xs hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
