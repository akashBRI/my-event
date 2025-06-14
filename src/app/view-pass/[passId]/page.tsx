"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import axios from "axios"; // Using standard axios for public endpoint
import Link from "next/link";
import Image from "next/image"; // Import Next.js Image component

interface EventOccurrence {
  id: string;
  startTime: string;
  endTime: string | null;
  location: string | null;
}

interface EventPassDetails {
  id: string; // Registration ID
  passId: string;
  qrCodeData: string;
  status: string;
  registrationDate: string;
  user: {
    firstName: string | null;
    lastName: string | null;
    email: string;
    phone: string | null;
    company: string | null;
  };
  event: {
    name: string;
    description: string | null;
    location: string;
    googleMapsLink: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    maxCapacity: number | null;
    occurrences: EventOccurrence[]; // Include occurrences
  };
  selectedOccurrences: { // This is the join table data
    id: string;
    occurrence: EventOccurrence; // The actual occurrence details
  }[];
}

export default function ViewPassPage({ params }: { params: { passId: string } }) {
  const router = useRouter();
  const { passId } = params;

  const [passDetails, setPassDetails] = useState<EventPassDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrCodeImgSrc, setQrCodeImgSrc] = useState<string | null>(null);

  useEffect(() => {
    const fetchPassDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get<EventPassDetails>(`/api/view-pass/${passId}`);
        setPassDetails(response.data);
        if (response.data.qrCodeData) {
          setQrCodeImgSrc(`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(response.data.qrCodeData)}`);
        }
      } catch (err: any) {
        console.error("Failed to fetch pass details:", err);
        setError(err.response?.data?.error || "Failed to load event pass.");
        toast.error(err.response?.data?.error || "Failed to load event pass.");
      } finally {
        setLoading(false);
      }
    };

    if (passId) {
      fetchPassDetails();
    }
  }, [passId]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
        <div className="text-xl font-semibold text-black">Loading Pass Details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-gray-50 text-black">
        <div className="text-xl font-semibold text-red-600 mb-4">{error}</div>
        <Link href="/request-pass" className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors">
            Request Your Pass
        </Link>
      </div>
    );
  }

  if (!passDetails) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-gray-50 text-black">
        <div className="text-xl font-semibold text-gray-700 mb-4">Pass not found.</div>
        <Link href="/request-pass" className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors">
            Request Your Pass
        </Link>
      </div>
    );
  }

  const userFullName = `${passDetails.user.firstName || ''} ${passDetails.user.lastName || ''}`.trim();

  return (
    <div className="min-h-screen w-screen flex items-center justify-center p-4"
         style={{ background: 'linear-gradient(to bottom right, #1a2a6c, #b21f1f, #fdbb2d)' }}>
      <div className="w-full max-w-2xl bg-white bg-opacity-95 rounded-xl shadow-2xl overflow-hidden p-8 sm:p-12 text-gray-800"
           style={{ fontFamily: '"Inter", sans-serif' }}>
        {/* Branding Area */}
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

        {/* Pass Title */}
        <div className="text-center mb-8">
          <p className="text-lg text-gray-600 mb-2">YOUR EVENT PASS FOR</p>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-blue-800 leading-tight">
            {passDetails.event.name.toUpperCase()}
          </h2>
        </div>

        {/* Attendee Details */}
        <div className="bg-gray-100 p-6 rounded-lg mb-8 shadow-inner text-center">
          <p className="text-2xl font-bold text-gray-900 mb-2">{userFullName}</p>
          <p className="text-md text-gray-700 mb-1">{passDetails.user.company || 'N/A'}</p>
          <p className="text-md text-gray-700">Pass ID: <span className="font-semibold text-blue-700">{passDetails.passId}</span></p>
          <p className="text-sm text-gray-600 mt-2">Status: <span className={`font-semibold ${passDetails.status === 'registered' ? 'text-blue-600' : 'text-green-600'}`}>{passDetails.status.toUpperCase()}</span></p>
        </div>

        {/* QR Code and Instructions */}
        {qrCodeImgSrc && (
          <div className="text-center mb-8">
            <p className="text-lg font-semibold text-gray-800 mb-4">Scan for Quick Check-in</p>
            <div className="relative mx-auto w-48 h-48 sm:w-64 sm:h-64 rounded-lg shadow-md border-4 border-white overflow-hidden">
              {/* Changed from <img> to <Image /> component */}
              <Image
                src={qrCodeImgSrc}
                alt="QR Code for Event Pass"
                fill // Use fill to make image cover the parent
                style={{ objectFit: 'contain' }} // Maintain aspect ratio
                quality={100} // High quality for QR code
                sizes="(max-width: 640px) 150px, 250px" // Responsive sizes
                className="rounded-md"
              />
            </div>
            <p className="text-sm text-gray-600 mt-4">Present this QR code at the event for entry.</p>
          </div>
        )}

        {/* Selected Session Details */}
        {passDetails.selectedOccurrences && passDetails.selectedOccurrences.length > 0 && (
            <div className="bg-blue-50 p-6 rounded-lg mb-8 shadow-inner text-blue-800">
                <h3 className="text-lg font-semibold text-center mb-3">Your Session Details:</h3>
                {passDetails.selectedOccurrences.map((so: { id: string; occurrence: EventOccurrence }) => {
                    const occ = so.occurrence;
                    const startTime = new Date(occ.startTime);
                    const endTime = occ.endTime ? new Date(occ.endTime) : null;
                    return (
                        <div key={occ.id} className="text-center mb-2 last:mb-0">
                            <p className="font-bold text-lg">
                                {startTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                            </p>
                            <p className="text-md">
                                {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                {endTime ? ` - ${endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                            </p>
                            {occ.location && <p className="text-sm text-blue-700">{occ.location}</p>}
                        </div>
                    );
                })}
            </div>
        )}

        {/* Call to Action: Download PDF Pass */}
        <div className="text-center mb-8">
          <p className="text-lg font-semibold text-gray-800 mb-4">Need a printable pass?</p>
          <a
            href={`/api/event-pass-pdf/${passDetails.passId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-8 py-4 border border-transparent text-xl font-bold rounded-full shadow-lg text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-300 transition-all duration-300 transform hover:scale-105"
          >
            Download PDF Pass
          </a>
        </div>

        {/* Event Details Section */}
        <div className="text-center text-sm text-gray-600 space-y-1 mb-8">
          <p>
            <strong>Event Location:</strong> {passDetails.event.location}
            {passDetails.event.googleMapsLink && (
              <>
                {" "}
                (<a href={passDetails.event.googleMapsLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View on Map</a>)
              </>
            )}
          </p>
          {passDetails.event.contactEmail && (
            <p>
              <strong>Contact:</strong>{" "}
              <a href={`mailto:${passDetails.event.contactEmail}`} className="text-blue-600 hover:underline">
                {passDetails.event.contactEmail}
              </a>
              {passDetails.event.contactPhone && (
                <>
                  {" "}
                  |{" "}
                  <a href={`tel:${passDetails.event.contactPhone}`} className="text-blue-600 hover:underline">
                    {passDetails.event.contactPhone}
                  </a>
                </>
              )}
            </p>
          )}
        </div>

        {/* Footer Link */}
        <div className="text-center mt-6">
            <Link href="/events" className="text-sm text-gray-600 hover:underline">
                Back to All Events
            </Link>
        </div>
      </div>
    </div>
  );
}
