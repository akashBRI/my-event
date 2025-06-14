"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-hot-toast";
import axiosInstance from "@/lib/api";
import Link from "next/link";

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
    company: "", // Company field
    eventId: "", // Overall event ID
    selectedOccurrenceId: "" as string, // Changed to single string for radio button
  });
  const [errors, setErrors] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "", // Error field for company
    eventId: "",
    selectedOccurrenceId: "", // Changed for single selection error
  });
  const [apiError, setApiError] = useState("");
  const [buttonDisabled, setButtonDisabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventDetails, setSelectedEventDetails] = useState<Event | null>(null);
  const [initialDataLoading, setInitialDataLoading] = useState(true);


  // Fetch all events for the dropdown/occurrence display
  useEffect(() => {
    const fetchAllEvents = async () => {
      try {
        const response = await axiosInstance.get<Event[]>('/api/events');
        setEvents(response.data);

        const urlEventId = searchParams.get('eventId');
        if (urlEventId) {
          const foundEvent = response.data.find(event => event.id === urlEventId);
          if (foundEvent) {
            setFormData(prev => ({ ...prev, eventId: urlEventId }));
            setSelectedEventDetails(foundEvent);
          } else {
            toast.error("Event ID in URL not found. Please select an event manually.");
          }
        }
      } catch (err) {
        console.error("Failed to fetch events for dropdown:", err);
        toast.error("Failed to load events for registration. Please try again later.");
      } finally {
        setInitialDataLoading(false);
      }
    };
    fetchAllEvents();
  }, [searchParams]);

  // Update selected event details when eventId in formData changes
  useEffect(() => {
    const currentSelectedEvent = events.find(event => event.id === formData.eventId);
    setSelectedEventDetails(currentSelectedEvent || null);
    // Clear selected occurrence if event changes
    setFormData(prev => ({ ...prev, selectedOccurrenceId: "" }));
  }, [formData.eventId, events]);


  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string) => {
    const phoneRegex = /^[0-9\s\-\+()]+$/;
    return phoneRegex.test(phone);
  };

  const handleValidation = useCallback(() => { // Wrapped with useCallback
    let formErrors = {
      firstName: "", lastName: "", email: "", phone: "", company: "",
      eventId: "", selectedOccurrenceId: "", // Changed for single selection error
    };
    let isValid = true;

    if (!formData.firstName.trim()) {
      formErrors.firstName = "First Name is required.";
      isValid = false;
    }
    if (!formData.lastName.trim()) {
      formErrors.lastName = "Last Name is required.";
      isValid = false;
    }
    if (!formData.email) {
      formErrors.email = "Email is required.";
      isValid = false;
    } else if (!validateEmail(formData.email)) {
      formErrors.email = "Invalid email format.";
      isValid = false;
    }
    if (!formData.phone.trim()) {
        formErrors.phone = "Phone number is required.";
        isValid = false;
    } else if (!validatePhone(formData.phone)) {
        formErrors.phone = "Invalid phone number format.";
        isValid = false;
    }
    // Company is now required
    if (!formData.company.trim()) {
      formErrors.company = "Company/Organization is required.";
      isValid = false;
    }

    if (!formData.eventId) {
      formErrors.eventId = "Event is required.";
      isValid = false;
    }

    // Validation for single selected occurrence
    if (!formData.selectedOccurrenceId) {
        formErrors.selectedOccurrenceId = "Please select a session.";
        isValid = false;
    }

    setErrors(formErrors);
    setButtonDisabled(!isValid);
    return isValid;
  }, [formData]); // Added formData to useCallback dependencies

  // Handle single occurrence selection for radio buttons
  const handleOccurrenceSelection = (occurrenceId: string) => {
    setFormData(prev => ({ ...prev, selectedOccurrenceId: occurrenceId }));
  };

  const onRegister = async () => {
    setApiError("");

    if (!handleValidation()) {
      return;
    }

    try {
      setLoading(true);
      // Construct payload for API. Send `selectedOccurrenceIds` as an array with one ID.
      const payload = {
        ...formData,
        selectedOccurrenceIds: [formData.selectedOccurrenceId], // Wrap single ID in an array for consistency with backend
      };
      const response = await axiosInstance.post("/api/public-register", payload);
      console.log("Public registration success", response.data);
      toast.success(response.data.message || "Registration successful! Check your email for pass details.");
      // Redirect to events page after successful registration
      router.push("/events");
    } catch (error: any) {
      console.error("Public registration failed", error);

      let errorMessage: string;
      if (error.response) {
        errorMessage = error.response.data?.error || "An unexpected error occurred during registration.";
      } else if (error.request) {
        errorMessage = "No response from server. Please check your internet connection.";
      } else {
        errorMessage = error.message || "An unexpected error occurred.";
      }

      setApiError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialDataLoading) {
      handleValidation();
    }
  }, [formData, initialDataLoading, handleValidation]); // Added handleValidation to useEffect dependencies

  if (initialDataLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
        <div className="text-xl font-semibold text-black">Loading Registration Form...</div>
      </div>
    );
  }

  // Helper to format date and time for session display on two lines
  const formatOccurrence = (occ: EventOccurrence) => {
    const start = new Date(occ.startTime);
    const end = occ.endTime ? new Date(occ.endTime) : null;
    
    // Format date: "Thursday, June 19, 2025"
    const dateFormatted = start.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Format time: "03:00 PM"
    const timeFormatted = start.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    let timeRange = timeFormatted;
    if (end) {
      const endTimeFormatted = end.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      timeRange += ` - ${endTimeFormatted}`;
    }

    const locationPart = occ.location && selectedEventDetails?.location !== occ.location ? occ.location : '';

    return (
      <>
        <span className="block font-semibold">{dateFormatted} {timeRange}</span>
        {locationPart && <span className="block text-sm text-gray-600">{locationPart}</span>}
      </>
    );
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center p-4"
         style={{ background: 'linear-gradient(to bottom right, #1a2a6c, #b21f1f, #fdbb2d)' }}>
      <div className="w-full max-w-2xl bg-white bg-opacity-95 rounded-xl shadow-2xl overflow-hidden p-8 sm:p-12 text-gray-800"
           style={{ fontFamily: '"Inter", sans-serif' }}>
        {/* Header/Branding area */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex space-x-1">
            <div className="w-2 h-2 rounded-full bg-blue-600"></div>
            <div className="w-2 h-2 rounded-full bg-blue-600"></div>
            <div className="w-2 h-2 rounded-full bg-blue-600"></div>
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-gray-900 uppercase">BLUE RHINE INDUSTRIES</h1>
          </div>
          <div className="flex space-x-1">
            <div className="w-2 h-2 rounded-full bg-blue-600"></div>
            <div className="w-2 h-2 rounded-full bg-blue-600"></div>
            <div className="w-2 h-2 rounded-full bg-blue-600"></div>
          </div>
        </div>

        {/* Form Title */}
        <div className="text-center mb-8">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-blue-800 leading-tight">
            Public Event Registration
          </h2>
          <p className="text-md mt-2 text-gray-600">
            Sign up for your preferred session.
          </p>
        </div>

        {/* API Error Display */}
        {apiError && (
          <div className="mb-4 p-3 rounded-md bg-red-100 border border-red-400 text-red-700 text-center text-sm">
            {apiError}
          </div>
        )}

        {/* Selected Event Details (if pre-selected by URL) */}
        {selectedEventDetails && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-center">
            <h4 className="text-lg font-semibold mb-2">You are registering for:</h4>
            <p className="text-md font-bold">{selectedEventDetails.name}</p>
            <p className="text-sm">{selectedEventDetails.description}</p>
            <p className="text-sm">Main Location: {selectedEventDetails.location}</p>
          </div>
        )}

        {/* Form Fields */}
        <div className="space-y-6 mb-8 px-4 sm:px-8">
          {/* Personal Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">First Name <span className="text-red-500">*</span></label>
              <input
                id="firstName" type="text" placeholder="First Name" required
                className={`w-full rounded-md border ${errors.firstName ? 'border-red-500' : 'border-gray-300'} px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500`}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} value={formData.firstName}
              />
              {errors.firstName && <p className="mt-1 text-sm text-red-500">{errors.firstName}</p>}
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">Last Name <span className="text-red-500">*</span></label>
              <input
                id="lastName" type="text" placeholder="Last Name" required
                className={`w-full rounded-md border ${errors.lastName ? 'border-red-500' : 'border-gray-300'} px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500`}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} value={formData.lastName}
              />
              {errors.lastName && <p className="mt-1 text-sm text-red-500">{errors.lastName}</p>}
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
              <input
                id="email" type="email" placeholder="Email" required
                className={`w-full rounded-md border ${errors.email ? 'border-red-500' : 'border-gray-300'} px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500`}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })} value={formData.email}
              />
              {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone <span className="text-red-500">*</span></label>
              <input
                id="phone" type="tel" placeholder="Phone Number" required
                className={`w-full rounded-md border ${errors.phone ? 'border-red-500' : 'border-gray-300'} px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500`}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })} value={formData.phone}
              />
              {errors.phone && <p className="mt-1 text-sm text-red-500">{errors.phone}</p>}
            </div>
          </div>
          <div>
            <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">Company/Organization <span className="text-red-500">*</span></label>
            <input
              id="company" type="text" placeholder="Company/Organization" required
              className={`w-full rounded-md border ${errors.company ? 'border-red-500' : 'border-gray-300'} px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500`}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })} value={formData.company}
            />
            {errors.company && <p className="mt-1 text-sm text-red-500">{errors.company}</p>}
          </div>

          {/* Event Selection (if not pre-selected) */}
          {!searchParams.get('eventId') && (
            <div>
              <label htmlFor="eventId" className="block text-sm font-medium text-gray-700 mb-1">Select Event <span className="text-red-500">*</span></label>
              <select
                id="eventId" required
                className={`w-full rounded-md border ${errors.eventId ? 'border-red-500' : 'border-gray-300'} px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500`}
                onChange={(e) => setFormData({ ...formData, eventId: e.target.value })} value={formData.eventId}
              >
                <option value="">-- Choose an Event --</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>{event.name}</option>
                ))}
              </select>
              {errors.eventId && <p className="mt-1 text-sm text-red-500">{errors.eventId}</p>}
            </div>
          )}

          {/* Occurrences Selection */}
          {selectedEventDetails && selectedEventDetails.occurrences.length > 0 && (
            <div className="bg-gray-100 p-4 rounded-lg shadow-inner">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Which session will you attend? <span className="text-red-500">*</span></h3>
              <div className="space-y-2">
                {selectedEventDetails.occurrences.sort((a,b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()).map(occ => (
                  <label key={occ.id} className="flex items-center p-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name="selectedOccurrence"
                      className="form-radio h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                      checked={formData.selectedOccurrenceId === occ.id}
                      onChange={() => handleOccurrenceSelection(occ.id)}
                    />
                    <span className="ml-3 text-sm font-medium text-gray-700 flex flex-col"> {/* Use flex-col for two lines */}
                      {formatOccurrence(occ)}
                    </span>
                  </label>
                ))}
              </div>
              {errors.selectedOccurrenceId && <p className="mt-1 text-sm text-red-500">{errors.selectedOccurrenceId}</p>}
            </div>
          )}
        </div>

        {/* Register Button */}
        <div className="text-center mb-8 px-4 sm:px-8">
          <button
            onClick={onRegister}
            disabled={buttonDisabled || loading}
            className={`inline-flex items-center justify-center px-8 py-4 border border-transparent text-xl font-bold rounded-full shadow-lg text-white transition-all duration-300 transform ${buttonDisabled || loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 hover:scale-105'}`}
          >
            {loading ? (
              <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            ) : 'Register Now'}
          </button>
        </div>

        {/* Footer Links */}
        <div className="text-center text-sm text-gray-600 space-y-1">
          <p>
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-blue-600 hover:underline">
              Sign in
            </Link>
          </p>
          <p>
            Need your pass again?{" "}
            <Link href="/request-pass" className="font-semibold text-blue-600 hover:underline">
              Request it here
            </Link>
          </p>
          <Link href="/events" className="block mt-4 font-semibold text-gray-600 hover:underline">
            Back to Events List
          </Link>
        </div>
      </div>
    </div>
  );
}
