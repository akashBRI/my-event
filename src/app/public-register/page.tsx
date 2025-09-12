"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-hot-toast";
import axiosInstance from "@/lib/api";
import Image from "next/image";
import { MapPin } from "lucide-react";

interface EventOccurrence {
  id: string;
  startTime: string;
  endTime: string | null;
  location: string | null;
  eventId: string;
}

interface Event {
  id: string;
  name: string;
  description: string;
  location: string;
  googleMapsLink: string;
  contactEmail: string;
  contactPhone: string;
  maxCapacity: number | null;
  occurrences: EventOccurrence[];
}

export default function PublicRegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    eventId: "",
    selectedOccurrenceIds: [] as string[], // multi-select
  });

  const [errors, setErrors] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    eventId: "",
    selectedOccurrenceIds: "",
  });

  // show red borders/messages only when a field has been touched OR after submit attempt
  const [touched, setTouched] = useState({
    firstName: false,
    lastName: false,
    email: false,
    phone: false,
    company: false,
    eventId: false,
    selectedOccurrenceIds: false,
  });
  const [submitted, setSubmitted] = useState(false);

  const touch = (name: keyof typeof touched) =>
    setTouched((t) => ({ ...t, [name]: true }));

  const showErr = (name: keyof typeof errors) =>
    (submitted || touched[name]) && Boolean(errors[name]);

  const [apiError, setApiError] = useState("");
  const [buttonDisabled, setButtonDisabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventDetails, setSelectedEventDetails] = useState<Event | null>(null);
  const [initialDataLoading, setInitialDataLoading] = useState(true);

  // Fetch all events and preselect from URL if present
  useEffect(() => {
    const fetchAllEvents = async () => {
      try {
        const response = await axiosInstance.get<Event[]>("/api/events");
        setEvents(response.data);

        const urlEventId = searchParams.get("eventId");
        if (urlEventId) {
          const found = response.data.find((ev) => ev.id === urlEventId);
          if (found) {
            setFormData((p) => ({ ...p, eventId: urlEventId }));
            setSelectedEventDetails(found);
          } else {
            toast.error("Event ID in URL not found. Please select an event.");
          }
        }
      } catch {
        toast.error("Failed to load events. Please try again later.");
      } finally {
        setInitialDataLoading(false);
      }
    };
    fetchAllEvents();
  }, [searchParams]);

  // Refresh selected event details on change
  useEffect(() => {
    const current = events.find((e) => e.id === formData.eventId) || null;
    setSelectedEventDetails(current);
    setFormData((p) => ({ ...p, selectedOccurrenceIds: [] }));
  }, [formData.eventId, events]);

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePhone = (phone: string) => /^[0-9\s\-\+()]+$/.test(phone);

  const handleValidation = useCallback(() => {
    const formErrors = {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      company: "",
      eventId: "",
      selectedOccurrenceIds: "",
    };
    let ok = true;

    if (!formData.firstName.trim()) { formErrors.firstName = "First Name is required."; ok = false; }
    if (!formData.lastName.trim()) { formErrors.lastName = "Last Name is required."; ok = false; }

    if (!formData.email) { formErrors.email = "Email is required."; ok = false; }
    else if (!validateEmail(formData.email)) { formErrors.email = "Invalid email format."; ok = false; }

    if (!formData.phone.trim()) { formErrors.phone = "Phone number is required."; ok = false; }
    else if (!validatePhone(formData.phone)) { formErrors.phone = "Invalid phone number format."; ok = false; }

    if (!formData.company.trim()) { formErrors.company = "Company/Organization is required."; ok = false; }
    if (!formData.eventId) { formErrors.eventId = "Event is required."; ok = false; }
    if (!formData.selectedOccurrenceIds.length) { formErrors.selectedOccurrenceIds = "Please select at least one session."; ok = false; }

    setErrors(formErrors);
    setButtonDisabled(!ok);
    return ok;
  }, [formData]);

  useEffect(() => {
    if (!initialDataLoading) handleValidation();
  }, [formData, initialDataLoading, handleValidation]);

  // Toggle a session checkbox (also mark group as touched)
  const handleToggleOccurrence = (occurrenceId: string) => {
    setTouched((t) => ({ ...t, selectedOccurrenceIds: true }));
    setFormData((prev) => {
      const exists = prev.selectedOccurrenceIds.includes(occurrenceId);
      const next = exists
        ? prev.selectedOccurrenceIds.filter((id) => id !== occurrenceId)
        : [...prev.selectedOccurrenceIds, occurrenceId];
      return { ...prev, selectedOccurrenceIds: next };
    });
  };

  const onRegister = async () => {
    setSubmitted(true);
    setApiError("");
    if (!handleValidation()) return;

    try {
      setLoading(true);
      const payload = { ...formData };
      const res = await axiosInstance.post("/api/public-register", payload);
      toast.success(res.data.message || "Registration successful! Check your email for pass details.");
      // router.push("/events");
    } catch (error: any) {
      const msg =
        error?.response?.data?.error ||
        (error?.request ? "No response from server. Please check your internet connection." : error?.message) ||
        "An unexpected error occurred.";
      setApiError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (initialDataLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
        <div className="text-xl font-semibold text-black">Loading Registration Form...</div>
      </div>
    );
  }

  const formatOccurrenceOneLine = (occ: EventOccurrence) => {
    const s = new Date(occ.startTime);

    const dateStr = s.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const t1 = new Date(occ.startTime).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "UTC", // remove if you don't want to force UTC
    });

    const t2 = occ.endTime
      ? new Date(occ.endTime).toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
          timeZone: "UTC", // remove if you don't want to force UTC
        })
      : null;

    const loc = occ.location && occ.location !== selectedEventDetails?.location ? ` (${occ.location})` : "";

    return `${dateStr} ${t1}${t2 ? ` - ${t2}` : ""}${loc}`;
  };

  return (
    <div
      className="min-h-screen w-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(to bottom right, #071b48, #3b82f6, #ffffff)" }}
    >
      <div
        className="w-full max-w-fit bg-white bg-opacity-95 rounded-xl shadow-2xl overflow-hidden p-6 sm:p-8 text-gray-800"
        style={{ fontFamily: '"Inter", sans-serif' }}
      >
        {/* Header / Branding */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex space-x-1">
            <div className="w-2 h-2 rounded-full bg-blue-600" />
            <div className="w-2 h-2 rounded-full bg-blue-600" />
            <div className="w-2 h-2 rounded-full bg-blue-600" />
          </div>
          <div className="relative h-8 w-48 sm:h-10 sm:w-64">
            <Image
              src="/logo.png"
              alt="Blue Rhine Industries"
              fill
              priority
              sizes="(max-width: 640px) 12rem, 16rem"
              className="object-contain"
            />
          </div>
          <div className="flex space-x-1">
            <div className="w-2 h-2 rounded-full bg-blue-600" />
            <div className="w-2 h-2 rounded-full bg-blue-600" />
            <div className="w-2 h-2 rounded-full bg-blue-600" />
          </div>
        </div>

    
        {selectedEventDetails && (
          <div className="mb-6 text-center">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-blue-800 leading-tight"> {selectedEventDetails.name}</h2>
            <div className="mt-1 inline-flex items-center gap-2 text-gray-700">
              <MapPin className="h-4 w-4 text-blue-600" />
              <span className="font-medium">{selectedEventDetails.location}</span>
            </div>
            
          <p className="text-md mt-2 text-gray-600">Sign up for your preferred session(s)</p>
          </div>
        )}

        {/* API Error */}
        {apiError && (
          <div className="mb-4 p-3 rounded-md bg-red-100 border border-red-400 text-red-700 text-center text-sm">
            {apiError}
          </div>
        )}

        {/* Form */}
        <div className="space-y-6 mb-8 px-4 sm:px-2">
          {/* Personal Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                onBlur={() => touch("firstName")}
                className={`w-full rounded-md border ${showErr("firstName") ? "border-red-500" : "border-gray-300"} px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500`}
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              />
              {showErr("firstName") && <p className="mt-1 text-sm text-red-500">{errors.firstName}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                onBlur={() => touch("lastName")}
                className={`w-full rounded-md border ${showErr("lastName") ? "border-red-500" : "border-gray-300"} px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500`}
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              />
              {showErr("lastName") && <p className="mt-1 text-sm text-red-500">{errors.lastName}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                onBlur={() => touch("email")}
                className={`w-full rounded-md border ${showErr("email") ? "border-red-500" : "border-gray-300"} px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500`}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              {showErr("email") && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                onBlur={() => touch("phone")}
                className={`w-full rounded-md border ${showErr("phone") ? "border-red-500" : "border-gray-300"} px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500`}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
              {showErr("phone") && <p className="mt-1 text-sm text-red-500">{errors.phone}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company/Organization <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              onBlur={() => touch("company")}
              className={`w-full rounded-md border ${showErr("company") ? "border-red-500" : "border-gray-300"} px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500`}
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            />
            {showErr("company") && <p className="mt-1 text-sm text-red-500">{errors.company}</p>}
          </div>

          {/* Event Selector (if not pre-selected) */}
          {!searchParams.get("eventId") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Event <span className="text-red-500">*</span>
              </label>
              <select
                onBlur={() => touch("eventId")}
                className={`w-full rounded-md border ${showErr("eventId") ? "border-red-500" : "border-gray-300"} px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500`}
                value={formData.eventId}
                onChange={(e) => setFormData({ ...formData, eventId: e.target.value })}
              >
                <option value="">-- Choose an Event --</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name}
                  </option>
                ))}
              </select>
              {showErr("eventId") && <p className="mt-1 text-sm text-red-500">{errors.eventId}</p>}
            </div>
          )}

          {/* Occurrence checkboxes (multi-select, one-line + mobile responsive) */}
          {selectedEventDetails && selectedEventDetails.occurrences.length > 0 && (
            <div className="bg-gray-100 p-4 rounded-lg shadow-inner">
              <div className="flex items-baseline justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-800">
                  Select session(s) <span className="text-red-500">*</span>
                </h3>
                <span className="text-sm text-gray-600">
                  Selected: <strong>{formData.selectedOccurrenceIds.length}</strong>
                </span>
              </div>

              <div className="space-y-2">
                {selectedEventDetails.occurrences
                  .slice()
                  .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                  .map((occ) => {
                    const checked = formData.selectedOccurrenceIds.includes(occ.id);
                    return (
                      <label
                        key={occ.id}
                        className={`flex items-center p-2 border rounded-md bg-white cursor-pointer hover:bg-gray-50 ${
                          checked ? "border-blue-400" : "border-gray-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="h-5 w-5 flex-shrink-0 text-blue-600 rounded focus:ring-blue-500"
                          checked={checked}
                          onChange={() => handleToggleOccurrence(occ.id)}
                          onBlur={() => touch("selectedOccurrenceIds")}
                        />
                        {/* One line text with horizontal scroll on narrow screens */}
                        <span className="ml-3 text-xs sm:text-sm text-gray-700 overflow-x-auto whitespace-nowrap w-full min-w-0">
                          {formatOccurrenceOneLine(occ)}
                        </span>
                      </label>
                    );
                  })}
              </div>

              {showErr("selectedOccurrenceIds") && (
                <p className="mt-1 text-sm text-red-500">{errors.selectedOccurrenceIds}</p>
              )}

              {formData.selectedOccurrenceIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, selectedOccurrenceIds: [] }))}
                  className="mt-3 text-sm text-blue-700 hover:underline"
                >
                  Clear selections
                </button>
              )}
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="text-center mb-0 px-4 sm:px-8">
          <button
            onClick={onRegister}
            disabled={buttonDisabled || loading}
            className={`inline-flex items-center justify-center px-12 py-2 border border-transparent text-xl font-bold rounded-full shadow-lg text-white transition-all duration-300 transform ${
              buttonDisabled || loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 hover:scale-105"
            }`}
          >
            {loading ? (
              <svg
                className="animate-spin h-6 w-6 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              "Register Now"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
