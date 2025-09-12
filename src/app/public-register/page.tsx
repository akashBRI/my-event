"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-hot-toast";
import axiosInstance from "@/lib/api";
import Link from "next/link";
import Image from "next/image";

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
    selectedOccurrenceIds: [] as string[], // <-- multiple selection
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

  const [apiError, setApiError] = useState("");
  const [buttonDisabled, setButtonDisabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventDetails, setSelectedEventDetails] = useState<Event | null>(null);
  const [initialDataLoading, setInitialDataLoading] = useState(true);

  // Fetch all events (and optionally preselect from URL)
  useEffect(() => {
    const fetchAllEvents = async () => {
      try {
        const response = await axiosInstance.get<Event[]>("/api/events");
        setEvents(response.data);

        const urlEventId = searchParams.get("eventId");
        if (urlEventId) {
          const foundEvent = response.data.find((ev) => ev.id === urlEventId);
          if (foundEvent) {
            setFormData((prev) => ({ ...prev, eventId: urlEventId }));
            setSelectedEventDetails(foundEvent);
          } else {
            toast.error("Event ID in URL not found. Please select an event.");
          }
        }
      } catch (err) {
        console.error("Failed to fetch events:", err);
        toast.error("Failed to load events. Please try again later.");
      } finally {
        setInitialDataLoading(false);
      }
    };
    fetchAllEvents();
  }, [searchParams]);

  // When event changes, load its details and reset selections
  useEffect(() => {
    const current = events.find((e) => e.id === formData.eventId) || null;
    setSelectedEventDetails(current);
    setFormData((prev) => ({ ...prev, selectedOccurrenceIds: [] })); // clear selections on event change
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
    let isValid = true;

    if (!formData.firstName.trim()) { formErrors.firstName = "First Name is required."; isValid = false; }
    if (!formData.lastName.trim()) { formErrors.lastName = "Last Name is required."; isValid = false; }

    if (!formData.email) { formErrors.email = "Email is required."; isValid = false; }
    else if (!validateEmail(formData.email)) { formErrors.email = "Invalid email format."; isValid = false; }

    if (!formData.phone.trim()) { formErrors.phone = "Phone number is required."; isValid = false; }
    else if (!validatePhone(formData.phone)) { formErrors.phone = "Invalid phone number format."; isValid = false; }

    if (!formData.company.trim()) { formErrors.company = "Company/Organization is required."; isValid = false; }

    if (!formData.eventId) { formErrors.eventId = "Event is required."; isValid = false; }

    if (!formData.selectedOccurrenceIds.length) {
      formErrors.selectedOccurrenceIds = "Please select at least one session.";
      isValid = false;
    }

    setErrors(formErrors);
    setButtonDisabled(!isValid);
    return isValid;
  }, [formData]);

  // Toggle a session checkbox
  const handleToggleOccurrence = (occurrenceId: string) => {
    setFormData((prev) => {
      const exists = prev.selectedOccurrenceIds.includes(occurrenceId);
      const nextIds = exists
        ? prev.selectedOccurrenceIds.filter((id) => id !== occurrenceId)
        : [...prev.selectedOccurrenceIds, occurrenceId];
      return { ...prev, selectedOccurrenceIds: nextIds };
    });
  };

  const onRegister = async () => {
    setApiError("");
    if (!handleValidation()) return;

    try {
      setLoading(true);
      const payload = { ...formData }; // already has selectedOccurrenceIds: string[]
      const response = await axiosInstance.post("/api/public-register", payload);
      toast.success(response.data.message || "Registration successful! Check your email for pass details.");
      // router.push("/events"); // enable if you want redirect
    } catch (error: any) {
      console.error("Public registration failed", error);
      const errorMessage = error.response?.data?.error
        || (error.request ? "No response from server. Please check your internet connection." : error.message)
        || "An unexpected error occurred.";
      setApiError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialDataLoading) handleValidation();
  }, [formData, initialDataLoading, handleValidation]);

  if (initialDataLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
        <div className="text-xl font-semibold text-black">Loading Registration Form...</div>
      </div>
    );
  }

  // Pretty session formatter
  const formatOccurrence = (occ: EventOccurrence) => {
    const start = new Date(occ.startTime);
    const end = occ.endTime ? new Date(occ.endTime) : null;

    const date = start.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const startTime = start.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
    const endTime = end ? end.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }) : "";
    const timeRange = endTime ? `${startTime} - ${endTime}` : startTime;

    const locationPart = occ.location && selectedEventDetails?.location !== occ.location ? occ.location : "";

    return (
      <>
        <span className="block font-semibold">{date} {timeRange}</span>
        {locationPart && <span className="block text-sm text-gray-600">{locationPart}</span>}
      </>
    );
  };

  return (
    <div
      className="min-h-screen w-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(to bottom right, #071b48, #ea6b25)" }}
    >
      <div
        className="w-full max-w-2xl bg-white bg-opacity-95 rounded-xl shadow-2xl overflow-hidden p-8 sm:p-12 text-gray-800"
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

        {/* Title */}
        <div className="text-center mb-8">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-blue-800 leading-tight">Event Registration</h2>
          <p className="text-md mt-2 text-gray-600">Sign up for your preferred session(s).</p>
        </div>

        {/* API Error */}
        {apiError && (
          <div className="mb-4 p-3 rounded-md bg-red-100 border border-red-400 text-red-700 text-center text-sm">
            {apiError}
          </div>
        )}

        {/* Selected Event Summary */}
        {selectedEventDetails && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-center">
            <h4 className="text-lg font-semibold mb-2">You are registering for:</h4>
            <p className="text-md font-bold">{selectedEventDetails.name}</p>
            <p className="text-sm">{selectedEventDetails.description}</p>
            <p className="text-sm">Main Location: {selectedEventDetails.location}</p>
          </div>
        )}

        {/* Form */}
        <div className="space-y-6 mb-8 px-4 sm:px-8">
          {/* Personal Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                id="firstName"
                type="text"
                className={`w-full rounded-md border ${errors.firstName ? "border-red-500" : "border-gray-300"} px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500`}
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              />
              {errors.firstName && <p className="mt-1 text-sm text-red-500">{errors.firstName}</p>}
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                id="lastName"
                type="text"
                className={`w-full rounded-md border ${errors.lastName ? "border-red-500" : "border-gray-300"} px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500`}
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              />
              {errors.lastName && <p className="mt-1 text-sm text-red-500">{errors.lastName}</p>}
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                className={`w-full rounded-md border ${errors.email ? "border-red-500" : "border-gray-300"} px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500`}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                id="phone"
                type="tel"
                className={`w-full rounded-md border ${errors.phone ? "border-red-500" : "border-gray-300"} px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500`}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
              {errors.phone && <p className="mt-1 text-sm text-red-500">{errors.phone}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
              Company/Organization <span className="text-red-500">*</span>
            </label>
            <input
              id="company"
              type="text"
              className={`w-full rounded-md border ${errors.company ? "border-red-500" : "border-gray-300"} px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500`}
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            />
            {errors.company && <p className="mt-1 text-sm text-red-500">{errors.company}</p>}
          </div>

          {/* Event Selector (if not pre-selected) */}
          {!searchParams.get("eventId") && (
            <div>
              <label htmlFor="eventId" className="block text-sm font-medium text-gray-700 mb-1">
                Select Event <span className="text-red-500">*</span>
              </label>
              <select
                id="eventId"
                className={`w-full rounded-md border ${errors.eventId ? "border-red-500" : "border-gray-300"} px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500`}
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
              {errors.eventId && <p className="mt-1 text-sm text-red-500">{errors.eventId}</p>}
            </div>
          )}

          {/* Occurrence checkboxes (multi-select) */}
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
                        className={`flex items-start p-2 border rounded-md bg-white cursor-pointer hover:bg-gray-50 ${
                          checked ? "border-blue-400" : "border-gray-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="h-5 w-5 mt-0.5 text-blue-600 rounded focus:ring-blue-500"
                          checked={checked}
                          onChange={() => handleToggleOccurrence(occ.id)}
                        />
                        <span className="ml-3 text-sm font-medium text-gray-700 flex flex-col">
                          {formatOccurrence(occ)}
                        </span>
                      </label>
                    );
                  })}
              </div>
              {errors.selectedOccurrenceIds && (
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
            className={`inline-flex items-center justify-center px-8 py-4 border border-transparent text-xl font-bold rounded-full shadow-lg text-white transition-all duration-300 transform ${
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
          <p className="mt-4 text-sm text-gray-600">
            <Link href="/events" className="font-semibold text-blue-700 hover:underline">
              Back to Events
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
