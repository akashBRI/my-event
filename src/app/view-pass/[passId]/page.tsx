"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import axios from "axios"; // Use standard axios for public data
import Link from "next/link"; // For navigation

interface EventPassDetails {
  id: string;
  passId: string;
  registrationDate: string;
  status: string;
  qrCodeData: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  event: {
    id: string;
    name: string;
    description: string | null;
    date: string;
    location: string;
  };
}

export default function ViewPassPage({ params }: { params: { passId: string } }) {
  const router = useRouter();
  const { passId } = params;

  const [passDetails, setPassDetails] = useState<EventPassDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrCodeImageSrc, setQrCodeImageSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!passId) {
      setError("No pass ID provided.");
      setLoading(false);
      return;
    }

    const fetchPassDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        // Use the general /api/event-registrations/:id endpoint if you want to reuse it
        // Or create a new public one specific to passId, for now assuming the existing one is ok.
        // For security, a public view pass might require specific endpoint that only returns non-sensitive data
        // For simplicity, we'll try to fetch from my-registrations which might include a check for the current user's registration
        // BUT FOR A PUBLIC VIEW, we need to fetch directly by passId.
        // Let's assume you'll modify the GET /api/event-registrations/:id to allow fetching by passId if it's not a logged-in user's call
        // Or better, create a dedicated public API for viewing pass by ID.
        // For this example, we'll hit GET /api/event-registrations/:id and expect it to work for a public pass ID lookup,
        // which might require a modification to your backend's GET /api/event-registrations/[id] if you want it to be public.
        // Currently, our GET /api/event-registrations/:id is authenticated, so it won't work for public.
        // We will make a slight adjustment to the backend (or create a new route) to allow public access to this specific view.
        // For now, let's assume we can fetch by passId directly if the backend is configured.

        // Temporarily, we'll hit the authenticated endpoint and might adjust backend or route later.
        // The most secure public way is: create /api/public-pass/[passId] which only allows GET.
        // For the sake of completing the frontend, I'll fetch by the `passId` here.
        // **IMPORTANT**: The API route `GET /api/event-registrations/[id]` is currently PROTECTED.
        // For this page to work as a public "view pass" page, you need to either:
        // 1. Create a NEW public API route like `/api/public-event-pass/[passId]`
        // 2. Modify `GET /api/event-registrations/[id]` to handle public requests for passId if no auth token is present.
        // FOR NOW, I'm assuming you have created a public endpoint for passId or you are testing this
        // with an authenticated user (which defeats the "public" purpose but makes the frontend work)

        const response = await axios.get<EventPassDetails>(`/api/event-registrations/${passId}`); // This assumes backend is adjusted
        setPassDetails(response.data);
        if (response.data.qrCodeData) {
            setQrCodeImageSrc(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(response.data.qrCodeData)}`);
        }
      } catch (err: any) {
        console.error("Failed to fetch pass details:", err);
        setError(err.response?.data?.error || "Failed to load pass details. Pass might be invalid or expired.");
        toast.error(err.response?.data?.error || "Failed to load pass details.");
      } finally {
        setLoading(false);
      }
    };

    fetchPassDetails();
  }, [passId]);

  const handleDownloadPDF = () => {
    if (passDetails?.passId) {
      // Direct link to the PDF generation API
      window.open(`/api/event-pass-pdf/${passDetails.passId}`, '_blank');
    } else {
      toast.error("Pass ID not available to generate PDF.");
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
        <div className="text-xl font-semibold text-black">Loading Pass Details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
        <div className="text-xl font-semibold text-red-600">{error}</div>
        <Link href="/public-register" className="ml-4 px-4 py-2 bg-black text-white rounded-md">
            Go to Public Registration
        </Link>
      </div>
    );
  }

  if (!passDetails) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
        <div className="text-xl font-semibold text-gray-700">Pass not found or not available.</div>
        <Link href="/public-register" className="ml-4 px-4 py-2 bg-black text-white rounded-md">
            Go to Public Registration
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8 flex flex-col items-center">
      <div className="w-full max-w-2xl bg-white rounded-2xl border border-gray-100 shadow-xl p-8">
        <h1 className="text-2xl font-semibold text-center text-black mb-6">Your Event Pass</h1>

        <div className="space-y-4 text-gray-700">
          <p><strong>Event:</strong> {passDetails.event.name}</p>
          <p><strong>Description:</strong> {passDetails.event.description || "N/A"}</p>
          <p><strong>Date:</strong> {new Date(passDetails.event.date).toLocaleString()}</p>
          <p><strong>Location:</strong> {passDetails.event.location}</p>
          <p><strong>Registrant:</strong> {passDetails.user.name || passDetails.user.email}</p>
          <p><strong>Pass ID:</strong> {passDetails.passId}</p>
          <p><strong>Registration Status:</strong> <span className={`font-medium ${passDetails.status === 'registered' ? 'text-green-600' : 'text-orange-500'}`}>{passDetails.status.toUpperCase()}</span></p>
        </div>

        {qrCodeImageSrc && (
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-700 mb-2">Scan this QR Code for Check-in:</p>
            <img src={qrCodeImageSrc} alt="QR Code" className="mx-auto border border-gray-300 rounded-md" />
          </div>
        )}

        <div className="mt-8 flex flex-col space-y-4">
          <button
            onClick={handleDownloadPDF}
            className="w-full py-2 px-4 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700 transition-colors flex items-center justify-center"
          >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Download PDF Pass
          </button>
          <Link href="/public-register" className="text-center py-2 px-4 rounded-md bg-gray-200 text-black text-sm hover:bg-gray-300 transition-colors">
            Register for Another Event
          </Link>
          <Link href="/login" className="text-center py-2 px-4 rounded-md bg-gray-200 text-black text-sm hover:bg-gray-300 transition-colors">
            Go to Login
          </Link>
        </div>
      </div>
    </div>
  );
}