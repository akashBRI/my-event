"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import axiosInstance from "@/lib/api";
import Link from "next/link";

interface EventOccurrence {
  id: string;
  startTime: string;
  endTime: string | null;
  location: string | null;
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
  occurrences: EventOccurrence[];
  registrations: Array<{
    id: string;
    userId: string;
    eventId: string;
    status: string;
  }>;
}

export default function EventDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { id } = params;

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvent = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axiosInstance.get<EventDetail>(`/api/events/${id}`);
        setEvent(response.data);
      } catch (err: any) {
        console.error("Failed to fetch event details:", err);
        setError(err.response?.data?.error || "Failed to load event details.");
        toast.error(err.response?.data?.error || "Failed to load event details.");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchEvent();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-900">
        <div className="text-xl font-semibold text-white">Loading Event Details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-gray-900 text-white">
        <div className="text-xl font-semibold text-red-400">{error}</div>
        <Link href="/events" className="mt-4 px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors">
            Back to Events
        </Link>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-gray-900 text-white">
        <div className="text-xl font-semibold text-gray-400">Event not found.</div>
        <Link href="/events" className="mt-4 px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors">
            Back to Events
        </Link>
      </div>
    );
  }

  // Group occurrences by date for display
  const occurrencesByDate = event.occurrences.reduce((acc, occ) => {
    const dateKey = new Date(occ.startTime).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(occ);
    return acc;
  }, {} as Record<string, EventOccurrence[]>);


  return (
    <div className="min-h-screen w-screen flex items-center justify-center p-4"
         style={{ background: 'linear-gradient(to bottom right, #1a2a6c, #b21f1f, #fdbb2d)' }}> {/* Blue-red-yellow gradient */}
      <div className="w-full max-w-4xl bg-white bg-opacity-95 rounded-xl shadow-2xl overflow-hidden p-8 sm:p-12 text-gray-800"
           style={{ fontFamily: '"Inter", sans-serif' }}>
        {/* Branding Area (Placeholder) */}
        <div className="flex justify-between items-center mb-8">
          {/* Top-left dots */}
          <div className="flex space-x-1">
            <div className="w-2 h-2 rounded-full bg-blue-600"></div>
            <div className="w-2 h-2 rounded-full bg-blue-600"></div>
            <div className="w-2 h-2 rounded-full bg-blue-600"></div>
          </div>
          {/* Logo/Name */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 uppercase">BLUE RHINE INDUSTRIES LLC</h1>
            {/* You can replace this with an image tag for an actual logo */}
            {/* <img src="/path/to/your/logo.png" alt="Blue Rhine Industries Logo" className="h-10 mx-auto" /> */}
          </div>
          {/* Top-right dots */}
          <div className="flex space-x-1">
            <div className="w-2 h-2 rounded-full bg-blue-600"></div>
            <div className="w-2 h-2 rounded-full bg-blue-600"></div>
            <div className="w-2 h-2 rounded-full bg-blue-600"></div>
          </div>
        </div>

        {/* Invitation and Event Title */}
        <div className="text-center mb-8">
          <p className="text-lg text-gray-600 mb-2">YOU ARE INVITED TO</p>
          <h2 className="text-4xl sm:text-4xl font-extrabold text-blue-800 leading-tight">
            {event.name.toUpperCase()}
          </h2>
        </div>

        {/* Description Section */}
        <div className="text-center mb-8 px-4 sm:px-8">
          <p className="text-lg leading-relaxed text-gray-700">
            {event.description || "Join us as we unveil our next chapter in digital experience."}
          </p>
          <p className="text-md mt-4 text-gray-600">
            Experience the tech firsthand, and see how we&apos;re reshaping digital spaces. {/* Fixed apostrophe here */}
          </p>
        </div>

        {/* Occurrences / Sessions Section */}
        {event.occurrences && event.occurrences.length > 0 && (
          <div className="bg-gray-100 p-6 rounded-lg mb-8 shadow-inner">
            <h3 className="text-xl font-semibold text-center text-gray-800 mb-4">Event Sessions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(occurrencesByDate).map(([date, occurrences]) => (
                <div key={date} className="border border-gray-300 rounded-lg p-4 bg-white shadow-sm">
                  <h4 className="text-lg font-bold text-blue-700 mb-2">{date}</h4>
                  <ul className="space-y-2">
                    {occurrences.map((occ, occIndex) => (
                      <li key={occ.id || occIndex} className="text-sm text-gray-700">
                        <span className="font-semibold">
                          {new Date(occ.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {occ.endTime ? ` - ${new Date(occ.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                        </span>
                        {occ.location && occ.location !== event.location ? ` (${occ.location})` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Public Registration Button (replaces QR code) */}
        <div className="text-center mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">REGISTER NOW</h3>
          <Link
            href={`/public-register?eventId=${event.id}`}
            className="inline-flex items-center justify-center px-8 py-2 border border-transparent text-xl font-bold rounded-full shadow-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all duration-300 transform hover:scale-105"
          >
             Click to Join Us !
          </Link>
        </div>

        {/* Additional Event Info (Contact, Capacity, etc.) */}
        <div className="text-center text-sm text-gray-600 space-y-1 mb-0">
          <p>
            <strong>Main Location:</strong> {event.location}
            {event.googleMapsLink && (
              <>
                {" "}
                (<a href={event.googleMapsLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View on Map</a>)
              </>
            )}
          </p>
          {event.contactEmail && (
            <p>
              <strong>Contact:</strong>{" "}
              <a href={`mailto:${event.contactEmail}`} className="text-blue-600 hover:underline">
                {event.contactEmail}
              </a>
              {event.contactPhone && (
                <>
                  {" "}
                  |{" "}
                  <a href={`tel:${event.contactPhone}`} className="text-blue-600 hover:underline">
                    {event.contactPhone}
                  </a>
                </>
              )}
            </p>
          )}
          {event.maxCapacity && (
            <p>
              <strong>Capacity:</strong> {event.registrations?.length || 0} / {event.maxCapacity}{" "}
              {event.registrations?.length >= event.maxCapacity && <span className="text-red-500">(Full)</span>}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
