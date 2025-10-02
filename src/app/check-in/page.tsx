"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { toast } from "react-hot-toast";
import axiosInstance from "@/lib/api";
import Link from "next/link";
import { ChevronDown, Pencil } from "lucide-react";

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

export default function RegistrationsPage() {
  const [allRows, setAllRows] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // search & filters
  const [searchInput, setSearchInput] = useState("");

  // expanded row
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Jump to PassId
  const [jumpPassId, setJumpPassId] = useState("");
  const [jumpBusy, setJumpBusy] = useState(false);

  // Edit modal
  const [editingReg, setEditingReg] = useState<Registration | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Fetch all registrations
  const fetchRegistrations = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get<{ data: Registration[] }>(
        `/api/registrations/all`
      );
      setAllRows(response.data.data);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || "Failed to fetch registrations.");
      toast.error(err.response?.data?.error || "Failed to fetch registrations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  // Search filtering
  const filteredRows = useMemo(() => {
    let data = [...allRows];
    if (searchInput.trim()) {
      const q = searchInput.trim().toLowerCase();
      data = data.filter((r) => {
        const name = `${r.user.firstName ?? ""} ${r.user.lastName ?? ""}`.toLowerCase();
        const sessionsStr = r.selectedOccurrences
          .map((so) => (so.occurrence.location ?? "").toLowerCase())
          .join(" | ");
        return (
          r.passId.toLowerCase().includes(q) ||
          name.includes(q) ||
          (r.user.email ?? "").toLowerCase().includes(q) ||
          (r.user.company ?? "").toLowerCase().includes(q) ||
          r.event.name.toLowerCase().includes(q) ||
          (r.event.location ?? "").toLowerCase().includes(q) ||
          sessionsStr.includes(q) ||
          r.status.toLowerCase().includes(q)
        );
      });
    }
    return data;
  }, [allRows, searchInput]);

  // Jump to PassId handler
  const jumpToPassId = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = jumpPassId.trim().toLowerCase();
    if (!q) return;

    const reg = allRows.find((r) => r.passId.toLowerCase() === q);
    if (!reg) {
      toast.error("Pass ID not found");
      return;
    }

    setJumpBusy(true);
    try {
      if (reg.status !== "checked-in") {
        await axiosInstance.patch(`/api/registrations/${reg.id}`, { status: "checked-in" });
        setAllRows((prev) =>
          prev.map((r) =>
            r.id === reg.id ? { ...r, status: "checked-in" } : r
          )
        );
        toast.success(`${reg.passId} marked as checked-in`);
      }
      window.open(`/api/event-pass-pdf/${reg.passId}`, "_blank");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to check-in / open pass");
    } finally {
      setJumpBusy(false);
    }
  };

  // Save edit
  const saveEdit = async () => {
    if (!editingReg) return;
    setSavingEdit(true);
    try {
      await axiosInstance.patch(`/api/registrations/${editingReg.id}`, {
        status: editStatus,
      });
      setAllRows((prev) =>
        prev.map((r) =>
          r.id === editingReg.id ? { ...r, status: editStatus } : r
        )
      );
      toast.success("Registration updated");
      setEditingReg(null);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to update registration");
    } finally {
      setSavingEdit(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="text-xl font-semibold text-black">Loading Registrations...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="text-xl font-semibold text-red-600">{error}</div>
      </div>
    );
  }

  const formatOccurrenceSummary = (reg: Registration) => {
    if (!reg.selectedOccurrences?.length) return "N/A";
    const first = reg.selectedOccurrences[0].occurrence;
    const firstStr = new Date(first.startTime).toLocaleString("en-US", {
      dateStyle: "short",
      timeStyle: "short",
    });
    return `${firstStr} ${first.location ? `(${first.location})` : ""}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="w-full mx-auto bg-white rounded-2xl border shadow p-8">
        <h1 className="text-2xl font-semibold text-center text-black mb-6">
          Event Registrations
        </h1>

        {/* Jump to Pass ID */}
        {/* <form onSubmit={jumpToPassId} className="flex gap-2 mb-6">
          <input
            value={jumpPassId}
            onChange={(e) => setJumpPassId(e.target.value)}
            placeholder="Enter Pass ID e.g. BRI-1151"
            className="flex-1 rounded-md border p-2 border-gray-300 text-black"
            disabled={jumpBusy}
          />
          <button
            type="submit"
            disabled={jumpBusy || !jumpPassId.trim()}
            className="px-4 py-2 bg-black text-white rounded-md"
          >
            {jumpBusy ? "Working..." : "Go"}
          </button>
        </form> */}

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search registrations..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full rounded-md border p-2 border-gray-300 text-black"
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Session</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reg. Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PASS PDF</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
                    No registrations found.
                  </td>
                </tr>
              ) : (
                filteredRows.map((reg) => {
                  const count = reg.selectedOccurrences.length;
                  return (
                    <React.Fragment key={reg.id}>
                      <tr>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {reg.user.firstName} {reg.user.lastName}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{reg.user.email}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{reg.user.company || "N/A"}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{reg.event.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {formatOccurrenceSummary(reg)}
                          {count > 1 && (
                            <button
                              onClick={() =>
                                setExpandedRowId(expandedRowId === reg.id ? null : reg.id)
                              }
                              className="ml-2 text-xs text-blue-600"
                            >
                              {expandedRowId === reg.id ? "Hide" : `+${count - 1} more`}
                            </button>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(reg.registrationDate).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm">
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
                        <td className="px-6 py-4 text-sm">
                          {/* PDF Link */}
                          <Link
                            href={`/api/event-pass-pdf/${reg.passId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {reg.passId}
                          </Link>
                           </td>
                           <td className="px-6 py-4 text-sm">

                          {/* Edit button */}
                          <button
                            onClick={() => {
                              setEditingReg(reg);
                              setEditStatus(reg.status);
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>

                      {expandedRowId === reg.id && (
                        <tr>
                          <td colSpan={8} className="px-6 py-4 bg-gray-50">
                            <div className="text-sm font-semibold">Sessions:</div>
                            <ul className="mt-2 space-y-1">
                              {reg.selectedOccurrences.map((so) => (
                                <li key={so.id} className="text-sm text-gray-700">
                                  {new Date(so.occurrence.startTime).toLocaleString()}{" "}
                                  {so.occurrence.location && `(${so.occurrence.location})`}
                                </li>
                              ))}
                            </ul>
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
      </div>

      {/* Edit Modal */}
      {editingReg && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Edit Registration</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="w-full border rounded-md p-2 text-black"
              >
                <option value="registered">Registered</option>
                <option value="checked-in">Checked-in</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setEditingReg(null)}
                className="px-4 py-2 border rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={savingEdit}
                className="px-4 py-2 bg-black text-white rounded-md"
              >
                {savingEdit ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
