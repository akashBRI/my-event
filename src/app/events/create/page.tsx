"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import axiosInstance from "@/lib/api";
import Link from "next/link";

interface EventOccurrenceFormData {
  startTime: string; // "YYYY-MM-DDTHH:mm"
  endTime: string; // "YYYY-MM-DDTHH:mm"
  location: string; // Optional override for occurrence location
}

export default function CreateEventPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    location: "",
    googleMapsLink: "",
    contactEmail: "",
    contactPhone: "",
    maxCapacity: "",
    occurrences: [{ startTime: "", endTime: "", location: "" }] as EventOccurrenceFormData[],
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
  const [loading, setLoading] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string) => {
    const phoneRegex = /^[0-9\s\-\+()]+$/;
    return phoneRegex.test(phone);
  };

  const handleValidation = () => {
    let formErrors = {
      name: "",
      description: "",
      location: "",
      googleMapsLink: "",
      contactEmail: "",
      contactPhone: "",
      maxCapacity: "",
      occurrences: [] as { startTime?: string; endTime?: string; location?: string }[],
    };
    let isValid = true;

    if (!formData.name.trim()) {
      formErrors.name = "Event Name is required.";
      isValid = false;
    }
    if (!formData.description.trim()) {
      formErrors.description = "Description is required.";
      isValid = false;
    }
    if (!formData.location.trim()) {
      formErrors.location = "Main Event Location is required.";
      isValid = false;
    }
    if (!formData.googleMapsLink.trim()) {
        formErrors.googleMapsLink = "Google Maps Link is required.";
        isValid = false;
    } else if (!formData.googleMapsLink.startsWith('http')) {
        formErrors.googleMapsLink = "Must be a valid URL (start with http/https).";
        isValid = false;
    }
    if (!formData.contactEmail.trim()) {
        formErrors.contactEmail = "Contact Email is required.";
        isValid = false;
    } else if (!validateEmail(formData.contactEmail)) {
        formErrors.contactEmail = "Invalid email format for contact email.";
        isValid = false;
    }
    if (!formData.contactPhone.trim()) {
        formErrors.contactPhone = "Contact Phone is required.";
        isValid = false;
    } else if (!validatePhone(formData.contactPhone)) {
        formErrors.contactPhone = "Invalid phone number format for contact phone.";
        isValid = false;
    }

    if (formData.maxCapacity && (isNaN(Number(formData.maxCapacity)) || Number(formData.maxCapacity) <= 0)) {
        formErrors.maxCapacity = "Max Capacity must be a positive number.";
        isValid = false;
    }

    if (formData.occurrences.length === 0) {
      formErrors.occurrences[0] = { startTime: "At least one event occurrence is required." };
      isValid = false;
    } else {
      formData.occurrences.forEach((occ, index) => {
        let occErrors: { startTime?: string; endTime?: string; location?: string } = {};
        if (!occ.startTime) {
          occErrors.startTime = "Start Time is required.";
          isValid = false;
        } else {
            const startDate = new Date(occ.startTime);
            if (isNaN(startDate.getTime()) || startDate < new Date()) {
                occErrors.startTime = "Must be a valid future date/time.";
                isValid = false;
            }
        }
        if (occ.endTime && new Date(occ.endTime) < new Date(occ.startTime)) {
            occErrors.endTime = "End Time cannot be before Start Time.";
            isValid = false;
        }
        formErrors.occurrences[index] = occErrors;
      });
    }

    setErrors(formErrors);
    setButtonDisabled(!isValid || formData.occurrences.some(occ => !occ.startTime));
    return isValid;
  };

  const handleOccurrenceChange = (index: number, field: keyof EventOccurrenceFormData, value: string) => {
    const newOccurrences = [...formData.occurrences];
    newOccurrences[index] = { ...newOccurrences[index], [field]: value };
    setFormData({ ...formData, occurrences: newOccurrences });
  };

  const addOccurrence = () => {
    setFormData({
      ...formData,
      occurrences: [...formData.occurrences, { startTime: "", endTime: "", location: "" }],
    });
  };

  const removeOccurrence = (index: number) => {
    const newOccurrences = formData.occurrences.filter((_, i) => i !== index);
    setFormData({ ...formData, occurrences: newOccurrences });
  };

  const onCreateEvent = async () => {
    setApiError("");

    if (!handleValidation()) {
      return;
    }

    try {
      setLoading(true);
      const payload = {
        ...formData,
        maxCapacity: formData.maxCapacity ? parseInt(formData.maxCapacity) : null,
      };
      const response = await axiosInstance.post("/api/events", payload);
      console.log("Event creation success", response.data);
      toast.success("Event created successfully!");
      router.push(`/events/${response.data.id}`);
    } catch (error: any) {
      console.error("Event creation failed", error);

      let errorMessage: string;
      if (error.response) {
        errorMessage = error.response.data?.error || "An unexpected error occurred during event creation.";
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
    handleValidation();
  }, [formData]);

  return (
    <div className="min-h-screen bg-gray-50 p-8 flex flex-col items-center">
      <div className="z-10 w-full max-w-3xl overflow-hidden rounded-2xl border border-gray-100 shadow-xl"> {/* Increased max-w */}
        <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 bg-white px-4 py-6 pt-8 text-center sm:px-8">
          <h3 className="text-xl font-semibold text-black">Create New Event</h3>
          <p className="text-sm text-gray-500">
            Fill in the details to create a new event.
          </p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> {/* Two columns on medium screens */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Event Name <span className="text-red-500">*</span></label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="e.g., Annual Tech Summit"
                required
                className={`mt-1 block w-full appearance-none rounded-md text-black border ${errors.name ? 'border-red-500' : 'border-gray-300'} px-3 py-2 placeholder-gray-400 shadow-sm focus:border-black focus:outline-none focus:ring-black sm:text-sm`}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                value={formData.name}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-500">{errors.name}</p>
              )}
            </div>

            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">Main Event Location <span className="text-red-500">*</span></label>
              <input
                id="location"
                name="location"
                type="text"
                placeholder="e.g., Convention Center, Online"
                required
                className={`mt-1 block w-full appearance-none rounded-md text-black border ${errors.location ? 'border-red-500' : 'border-gray-300'} px-3 py-2 placeholder-gray-400 shadow-sm focus:border-black focus:outline-none focus:ring-black sm:text-sm`}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                value={formData.location}
              />
              {errors.location && (
                <p className="mt-1 text-sm text-red-500">{errors.location}</p>
              )}
            </div>
          </div>

          <div> {/* Full width for description */}
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-red-500">*</span></label>
            <textarea
              id="description"
              name="description"
              placeholder="Brief description of the event"
              rows={3}
              required
              className={`mt-1 block w-full appearance-none rounded-md text-black border ${errors.description ? 'border-red-500' : 'border-gray-300'} px-3 py-2 placeholder-gray-400 shadow-sm focus:border-black focus:outline-none focus:ring-black sm:text-sm`}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              value={formData.description}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-500">{errors.description}</p>
            )}
          </div>

          {/* Group 2: Contact and Map Links */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="googleMapsLink" className="block text-sm font-medium text-gray-700 mb-1">Google Maps Link <span className="text-red-500">*</span></label>
              <input
                id="googleMapsLink"
                name="googleMapsLink"
                type="url"
                placeholder="e.g., https://goo.gl/maps/..."
                required
                className={`mt-1 block w-full appearance-none rounded-md text-black border ${errors.googleMapsLink ? 'border-red-500' : 'border-gray-300'} px-3 py-2 placeholder-gray-400 shadow-sm focus:border-black focus:outline-none focus:ring-black sm:text-sm`}
                onChange={(e) => setFormData({ ...formData, googleMapsLink: e.target.value })}
                value={formData.googleMapsLink}
              />
              {errors.googleMapsLink && (
                <p className="mt-1 text-sm text-red-500">{errors.googleMapsLink}</p>
              )}
            </div>

            <div>
              <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700 mb-1">Contact Email <span className="text-red-500">*</span></label>
              <input
                id="contactEmail"
                name="contactEmail"
                type="email"
                placeholder="e.g., info@yourevent.com"
                required
                className={`mt-1 block w-full appearance-none rounded-md text-black border ${errors.contactEmail ? 'border-red-500' : 'border-gray-300'} px-3 py-2 placeholder-gray-400 shadow-sm focus:border-black focus:outline-none focus:ring-black sm:text-sm`}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                value={formData.contactEmail}
              />
              {errors.contactEmail && (
                <p className="mt-1 text-sm text-red-500">{errors.contactEmail}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="contactPhone" className="block text-sm font-medium text-gray-700 mb-1">Contact Phone <span className="text-red-500">*</span></label>
              <input
                id="contactPhone"
                name="contactPhone"
                type="tel"
                placeholder="e.g., +1234567890"
                required
                className={`mt-1 block w-full appearance-none rounded-md text-black border ${errors.contactPhone ? 'border-red-500' : 'border-gray-300'} px-3 py-2 placeholder-gray-400 shadow-sm focus:border-black focus:outline-none focus:ring-black sm:text-sm`}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                value={formData.contactPhone}
              />
              {errors.contactPhone && (
                <p className="mt-1 text-sm text-red-500">{errors.contactPhone}</p>
              )}
            </div>

            <div>
              <label htmlFor="maxCapacity" className="block text-sm font-medium text-gray-700 mb-1">Max Capacity (Optional)</label>
              <input
                id="maxCapacity"
                name="maxCapacity"
                type="number"
                placeholder="e.g., 500"
                min="1"
                className={`mt-1 block w-full appearance-none rounded-md text-black border ${errors.maxCapacity ? 'border-red-500' : 'border-gray-300'} px-3 py-2 placeholder-gray-400 shadow-sm focus:border-black focus:outline-none focus:ring-black sm:text-sm`}
                onChange={(e) => setFormData({ ...formData, maxCapacity: e.target.value })}
                value={formData.maxCapacity}
              />
              {errors.maxCapacity && (
                <p className="mt-1 text-sm text-red-500">{errors.maxCapacity}</p>
              )}
            </div>
          </div>


          {/* Event Occurrences Section - Remains largely vertical due to dynamic nature */}
          <div className="mt-6 border-t border-gray-200 pt-6">
            <h4 className="text-lg font-semibold text-black mb-4">Event Occurrences <span className="text-red-500">*</span></h4>
            {formData.occurrences.map((occ, index) => (
              <div key={index} className="space-y-3 mb-4 p-4 border border-gray-200 rounded-md bg-gray-50">
                <p className="text-sm font-medium text-gray-700">Occurrence {index + 1}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> {/* Occurrences can also be two columns */}
                  <div>
                    <label htmlFor={`startTime-${index}`} className="block text-xs font-medium text-gray-600 mb-1">Start Date & Time <span className="text-red-500">*</span></label>
                    <input
                      id={`startTime-${index}`}
                      type="datetime-local"
                      required
                      className={`mt-1 block w-full appearance-none rounded-md text-black border ${errors.occurrences[index]?.startTime ? 'border-red-500' : 'border-gray-300'} px-3 py-2 shadow-sm focus:border-black focus:outline-none focus:ring-black sm:text-sm`}
                      onChange={(e) => handleOccurrenceChange(index, 'startTime', e.target.value)}
                      value={occ.startTime}
                    />
                    {errors.occurrences[index]?.startTime && (
                      <p className="mt-1 text-sm text-red-500">{errors.occurrences[index]?.startTime}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor={`endTime-${index}`} className="block text-xs font-medium text-gray-600 mb-1">End Date & Time (Optional)</label>
                    <input
                      id={`endTime-${index}`}
                      type="datetime-local"
                      className={`mt-1 block w-full appearance-none rounded-md text-black border ${errors.occurrences[index]?.endTime ? 'border-red-500' : 'border-gray-300'} px-3 py-2 shadow-sm focus:border-black focus:outline-none focus:ring-black sm:text-sm`}
                      onChange={(e) => handleOccurrenceChange(index, 'endTime', e.target.value)}
                      value={occ.endTime}
                    />
                    {errors.occurrences[index]?.endTime && (
                      <p className="mt-1 text-sm text-red-500">{errors.occurrences[index]?.endTime}</p>
                    )}
                  </div>
                </div> {/* End of grid for occurrence dates */}
                <div> {/* Full width for occurrence location */}
                  <label htmlFor={`occLocation-${index}`} className="block text-xs font-medium text-gray-600 mb-1">Specific Location (Optional)</label>
                  <input
                    id={`occLocation-${index}`}
                    type="text"
                    placeholder="e.g., Room 101, Online Link"
                    className={`mt-1 block w-full appearance-none rounded-md text-black border ${errors.occurrences[index]?.location ? 'border-red-500' : 'border-gray-300'} px-3 py-2 placeholder-gray-400 shadow-sm focus:border-black focus:outline-none focus:ring-black sm:text-sm`}
                    onChange={(e) => handleOccurrenceChange(index, 'location', e.target.value)}
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
        <div className="flex flex-col space-y-4 px-8 pb-8 ">
          <button
            onClick={onCreateEvent}
            disabled={buttonDisabled || loading}
            className={`flex h-10 w-full items-center justify-center rounded-md border text-sm transition-all focus:outline-none ${buttonDisabled || loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-black text-white'}`}
          >
            {loading ? (
              <svg
                className="animate-spin ml-2 h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : 'Create Event'}
            <span aria-live="polite" className="sr-only" role="status">
              {loading ? 'Loading' : 'Submit form'}
            </span>
          </button>
          <p className="text-center text-sm text-gray-600">
            <Link href="/events" className="font-semibold text-black hover:underline">
              Back to Events List
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
