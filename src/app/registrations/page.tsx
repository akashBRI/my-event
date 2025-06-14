"use client";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import axiosInstance from "@/lib/api";
import Link from "next/link";

// Define interfaces for data structures
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
    id: string; // ID of the EventOccurrenceRegistration join table entry
    occurrence: EventOccurrence; // The actual occurrence details
  }[];
}

interface SortConfig {
  key: keyof Registration | 'user.firstName' | 'user.email' | 'event.name';
  direction: 'ascending' | 'descending';
}

interface FilterConfig {
  status: string;
  eventName: string;
  userEmail: string;
}

export default function RegistrationsPage() {
  const router = useRouter();

  const [allRegistrations, setAllRegistrations] = useState<Registration[]>([]); // Stores all data fetched from API
  const [displayedRegistrations, setDisplayedRegistrations] = useState<Registration[]>([]); // Data currently in the table after client-side filtering/sorting
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalFilteredItems, setTotalFilteredItems] = useState(0); // Total items after client-side search/filters

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10); // Default items per page

  // Search and Filter states
  const [searchTerm, setSearchTerm] = useState(""); // Client-side search term
  const [filters, setFilters] = useState<FilterConfig>({
    status: "",
    eventName: "",
    userEmail: "",
  });

  // Sorting states
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'registrationDate', direction: 'descending' });

  // Modal for confirmation (delete) and edit form
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [registrationToDelete, setRegistrationToDelete] = useState<string | null>(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRegistration, setEditingRegistration] = useState<Registration | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Registration>>({});
  const [editErrors, setEditErrors] = useState<any>({});
  const [resendingEmailId, setResendingEmailId] = useState<string | null>(null); // New state for loading on email resend


  const fetchRegistrations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      // Pagination and server-side filters are sent to backend
      params.append('page', currentPage.toString());
      params.append('limit', itemsPerPage.toString());
      if (sortConfig.key) {
        params.append('sortBy', String(sortConfig.key));
        params.append('sortDirection', sortConfig.direction);
      }
      if (filters.status) params.append('status', filters.status);
      if (filters.eventName) params.append('eventName', filters.eventName);
      if (filters.userEmail) params.append('userEmail', filters.userEmail);

      const response = await axiosInstance.get<{ data: Registration[]; total: number }>(`/api/registrations?${params.toString()}`);
      setAllRegistrations(response.data.data); // Store fetched data (which is already paginated/filtered by backend)
      setTotalFilteredItems(response.data.total); // Total from backend for backend filters/pagination
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

  // Client-side filtering of `allRegistrations` based on `searchTerm`
  // This memoized function applies the search filter to the current page's data.
  const filteredAndSortedRegistrations = useMemo(() => {
    let currentData = [...allRegistrations]; // Start with the data fetched for the current page/filters

    // Apply client-side search
    if (searchTerm) {
      const lowercasedSearchTerm = searchTerm.toLowerCase();
      currentData = currentData.filter(reg =>
        (reg.user.firstName?.toLowerCase().includes(lowercasedSearchTerm) ||
         reg.user.lastName?.toLowerCase().includes(lowercasedSearchTerm) ||
         reg.user.email.toLowerCase().includes(lowercasedSearchTerm) ||
         reg.user.company?.toLowerCase().includes(lowercasedSearchTerm) ||
         reg.event.name.toLowerCase().includes(lowercasedSearchTerm) ||
         reg.passId.toLowerCase().includes(lowercasedSearchTerm) ||
         // Search within occurrences location
         reg.selectedOccurrences.some(so => so.occurrence.location?.toLowerCase().includes(lowercasedSearchTerm))
        )
      );
    }

    // Set the total filtered items for client-side pagination display
    setTotalFilteredItems(currentData.length);
    return currentData; // This is the data to be displayed in the table
  }, [allRegistrations, searchTerm]); // Re-run when fetched data or search term changes

  useEffect(() => {
    setDisplayedRegistrations(filteredAndSortedRegistrations);
  }, [filteredAndSortedRegistrations]);


  // Handle items per page change
  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1); // Reset to first page
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page so search applies from beginning
  };

  // Handle filter changes (these still trigger API re-fetch)
  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
    setCurrentPage(1); // Reset to first page
  };

  // Handle sorting (triggers API re-fetch for sorting if sortBy is sent to backend)
  const requestSort = (key: keyof Registration | 'user.firstName' | 'user.email' | 'event.name') => {
    let direction: SortConfig['direction'] = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1); // Reset to first page on sort change
  };


  // Pagination calculations for client-side displayed data
  const totalPages = Math.ceil(totalFilteredItems / itemsPerPage);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // --- Delete functionality ---
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
      fetchRegistrations(); // Re-fetch list from API
    } catch (err: any) {
      console.error("Failed to delete registration:", err);
      toast.error(err.response?.data?.error || "Failed to delete registration.");
    } finally {
      setLoading(false);
    }
  };

  // --- Edit functionality ---
  const handleEditClick = (registration: Registration) => {
    setEditingRegistration(registration);
    setEditFormData({
        status: registration.status,
    });
    setEditErrors({});
    setShowEditModal(true);
  };

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
  };

  const handleEditSubmit = async () => {
    if (!editingRegistration) return;

    let currentEditErrors: any = {};
    if (!editFormData.status) {
        currentEditErrors.status = "Status is required.";
    }
    setEditErrors(currentEditErrors);
    if (Object.keys(currentEditErrors).length > 0) {
        return;
    }

    try {
      setLoading(true);
      await axiosInstance.patch(`/api/registrations/${editingRegistration.id}`, editFormData);
      toast.success("Registration updated successfully!");
      setShowEditModal(false);
      setEditingRegistration(null);
      setEditFormData({});
      fetchRegistrations(); // Re-fetch list to show updates
    } catch (err: any) {
      console.error("Failed to update registration:", err);
      toast.error(err.response?.data?.error || "Failed to update registration.");
    } finally {
      setLoading(false);
    }
  };

  // --- Resend Email functionality ---
  const handleResendEmail = async (registrationId: string) => {
    setResendingEmailId(registrationId); // Set loading state for this specific registration
    try {
      const response = await axiosInstance.post('/api/registrations/resend-email', { registrationId });
      toast.success(response.data.message || "Email resent successfully!");
    } catch (err: any) {
      console.error("Failed to resend email:", err);
      toast.error(err.response?.data?.error || "Failed to resend email.");
    } finally {
      setResendingEmailId(null); // Clear loading state
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
      <div className="w-full max-w-7xl mx-auto bg-white rounded-2xl border border-gray-100 shadow-xl p-8">
        <h1 className="text-2xl font-semibold text-center text-black mb-6">Event Registrations</h1>

        {/* Top Controls: Items per page, Search Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <label htmlFor="itemsPerPage" className="text-sm font-medium text-gray-700 whitespace-nowrap">Show:</label>
            <select
              id="itemsPerPage"
              value={itemsPerPage}
              onChange={handleItemsPerPageChange}
              className="mt-1 block w-24 rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-sm font-medium text-gray-700 whitespace-nowrap">entries</span>
          </div>

          <div className="w-full sm:w-1/3">
            <input
              type="text"
              placeholder="Search registrations..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm"
            />
          </div>
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
                <label htmlFor="filterStatus" className="block text-sm font-medium text-gray-700">Status:</label>
                <select
                    id="filterStatus"
                    name="status"
                    value={filters.status}
                    onChange={handleFilterChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm"
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
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm"
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
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm"
                />
            </div>
        </div>


        {/* Registrations Table */}
        <div className="overflow-x-auto rounded-lg shadow-sm border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => requestSort('user.firstName')}
                >
                  Name
                  {sortConfig.key === 'user.firstName' && (sortConfig.direction === 'ascending' ? ' ▲' : ' ▼')}
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => requestSort('user.email')}
                >
                  Email
                  {sortConfig.key === 'user.email' && (sortConfig.direction === 'ascending' ? ' ▲' : ' ▼')}
                </th>
                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => requestSort('event.name')}
                >
                  Event
                  {sortConfig.key === 'event.name' && (sortConfig.direction === 'ascending' ? ' ▲' : ' ▼')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Session
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => requestSort('registrationDate')}
                >
                  Reg. Date
                  {sortConfig.key === 'registrationDate' && (sortConfig.direction === 'ascending' ? ' ▲' : ' ▼')}
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => requestSort('status')}
                >
                  Status
                  {sortConfig.key === 'status' && (sortConfig.direction === 'ascending' ? ' ▲' : ' ▼')}
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
              {displayedRegistrations.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    No registrations found matching your criteria.
                  </td>
                </tr>
              ) : (
                displayedRegistrations.map((reg) => (
                  <tr key={reg.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {reg.user.firstName} {reg.user.lastName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {reg.user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {reg.user.company || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {reg.event.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {reg.selectedOccurrences.length > 0 ? (
                        <ul className="list-disc list-inside">
                            {reg.selectedOccurrences.map(so => (
                                <li key={so.id} className="mb-0.5">
                                    {new Date(so.occurrence.startTime).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}
                                    {so.occurrence.endTime && ` - ${new Date(so.occurrence.endTime).toLocaleTimeString('en-US', { timeStyle: 'short' })}`}
                                    {so.occurrence.location && ` (${so.occurrence.location})`}
                                </li>
                            ))}
                        </ul>
                      ) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(reg.registrationDate).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        reg.status === 'registered' ? 'bg-blue-100 text-blue-800' :
                        reg.status === 'checked-in' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {reg.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <Link href={`/api/event-pass-pdf/${reg.passId}`} className="text-blue-600 hover:underline">
                        {reg.passId}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                      <button
                        onClick={() => handleEditClick(reg)}
                        className="text-indigo-600 hover:text-indigo-900 mr-2"
                        title="Edit Registration"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteClick(reg.id)}
                        className="text-red-600 hover:text-red-900 mr-2"
                        title="Delete Registration"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => handleResendEmail(reg.id)}
                        className={`text-blue-600 hover:text-blue-900 ${resendingEmailId === reg.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title="Resend Registration Email"
                        disabled={resendingEmailId === reg.id}
                      >
                        {resendingEmailId === reg.id ? 'Sending...' : 'Resend Email'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex justify-between items-center mt-6">
          <div className="text-sm text-gray-700">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalFilteredItems)} of {totalFilteredItems} entries
          </div>
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => goToPage(page)}
                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                  page === currentPage ? 'z-10 bg-black text-white' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
            >
              Next
            </button>
          </nav>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Confirm Deletion</h3>
            <p className="mb-6">Are you sure you want to delete this registration?</p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Registration Modal */}
      {showEditModal && editingRegistration && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Edit Registration</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="editStatus" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  id="editStatus"
                  name="status"
                  value={editFormData.status || ''}
                  onChange={handleEditFormChange}
                  className={`mt-1 block w-full rounded-md border ${editErrors.status ? 'border-red-500' : 'border-gray-300'} px-3 py-2 shadow-sm focus:border-black focus:ring-black sm:text-sm`}
                >
                  <option value="registered">Registered</option>
                  <option value="checked-in">Checked-in</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                {editErrors.status && (
                  <p className="mt-1 text-sm text-red-500">{editErrors.status}</p>
                )}
              </div>
            </div>
            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSubmit}
                className="px-4 py-2 rounded-md bg-black text-white hover:bg-gray-800"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
