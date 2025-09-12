// src/app/events/edit/[id]/page.tsx
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import axiosInstance from "@/lib/api";
import Link from "next/link";

/* ---------------- Types ---------------- */
interface EventOccurrenceFormData {
  id?: string;            // keep existing id if present (helps backend reconcile)
  startTime: string;      // EXACT string from input: "YYYY-MM-DDTHH:mm"
  endTime: string;        // EXACT string from input: "YYYY-MM-DDTHH:mm" or ""
  location: string;       // optional override
}

interface EventDetail {
  id: string;
  name: string;
  description: string | null;
  location: string;
  googleMapsLink: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  maxCapacity: number | null;
  occurrences: Array<{
    id: string;
    startTime: string;    // whatever server stored (ISO or naive); we won't shift it
    endTime: string | null;
    location: string | null;
  }>;
}

/* ---------------- Helpers (NO timezone conversion) ---------------- */
/**
 * Extract "YYYY-MM-DDTHH:mm" without converting timezones.
 * Accepts ISO-like strings or naive strings and returns a value suitable for <input type="datetime-local" />.
 */
function toInputNoTZ(isoLike: string | null | undefined): string {
  if (!isoLike) return "";
  const s = String(isoLike).trim();
  // Match "YYYY-MM-DDTHH:mm" at the start; allow space between date & time too
  const m = s.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
  return m ? `${m[1]}T${m[2]}` : "";
}

/* ---------------- Component ---------------- */
export default function EditEventPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { id } = params;

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    location: "",
    googleMapsLink: "",
    contactEmail: "",
    contactPhone: "",
    maxCapacity: "",
    occurrences: [] as EventOccurrenceFormData[],
  });

  const [errors, setErrors] = useState({
    name: "",
    description: "",
    location: "",
    googleMapsLink: "",
    contactEmail: "",
    contactPhone: "",
    maxCapacity: "",
    occurrences: [] as { startTime?: string; endTime?: string; location?: string }[],
  });

  const [apiError, setApiError] = useState("");
  const [buttonDisabled, setButtonDisabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /* ---------------- Load existing event ---------------- */
  useEffect(() => {
    const fetchEvent = async () => {
      setLoading(true);
      setApiError("");
      try {
        const res = await axiosInstance.get<EventDetail>(`/api/events/${id}`);
        const e = res.data;

        setFormData({
          name: e.name ?? "",
          description: e.description ?? "",
          location: e.location ?? "",
          googleMapsLink: e.googleMapsLink ?? "",
          contactEmail: e.contactEmail ?? "",
          contactPhone: e.contactPhone ?? "",
          maxCapacity: e.maxCapacity ? String(e.maxCapacity) : "",
          occurrences:
            e.occurrences?.map((o) => ({
              id: o.id,
              startTime: toInputNoTZ(o.startTime), // NO TZ SHIFT
              endTime: toInputNoTZ(o.endTime),     // NO TZ SHIFT
              location: o.location ?? "",
            })) || [{ startTime: "", endTime: "", location: "" }],
        });
      } catch (err: any) {
        console.error("Failed to load event", err);
        const msg = err.response?.data?.error || "Failed to load event.";
        setApiError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchEvent();
  }, [id]);

  /* ---------------- Validation (no timezone logic) ---------------- */
  const validateEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validatePhone = (phone: string) =>
    /^[0-9\s\-\+()]+$/.test(phone);

  const handleValidation = useCallback(() => {
    const errs = {
      name: "",
      description: "",
      location: "",
      googleMapsLink: "",
      contactEmail: "",
      contactPhone: "",
      maxCapacity: "",
      occurrences: [] as { startTime?: string; endTime?: string; location?: string }[],
    };
    let ok = true;

    if (!formData.name.trim()) {
      errs.name = "Event Name is required.";
      ok = false;
    }
    if (!formData.description.trim()) {
      errs.description = "Description is required.";
      ok = false;
    }
    if (!formData.location.trim()) {
      errs.location = "Main Event Location is required.";
      ok = false;
    }
    if (!formData.googleMapsLink.trim()) {
      errs.googleMapsLink = "Google Maps Link is required.";
      ok = false;
    } else if (!/^https?:\/\//i.test(formData.googleMapsLink)) {
      errs.googleMapsLink = "Must be a valid URL (start with http/https).";
      ok = false;
    }
    if (!formData.contactEmail.trim()) {
      errs.contactEmail = "Contact Email is required.";
      ok = false;
    } else if (!validateEmail(formData.contactEmail)) {
      errs.contactEmail = "Invalid email format for contact email.";
      ok = false;
    }
    if (!formData.contactPhone.trim()) {
      errs.contactPhone = "Contact Phone is required.";
      ok = false;
    } else if (!validatePhone(formData.contactPhone)) {
      errs.contactPhone = "Invalid phone number format for contact phone.";
      ok = false;
    }

    if (formData.maxCapacity) {
      const n = Number(formData.maxCapacity);
      if (!Number.isFinite(n) || n <= 0) {
        errs.maxCapacity = "Max Capacity must be a positive number.";
        ok = false;
      }
    }

    if (formData.occurrences.length === 0) {
      errs.occurrences[0] = { startTime: "At least one event occurrence is required." };
      ok = false;
    } else {
      formData.occurrences.forEach((occ, i) => {
        const oe: { startTime?: string; endTime?: string; location?: string } = {};
        if (!occ.startTime) {
          oe.startTime = "Start Time is required.";
          ok = false;
        }
        if (occ.startTime && occ.endTime) {
          // String compare by Date just to ensure not reversed; still no tz conversion on save
          const st = new Date(occ.startTime);
          const et = new Date(occ.endTime);
          if (!isNaN(st.getTime()) && !isNaN(et.getTime()) && et < st) {
            oe.endTime = "End Time cannot be before Start Time.";
            ok = false;
          }
        }
        errs.occurrences[i] = oe;
      });
    }

    setErrors(errs);
    setButtonDisabled(!ok || formData.occurrences.some((o) => !o.startTime));
    return ok;
  }, [formData]);

  useEffect(() => {
    if (!loading) handleValidation();
  }, [formData, loading, handleValidation]);

  /* ---------------- Occurrence controls ---------------- */
  const handleOccurrenceChange = (
    index: number,
    field: keyof EventOccurrenceFormData,
    value: string
  ) => {
    const next = [...formData.occurrences];
    next[index] = { ...next[index], [field]: value };
    setFormData({ ...formData, occurrences: next });
  };

  const addOccurrence = () => {
    setFormData((prev) => ({
      ...prev,
      occurrences: [...prev.occurrences, { startTime: "", endTime: "", location: "" }],
    }));
  };

  const removeOccurrence = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      occurrences: prev.occurrences.filter((_, i) => i !== index),
    }));
  };

  /* ---------------- Submit (PUT) ---------------- */
  const onUpdateEvent = async () => {
    setApiError("");
    if (!handleValidation()) return;

    try {
      setSaving(true);

      // Send exactly what user typed; backend should persist as provided.
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        location: formData.location.trim(),
        googleMapsLink: formData.googleMapsLink.trim(),
        contactEmail: formData.contactEmail.trim(),
        contactPhone: formData.contactPhone.trim(),
        maxCapacity: formData.maxCapacity ? parseInt(formData.maxCapacity, 10) : null,
        occurrences: formData.occurrences.map((o) => ({
          id: o.id,
          startTime: o.startTime,         // e.g. "2025-06-19T15:00" (no tz conversion)
          endTime: o.endTime || null,     // e.g. "2025-06-19T16:45" or null
          location: o.location || null,
        })),
      };

      const res = await axiosInstance.put(`/api/events/${id}`, payload);
      toast.success("Event updated successfully!");
      const eid = res.data?.id || id;
      router.push(`/events/${eid}`);
    } catch (error: any) {
      console.error("Event update failed", error);
      const message =
        error.response?.data?.error ||
        error.message ||
        "An unexpected error occurred during update.";
      setApiError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  /* ---------------- UI ---------------- */
  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
        <div className="text-xl font-semibold text-black">Loading Event...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8 flex flex-col items-center">
      <div className="z-10 w-full max-w-3xl overflow-hidden rounded-2xl border border-gray-100 shadow-xl">
        <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 bg-white px-4 py-6 pt-8 text-center sm:px-8">
          <h3 className="text-xl font-semibold text-black">Edit Event</h3>
          <p className="text-sm text-gray-500">Update the details for this event.</p>
        </div>

        <div className="flex flex-col space-y-4 px-8 pt-4">
          {apiError && (
            <div className="p-2 rounded-md bg-red-100 border border-red-400 text-red-700 text-center text-sm">
              {apiError}
            </div>
          )}
        </div>

        <div className="flex flex-col space-y-4 px-8 pb-8 pt-4">
          {/* Group 1: Basic Event Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Event Name <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="e.g., Annual Tech Summit"
                required
                className={`mt-1 block w-full appearance-none rounded-md text-black border ${
                  errors.name ? "border-red-500" : "border-gray-300"
                } px-3 py-2 placeholder-gray-400 shadow-sm focus:border-black focus:outline-none focus:ring-black sm:text-sm`}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                value={formData.name}
              />
              {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                Main Event Location <span className="text-red-500">*</span>
              </label>
              <input
                id="location"
                name="location"
                type="text"
                placeholder="e.g., Convention Center, Online"
                required
                className={`mt-1 block w-full appearance-none rounded-md text-black border ${
                  errors.location ? "border-red-500" : "border-gray-300"
                } px-3 py-2 placeholder-gray-400 shadow-sm focus:border-black focus:outline-none focus:ring-black sm:text-sm`}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                value={formData.location}
              />
              {errors.location && <p className="mt-1 text-sm text-red-500">{errors.location}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              name="description"
              placeholder="Brief description of the event"
              rows={3}
              required
              className={`mt-1 block w-full appearance-none rounded-md text-black border ${
                errors.description ? "border-red-500" : "border-gray-300"
              } px-3 py-2 placeholder-gray-400 shadow-sm focus:border-black focus:outline-none focus:ring-black sm:text-sm`}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              value={formData.description}
            />
            {errors.description && <p className="mt-1 text-sm text-red-500">{errors.description}</p>}
          </div>

          {/* Group 2: Contact and Map Links */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="googleMapsLink" className="block text-sm font-medium text-gray-700 mb-1">
                Google Maps Link <span className="text-red-500">*</span>
              </label>
              <input
                id="googleMapsLink"
                name="googleMapsLink"
                type="url"
                placeholder="e.g., https://goo.gl/maps/..."
                required
                className={`mt-1 block w-full appearance-none rounded-md text-black border ${
                  errors.googleMapsLink ? "border-red-500" : "border-gray-300"
                } px-3 py-2 placeholder-gray-400 shadow-sm focus:border-black focus:outline-none focus:ring-black sm:text-sm`}
                onChange={(e) => setFormData({ ...formData, googleMapsLink: e.target.value })}
                value={formData.googleMapsLink}
              />
              {errors.googleMapsLink && (
                <p className="mt-1 text-sm text-red-500">{errors.googleMapsLink}</p>
              )}
            </div>

            <div>
              <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700 mb-1">
                Contact Email <span className="text-red-500">*</span>
              </label>
              <input
                id="contactEmail"
                name="contactEmail"
                type="email"
                placeholder="e.g., info@yourevent.com"
                required
                className={`mt-1 block w-full appearance-none rounded-md text-black border ${
                  errors.contactEmail ? "border-red-500" : "border-gray-300"
                } px-3 py-2 placeholder-gray-400 shadow-sm focus:border-black focus:outline-none focus:ring-black sm:text-sm`}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                value={formData.contactEmail}
              />
              {errors.contactEmail && <p className="mt-1 text-sm text-red-500">{errors.contactEmail}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="contactPhone" className="block text-sm font-medium text-gray-700 mb-1">
                Contact Phone <span className="text-red-500">*</span>
              </label>
              <input
                id="contactPhone"
                name="contactPhone"
                type="tel"
                placeholder="e.g., +1234567890"
                required
                className={`mt-1 block w-full appearance-none rounded-md text-black border ${
                  errors.contactPhone ? "border-red-500" : "border-gray-300"
                } px-3 py-2 placeholder-gray-400 shadow-sm focus:border-black focus:outline-none focus:ring-black sm:text-sm`}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                value={formData.contactPhone}
              />
              {errors.contactPhone && <p className="mt-1 text-sm text-red-500">{errors.contactPhone}</p>}
            </div>

            <div>
              <label htmlFor="maxCapacity" className="block text-sm font-medium text-gray-700 mb-1">
                Max Capacity (Optional)
              </label>
              <input
                id="maxCapacity"
                name="maxCapacity"
                type="number"
                placeholder="e.g., 500"
                min="1"
                className={`mt-1 block w-full appearance-none rounded-md text-black border ${
                  errors.maxCapacity ? "border-red-500" : "border-gray-300"
                } px-3 py-2 placeholder-gray-400 shadow-sm focus:border-black focus:outline-none focus:ring-black sm:text-sm`}
                onChange={(e) => setFormData({ ...formData, maxCapacity: e.target.value })}
                value={formData.maxCapacity}
              />
              {errors.maxCapacity && <p className="mt-1 text-sm text-red-500">{errors.maxCapacity}</p>}
            </div>
          </div>

          {/* Event Occurrences */}
          <div className="mt-6 border-t border-gray-200 pt-6">
            <h4 className="text-lg font-semibold text-black mb-4">
              Event Occurrences <span className="text-red-500">*</span>
            </h4>

            {formData.occurrences.map((occ, index) => (
              <div key={index} className="space-y-3 mb-4 p-4 border border-gray-200 rounded-md bg-gray-50">
                <p className="text-sm font-medium text-gray-700">Occurrence {index + 1}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor={`startTime-${index}`} className="block text-xs font-medium text-gray-600 mb-1">
                      Start Date & Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      id={`startTime-${index}`}
                      type="datetime-local"
                      required
                      className={`mt-1 block w-full appearance-none rounded-md text-black border ${
                        errors.occurrences[index]?.startTime ? "border-red-500" : "border-gray-300"
                      } px-3 py-2 shadow-sm focus:border-black focus:outline-none focus:ring-black sm:text-sm`}
                      onChange={(e) => handleOccurrenceChange(index, "startTime", e.target.value)}
                      value={occ.startTime}
                    />
                    {errors.occurrences[index]?.startTime && (
                      <p className="mt-1 text-sm text-red-500">{errors.occurrences[index]?.startTime}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor={`endTime-${index}`} className="block text-xs font-medium text-gray-600 mb-1">
                      End Date & Time (Optional)
                    </label>
                    <input
                      id={`endTime-${index}`}
                      type="datetime-local"
                      className={`mt-1 block w-full appearance-none rounded-md text-black border ${
                        errors.occurrences[index]?.endTime ? "border-red-500" : "border-gray-300"
                      } px-3 py-2 shadow-sm focus:border-black focus:outline-none focus:ring-black sm:text-sm`}
                      onChange={(e) => handleOccurrenceChange(index, "endTime", e.target.value)}
                      value={occ.endTime}
                    />
                    {errors.occurrences[index]?.endTime && (
                      <p className="mt-1 text-sm text-red-500">{errors.occurrences[index]?.endTime}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor={`occLocation-${index}`} className="block text-xs font-medium text-gray-600 mb-1">
                    Specific Location (Optional)
                  </label>
                  <input
                    id={`occLocation-${index}`}
                    type="text"
                    placeholder="e.g., Room 101, Online Link"
                    className={`mt-1 block w-full appearance-none rounded-md text-black border ${
                      errors.occurrences[index]?.location ? "border-red-500" : "border-gray-300"
                    } px-3 py-2 placeholder-gray-400 shadow-sm focus:border-black focus:outline-none focus:ring-black sm:text-sm`}
                    onChange={(e) => handleOccurrenceChange(index, "location", e.target.value)}
                    value={occ.location}
                  />
                  {errors.occurrences[index]?.location && (
                    <p className="mt-1 text-sm text-red-500">{errors.occurrences[index]?.location}</p>
                  )}
                </div>

                {formData.occurrences.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeOccurrence(index)}
                    className="mt-2 text-sm text-red-600 hover:underline"
                  >
                    Remove Occurrence
                  </button>
                )}
              </div>
            ))}

            {errors.occurrences.length === 0 && formData.occurrences.length === 0 && (
              <p className="mt-1 text-sm text-red-500">At least one event occurrence is required.</p>
            )}

            <button
              type="button"
              onClick={addOccurrence}
              className="mt-4 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
            >
              Add Another Occurrence
            </button>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex flex-col space-y-4 px-8 pb-8">
          <button
            onClick={onUpdateEvent}
            disabled={buttonDisabled || saving}
            className={`flex h-10 w-full items-center justify-center rounded-md border text-sm transition-all focus:outline-none ${
              buttonDisabled || saving ? "bg-gray-400 cursor-not-allowed text-white" : "bg-black text-white hover:bg-gray-800"
            }`}
          >
            {saving ? (
              <>
                <svg
                  className="animate-spin mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving…
              </>
            ) : (
              "Save Changes"
            )}
            <span aria-live="polite" className="sr-only" role="status">
              {saving ? "Saving" : "Submit form"}
            </span>
          </button>

          <p className="text-center text-sm text-gray-600">
            <Link href={`/events`} className="font-semibold text-black hover:underline">
              Cancel and go back
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
