"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import axiosInstance from "@/lib/api";
import Link from "next/link";
import { CalendarDays, MapPin, Users, Mail, Phone, Clock } from 'lucide-react'; // Import icons

interface EventOccurrence {
  id: string;
  startTime: string;
  endTime: string | null;
  location: string | null;
}

interface Event {
  id: string;
  name: string;
  description: string | null;
  location: string;
  googleMapsLink: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  maxCapacity: number | null;
  createdAt: string;
  updatedAt: string;
  occurrences: EventOccurrence[];
  registrations: Array<{
    id: string;
    userId: string;
    eventId: string;
    status: string;
  }>;
}

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      setError(null);
      try {
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

    fetchEvents();
  }, []);

  // Helper to format date for display (e.g., "June 19, 2025")
  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Helper to format time for display (e.g., "03:00 PM")
  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-900">
        <div className="text-xl font-semibold text-white">Loading Events...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-gray-900 text-white">
        <div className="text-xl font-semibold text-red-400">{error}</div>
        <Link href="/dashboard" className="mt-4 px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-4 sm:p-8 md:p-12"
         style={{ fontFamily: '"Inter", sans-serif' }}>
      <div className="max-w-7xl mx-auto py-8">
        <h1 className="text-4xl md:text-5xl font-extrabold text-white text-center mb-10 drop-shadow-lg">
          Upcoming Events
        </h1>

        {events.length === 0 ? (
          <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-8 text-center text-white text-xl shadow-lg">
            No events found. Check back later!
            <Link href="/events/create" className="block mt-6 text-indigo-300 hover:text-indigo-200 underline">
                Create a New Event
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {events.map((event) => (
              <div
                key={event.id}
                className="bg-white rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden"
              >
                <div className="p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-3 leading-tight">
                    {event.name}
                  </h2>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {event.description || "No description provided."}
                  </p>

                  <div className="space-y-2 text-gray-700 text-sm mb-4">
                    <div className="flex items-center">
                      <MapPin size={16} className="text-blue-500 mr-2 flex-shrink-0" />
                      <span>{event.location}</span>
                    </div>

                    {/* Displaying occurrences as dates/times */}
                    {event.occurrences && event.occurrences.length > 0 && (
                      <div className="flex items-start">
                        <CalendarDays size={16} className="text-purple-500 mr-2 flex-shrink-0 mt-1" />
                        <div className="flex flex-col">
                          {event.occurrences
                            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                            .slice(0, 2) // Show up to 2 occurrences directly on the card
                            .map((occ, index) => (
                              <span key={index} className="leading-snug">
                                {formatDate(occ.startTime)}
                                <span className="flex items-center text-xs ml-4">
                                  <Clock size={12} className="inline mr-1" />
                                  {formatTime(occ.startTime)}
                                  {occ.endTime ? ` - ${formatTime(occ.endTime)}` : ''}
                                  {occ.location && occ.location !== event.location ? ` (${occ.location})` : ''}
                                </span>
                              </span>
                            ))}
                          {event.occurrences.length > 2 && (
                            <span className="text-xs text-gray-500 mt-1">
                              +{event.occurrences.length - 2} more sessions
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    {event.maxCapacity && (
                      <div className="flex items-center">
                        <Users size={16} className="text-green-500 mr-2 flex-shrink-0" />
                        <span>
                          Capacity: {event.registrations?.length || 0} / {event.maxCapacity}
                          {event.registrations?.length >= event.maxCapacity && (
                            <span className="text-red-500 font-semibold ml-1">(Full)</span>
                          )}
                        </span>
                      </div>
                    )}
                    {event.contactEmail && (
                      <div className="flex items-center">
                        <Mail size={16} className="text-orange-500 mr-2 flex-shrink-0" />
                        <a href={`mailto:${event.contactEmail}`} className="hover:underline">
                          {event.contactEmail}
                        </a>
                      </div>
                    )}
                    {event.contactPhone && (
                      <div className="flex items-center">
                        <Phone size={16} className="text-teal-500 mr-2 flex-shrink-0" />
                        <a href={`tel:${event.contactPhone}`} className="hover:underline">
                          {event.contactPhone}
                        </a>
                      </div>
                    )}
                  </div>

                  <Link
                    href={`/events/${event.id}`}
                    className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md transition-colors duration-200 mt-4 shadow-lg hover:shadow-xl"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

     
      </div>
    </div>
  );
}
