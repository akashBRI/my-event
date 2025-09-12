"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import axiosInstance from "@/lib/api";
import Link from "next/link";
import Image from "next/image";
// Removed 'Whatsapp' and 'Linkedin' from lucide-react import as they are not exported
import { Copy, Share2 } from 'lucide-react';

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
  const [showShareOptions, setShowShareOptions] = useState(false); // State for share options visibility

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

  // Group occurrences by date for display
  const occurrencesByDate = event?.occurrences.reduce((acc, occ) => {
    const dateKey = new Date(occ.startTime).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(occ);
    return acc;
  }, {} as Record<string, EventOccurrence[]>) || {};

  const handleCopyLink = () => {
    const currentUrl = window.location.href;
    navigator.clipboard.writeText(currentUrl)
      .then(() => toast.success("Event link copied to clipboard!"))
      .catch(() => toast.error("Failed to copy link. Please copy manually."));
  };

  const toggleShareOptions = () => {
    setShowShareOptions(prev => !prev);
  };

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

  const eventShareUrl = `${window.location.origin}/events/${event.id}`;
  const shareText = `Check out this event: ${event.name} at ${event.location}! ${eventShareUrl}`;

  return (
    <div className="min-h-screen w-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(to bottom right, #071b48, #3b82f6, #ffffff)' }}> {/* Blue-red-yellow gradient */}
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
          <div className="flex items-center justify-center">
            {/* Set a predictable box for the logo; Image will scale to fit */}
            <div className="relative h-8 w-48 sm:h-10 sm:w-64">
              <Image
                src="/logo.png"  // <-- put your PNG here (public/branding/bri-logo.png)
                alt="Blue Rhine Industries"
                fill
                priority
                sizes="(max-width: 640px) 12rem, 16rem"
                className="object-contain"
              />
            </div>
            {/* screen-reader text fallback */}
            <span className="sr-only">Blue Rhine Industries</span>
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
          <h2 className="text-4xl sm:text-3xl font-extrabold text-blue-800 leading-tight">
            {event.name.toUpperCase()}
          </h2>
        </div>

        {/* Description Section */}
        <div className="text-center mb-8 px-4 sm:px-8">
          <div className="text-md leading-relaxed text-gray-700 space-y-4">
            {(event.description || "Join us as we unveil our next chapter in digital experience.")
              .trim()
              .split(/\n\s*\n/) // paragraphs
              .map((para, idx) => (
                <p
                  key={idx}
                  className="whitespace-pre-line"
                  style={{ textAlign: "justify", textJustify: "inter-word" }}
                >
                  {para}
                </p>
              ))}
          </div>
        </div>


        {/* Occurrences / Sessions Section (one line per date, Dubai localized) */}
       {event.occurrences && event.occurrences.length > 0 && (
  <div className="bg-gray-100 p-3 rounded-lg mb-8 shadow-inner">
    <h3 className="text-lg font-semibold text-center text-gray-800 mb-4">
      Event Sessions
    </h3>

    <div className="grid grid-flow-row gap-2">
      {Object.entries(occurrencesByDate).map(([date, occurrences]) => {
        // Date heading (no explicit locale / timezone)
        const dateHeading = new Date(occurrences[0].startTime).toLocaleDateString(undefined, {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        // Build a single line for all sessions on this date
        const line = occurrences
          .map((occ) => {
         
 const startTime = new Date(occ.startTime).toLocaleTimeString(undefined, {
                      hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "UTC"
                    });

                    const endTime = new Date(occ.endTime).toLocaleTimeString(undefined, {
                      hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "UTC"
                    });

            const loc =
              occ.location && occ.location !== event.location ? ` (${occ.location})` : "";

            return endTime ? `${startTime} - ${endTime}${loc}` : `${startTime}${loc}`;
          })
          .join(" • ");

        return (
          <div
            key={date}
            className="border border-gray-300 rounded-lg px-3 py-2 bg-white shadow-sm"
          >
            {/* Mobile: stacked & wrapping. md+: one-line with optional horizontal scroll */}
            <div className="text-xs sm:text-sm text-gray-700">
              <div className="flex flex-col md:flex-row md:items-center md:gap-2">
                <span className="font-bold text-blue-700 shrink-0">{dateHeading}:</span>
                <span className="mt-1 md:mt-0 md:whitespace-nowrap md:overflow-x-auto md:[scrollbar-width:none] md:[-ms-overflow-style:none] md:[&::-webkit-scrollbar]:hidden">
                  {line}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
)}


        {/* Action Buttons: Register, Get Link, Share */}
        <div className="text-center mb-8 flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
          <Link
            href={`/public-register?eventId=${event.id}`}
            className="inline-flex items-center justify-center px-8 py-2 border border-transparent text-xl font-bold rounded-full shadow-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all duration-300 transform hover:scale-105"
          >
            Click to Join Us!
          </Link>
          <button
            onClick={handleCopyLink}
            className="inline-flex items-center justify-center px-8 py-2 border border-gray-300 text-lg font-bold rounded-full shadow-lg text-gray-800 bg-white hover:bg-gray-100 focus:outline-none focus:ring-4 focus:ring-gray-300 transition-all duration-300 transform hover:scale-105"
          >
            <Copy size={20} className="mr-2" /> Get Link
          </button>
          <button
            onClick={toggleShareOptions}
            className="inline-flex items-center justify-center px-8 py-2 border border-gray-300 text-lg font-bold rounded-full shadow-lg text-gray-800 bg-white hover:bg-gray-100 focus:outline-none focus:ring-4 focus:ring-gray-300 transition-all duration-300 transform hover:scale-105"
          >
            <Share2 size={20} className="mr-2" /> Share
          </button>
        </div>

        {/* Share Options */}
        {showShareOptions && (
          <div className="mt-4 mb-8 flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-4">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-full transition-colors duration-200 shadow-md"
            >
              {/* Placeholder for WhatsApp icon */}
              <span className="mr-2">WA</span> Share on WhatsApp
            </a>
            <a
              href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(eventShareUrl)}&title=${encodeURIComponent(event.name)}&summary=${encodeURIComponent(event.description || '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center bg-blue-700 hover:bg-blue-800 text-white font-semibold py-2 px-4 rounded-full transition-colors duration-200 shadow-md"
            >
              {/* Placeholder for LinkedIn icon */}
              <span className="mr-2">IN</span> Share on LinkedIn
            </a>
          </div>
        )}

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
