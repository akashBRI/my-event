"use client";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import axiosInstance from "@/lib/api";
import Link from "next/link";
import { ChevronDown, Mail, Pencil, Trash2, Loader2 } from "lucide-react";

/* ---------------- Types ---------------- */
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

interface FilterConfig {
  status: string;
  eventName: string;
  userEmail: string;
}

/* ---------------- Component ---------------- */
export default function RegistrationsPage() {
  const router = useRouter();

  const [allRegistrations, setAllRegistrations] = useState<Registration[]>([]);
  const [displayedRegistrations, setDisplayedRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalFilteredItems, setTotalFilteredItems] = useState(0);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filters / Sorting / Search
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<FilterConfig>({ status: "", eventName: "", userEmail: "" });
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "registrationDate", direction: "descending" });

  // Modals
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [registrationToDelete, setRegistrationToDelete] = useState<string | null>(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRegistration, setEditingRegistration] = useState<Registration | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Registration>>({});
  const [editErrors, setEditErrors] = useState<any>({});
  const [resendingEmailId, setResendingEmailId] = useState<string | null>(null);

  // Expanded row
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const toggleExpand = (id: string) => setExpandedRowId(prev => (prev === id ? null : id));

  const formatOccurrenceSummary = (reg: Registration) => {
    if (!reg.selectedOccurrences?.length) return "N/A";
    const first = reg.selectedOccurrences[0].occurrence;
    const firstStr = new Date(first.startTime).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" });
    const loc = first.location ? ` (${first.location})` : "";
    return `${firstStr}`;
  };

  const fetchRegistrations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append("page", currentPage.toString());
      params.append("limit", itemsPerPage.toString());
      if (sortConfig.key) {
        params.append("sortBy", String(sortConfig.key));
        params.append("sortDirection", sortConfig.direction);
      }
      if (filters.status) params.append("status", filters.status);
      if (filters.eventName) params.append("eventName", filters.eventName);
      if (filters.userEmail) params.append("userEmail", filters.userEmail);

      const response = await axiosInstance.get<{ data: Registration[]; total: number }>(`/api/registrations?${params.toString()}`);
      setAllRegistrations(response.data.data);
      setTotalFilteredItems(response.data.total);
    } catch (err: any) {
      console.error("Failed to fetch registrations:", err);
      setError(err.response?.data?.error || "Failed to load registrations.");
      toast.error(err.response?.data?.error || "Failed to load registrations.");
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, sortConfig, filters]);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  // Client-side search
  const filteredAndSortedRegistrations = useMemo(() => {
    let currentData = [...allRegistrations];
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      currentData = currentData.filter(reg =>
        reg.user.firstName?.toLowerCase().includes(q) ||
        reg.user.lastName?.toLowerCase().includes(q) ||
        reg.user.email.toLowerCase().includes(q) ||
        reg.user.company?.toLowerCase().includes(q) ||
        reg.event.name.toLowerCase().includes(q) ||
        reg.passId.toLowerCase().includes(q) ||
        reg.selectedOccurrences.some(so => so.occurrence.location?.toLowerCase().includes(q))
      );
    }
    setTotalFilteredItems(currentData.length);
    return currentData;
  }, [allRegistrations, searchTerm]);

  useEffect(() => {
    setDisplayedRegistrations(filteredAndSortedRegistrations);
  }, [filteredAndSortedRegistrations]);

  // Handlers
  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };
  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
    setCurrentPage(1);
  };
  const requestSort = (key: keyof Registration | "user.firstName" | "user.email" | "event.name") => {
    let direction: SortConfig["direction"] = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") direction = "descending";
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalFilteredItems / itemsPerPage);
  const goToPage = (page: number) => page >= 1 && page <= totalPages && setCurrentPage(page);

  // Delete
  const handleDeleteClick = (registrationId: string) => {
    setRegistrationToDelete(registrationId);
    setShowDeleteConfirm(true);
  };
  const confirmDelete = async () => {
    if (!registrationToDelete) return;
    try {
      setLoading(true);
      await axiosInstance.delete(`/api/registrations/${registrationToDelete}`);
      toast.success("Registration deleted successfully!");
      setShowDeleteConfirm(false);
      setRegistrationToDelete(null);
      fetchRegistrations();
    } catch (err: any) {
      console.error("Failed to delete registration:", err);
      toast.error(err.response?.data?.error || "Failed to delete registration.");
    } finally {
      setLoading(false);
    }
  };

  // Edit
  const handleEditClick = (registration: Registration) => {
    setEditingRegistration(registration);
    setEditFormData({ status: registration.status });
    setEditErrors({});
    setShowEditModal(true);
  };
  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
  };
  const handleEditSubmit = async () => {
    if (!editingRegistration) return;
    const errs: any = {};
    if (!editFormData.status) errs.status = "Status is required.";
    setEditErrors(errs);
    if (Object.keys(errs).length > 0) return;

    try {
      setLoading(true);
      await axiosInstance.patch(`/api/registrations/${editingRegistration.id}`, editFormData);
      toast.success("Registration updated successfully!");
      setShowEditModal(false);
      setEditingRegistration(null);
      setEditFormData({});
      fetchRegistrations();
    } catch (err: any) {
      console.error("Failed to update registration:", err);
      toast.error(err.response?.data?.error || "Failed to update registration.");
    } finally {
      setLoading(false);
    }
  };

  // Resend email
  const handleResendEmail = async (registrationId: string) => {
    setResendingEmailId(registrationId);
    try {
      const response = await axiosInstance.post("/api/registrations/resend-email", { registrationId });
      toast.success(response.data.message || "Email resent successfully!");
    } catch (err: any) {
      console.error("Failed to resend email:", err);
      toast.error(err.response?.data?.error || "Failed to resend email.");
    } finally {
      setResendingEmailId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
        <div className="text-xl font-semibold text-black">Loading Registrations...</div>
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
        <h1 className="text-2xl font-semibold text-center text-black mb-6">Event Registrations</h1>

        {/* Top Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <label htmlFor="itemsPerPage" className="text-sm font-medium text-gray-700 whitespace-nowrap">Show:</label>
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

          <div className="w-full sm:w-1/3">
            <input
              type="text"
              placeholder="Search registrations..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="mt-1 block w-full border p-2 rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm text-black"
            />
          </div>
        </div>

        {/* Filters */}
        {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

          <div>
            <label htmlFor="filterStatus" className="block text-sm font-medium text-gray-700">Status:</label>
            <select
              id="filterStatus"
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
          <div>
            <label htmlFor="filterEventName" className="block text-sm font-medium text-gray-700">Event Name:</label>
            <input
              id="filterEventName"
              name="eventName"
              type="text"
              value={filters.eventName}
              onChange={handleFilterChange}
              placeholder="Filter by event name"
              className="mt-1 block w-full rounded-md border p-2 border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm text-black"
            />
          </div>
          <div>
            <label htmlFor="filterUserEmail" className="block text-sm font-medium text-gray-700">User Email:</label>
            <input
              id="filterUserEmail"
              name="userEmail"
              type="email"
              value={filters.userEmail}
              onChange={handleFilterChange}
              placeholder="Filter by user email"
              className="mt-1 block w-full rounded-md border p-2 border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm text-black"
            />
          </div>

            <div>
                <label htmlFor="filterStatus" className="block text-sm font-medium text-gray-700">Status:</label>
                <select
                    id="filterStatus"
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
            <div>
                <label htmlFor="filterEventName" className="block text-sm font-medium text-gray-700">Event Name:</label>
                <input
                    id="filterEventName"
                    name="eventName"
                    type="text"
                    value={filters.eventName}
                    onChange={handleFilterChange}
                    placeholder="Filter by event name"
                    className="mt-1 block w-full rounded-md border p-2 border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm text-black"
                />
            </div>
            <div>
                <label htmlFor="filterUserEmail" className="block text-sm font-medium text-gray-700">User Email:</label>
                <input
                    id="filterUserEmail"
                    name="userEmail"
                    type="email"
                    value={filters.userEmail}
                    onChange={handleFilterChange}
                    placeholder="Filter by user email"
                    className="mt-1 block w-full rounded-md border p-2 border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm text-black"
                />
            </div>

        </div> */}

        {/* Table */}
        <div className="overflow-x-auto rounded-lg shadow-sm border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th onClick={() => requestSort('user.firstName')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">Name</th>
                <th onClick={() => requestSort('user.email')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                <th onClick={() => requestSort('event.name')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">Event</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Session</th>
                <th onClick={() => requestSort('registrationDate')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">Reg. Date</th>
                <th onClick={() => requestSort('status')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pass ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {displayedRegistrations.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-4 text-center text-sm text-gray-500">No registrations found.</td>
                </tr>
              ) : (
                displayedRegistrations.map((reg) => {
                  const count = reg.selectedOccurrences.length;
                  return (
                    <React.Fragment key={reg.id}>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{reg.user.firstName} {reg.user.lastName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{reg.user.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{reg.user.company || "N/A"}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{reg.event.name}</td>

                        {/* Session column: summary + count + chevron */}
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
                                aria-label={expandedRowId === reg.id ? "Collapse details" : "Expand details"}
                                title={expandedRowId === reg.id ? "Collapse details" : "Expand details"}
                              >
                                <ChevronDown className={`h-4 w-4 transition-transform ${expandedRowId === reg.id ? "rotate-180" : ""}`} />
                              </button>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(reg.registrationDate).toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            reg.status === "registered" ? "bg-blue-100 text-blue-800" :
                            reg.status === "checked-in" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                          }`}>
                            {reg.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <Link href={`/api/event-pass-pdf/${reg.passId}`} className="text-blue-600 hover:underline">{reg.passId}</Link>
                        </td>
                        {/* Actions as icon buttons */}
                        <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditClick(reg)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                              title="Edit"
                              aria-label="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(reg.id)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-red-600 hover:bg-red-50"
                              title="Delete"
                              aria-label="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleResendEmail(reg.id)}
                              disabled={resendingEmailId === reg.id}
                              className={`inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 ${resendingEmailId === reg.id ? "text-gray-400 cursor-not-allowed" : "text-gray-700 hover:bg-gray-50"}`}
                              title="Resend Email"
                              aria-label="Resend Email"
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
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex justify-between items-center mt-6">
          <div className="text-sm text-gray-700">
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalFilteredItems)} of {totalFilteredItems} entries
          </div>
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
            <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className="px-2 py-2 border border-gray-300 bg-white text-sm text-gray-500 rounded-l-md">Previous</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => goToPage(page)}
                className={`px-4 py-2 border text-sm font-medium ${page === currentPage ? "z-10 bg-black text-white" : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"}`}
              >
                {page}
              </button>
            ))}
            <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} className="px-2 py-2 border border-gray-300 bg-white text-sm text-gray-500 rounded-r-md">Next</button>
          </nav>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl">
            <h3 className="text-lg font-semibold mb-4 text-black">Confirm Deletion</h3>
            <p className="mb-6 text-black">Are you sure you want to delete this registration?</p>
            <div className="flex justify-end space-x-4">
              <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={confirmDelete} className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingRegistration && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-black">Edit Registration</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="editStatus" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  id="editStatus"
                  name="status"
                  value={editFormData.status || ""}
                  onChange={handleEditFormChange}
                  className={`mt-1 block w-full text-black rounded-md border ${editErrors.status ? "border-red-500" : "border-gray-300"} px-3 py-2 shadow-sm focus:border-black focus:ring-black sm:text-sm`}
                >
                  <option value="registered">Registered</option>
                  <option value="checked-in">Checked-in</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                {editErrors.status && <p className="mt-1 text-sm text-red-500">{editErrors.status}</p>}
              </div>
            </div>
            <div className="flex justify-end space-x-4 mt-6">
              <button onClick={() => setShowEditModal(false)} className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleEditSubmit} className="px-4 py-2 rounded-md bg-black text-white hover:bg-gray-800">Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
