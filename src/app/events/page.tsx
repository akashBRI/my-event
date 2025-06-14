"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import axiosInstance from "@/lib/api";
// import { useAuth } from "@/context/AuthContext"; // No longer needed for authentication
import Link from "next/link";

interface EventOccurrence {
  id: string;
  startTime: string; // ISO string
  endTime: string | null; // ISO string
  location: string | null; // Optional override
}

interface Event {
  id: string;
  name: string;
  description: string | null;
  // date: string; // Removed - now using occurrences
  location: string; // Main event location
  maxCapacity: number | null;
  occurrences: EventOccurrence[]; // NEW: Array of occurrences
}

export default function EventsPage() {
  const router = useRouter();
  // const { isAuthenticated, loadingAuth } = useAuth(); // Removed useAuth hook for this page
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Removed authentication check and redirection logic for this page
    // if (!loadingAuth && !isAuthenticated) {
    //   router.push("/login");
    //   return;
    // }

    const fetchEvents = async () => {
      setLoading(true);
      setError(null);
      try {
        // API now includes occurrences by default in GET /api/events
        const response = await axiosInstance.get<Event[]>("/api/events");
        setEvents(response.data);
      } catch (err: any) {
        console.error("Failed to fetch events:", err);
        setError(err.response?.data?.error || "Failed to load events.");
        toast.error(err.response?.data?.error || "Failed to load events.");
      } finally {
        setLoading(false);
      }
    };

    // Fetch events without any authentication requirement
    fetchEvents();
  }, []); // Empty dependency array as no auth state is needed

  // Removed authentication loading checks
  // if (loadingAuth || loading) {
  if (loading) { // Only check for component-specific loading state
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
      <div className="w-full max-w-4xl mx-auto bg-white rounded-2xl border border-gray-100 shadow-xl p-8">
        <h1 className="text-2xl font-semibold text-center text-black mb-6">Available Events</h1>

        {/* This button is now always visible as event creation is public */}
        <div className="mb-6 text-center">
            <Link
                href="/events/create"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
            >
                <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Create New Event
            </Link>
        </div>

        {events.length === 0 ? (
          <p className="text-center text-gray-600">No events found.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <div key={event.id} className="border border-gray-200 rounded-lg p-4 shadow-sm bg-gray-50 flex flex-col justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-black mb-2">{event.name}</h2>
                  <p className="text-sm text-gray-600 mb-2">{event.description || "No description."}</p>
                  <p className="text-sm text-gray-700">
                    <strong>Main Location:</strong> {event.location}
                  </p>
                  {event.maxCapacity && (
                    <p className="text-sm text-gray-700">
                      <strong>Capacity:</strong> {event.maxCapacity}
                    </p>
                  )}

                  {/* Display Event Occurrences */}
                  {event.occurrences && event.occurrences.length > 0 && (
                    <div className="mt-2 text-sm text-gray-700">
                      <strong className="block mb-1">Occurrences:</strong>
                      <ul className="list-disc list-inside space-y-1">
                        {event.occurrences.map((occ, occIndex) => (
                          <li key={occ.id || occIndex} className="text-xs">
                            {new Date(occ.startTime).toLocaleString()}
                            {occ.endTime ? ` - ${new Date(occ.endTime).toLocaleTimeString()}` : ''}
                            {occ.location && occ.location !== event.location ? ` (${occ.location})` : ''}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                </div>
                <div className="mt-4">
                  <Link
                    href={`/events/${event.id}`}
                    className="block w-full text-center py-2 px-4 rounded-md bg-black text-white text-sm hover:bg-gray-800 transition-colors"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-8 text-center">
            {/* Link to profile might still require auth, consider changing if entire app is public */}
            <Link href="/profile" className="text-sm text-gray-600 hover:underline">
                Back to Profile
            </Link>
        </div>
      </div>
    </div>
  );
}
