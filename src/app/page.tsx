"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast'; // Assuming you have react-hot-toast installed

// IMPORTANT: In a real application, this PIN verification should be handled on a secure backend.
// Hardcoding a PIN in client-side code is HIGHLY INSECURE and should NEVER be done in production.
const SECRET_DASHBOARD_PIN = "0000"; // Placeholder PIN for demonstration

export default function DashboardPage() {
  const [pin, setPin] = useState('');
  const [accessGranted, setAccessGranted] = useState(false);
  const [pinError, setPinError] = useState('');
  const [loading, setLoading] = useState(false);

  // Check for stored access status (e.g., in session storage)
  useEffect(() => {
    const storedAccess = sessionStorage.getItem('dashboardAccess');
    if (storedAccess === 'granted') {
      setAccessGranted(true);
    }
  }, []);

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPin(e.target.value);
    setPinError(''); // Clear error on change
  };

  const handlePinSubmit = async () => {
    setLoading(true);
    setPinError('');

    // Simulate an asynchronous verification (like an API call)
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay

    if (pin === SECRET_DASHBOARD_PIN) {
      setAccessGranted(true);
      sessionStorage.setItem('dashboardAccess', 'granted'); // Store access for the session
      toast.success("Access granted!");
    } else {
      setPinError("Invalid PIN. Please try again.");
      toast.error("Invalid PIN.");
      setAccessGranted(false);
    }
    setLoading(false);
  };

  if (!accessGranted) {
    return (
      <div className="flex h-screen w-screen items-center justify-center p-4 bg-gray-50">
        <div className="w-full max-w-sm bg-white rounded-xl shadow-2xl overflow-hidden p-8 text-gray-800"
             style={{ fontFamily: '"Inter", sans-serif' }}>
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-blue-800 mb-2">Dashboard Access</h1>
            <p className="text-sm text-gray-600">Please enter the access PIN to proceed.</p>
          </div>
          <div className="space-y-4">
            <div>
              <label htmlFor="pin" className="sr-only">PIN Code</label>
              <input
                id="pin"
                type="password" // Use type="password" for sensitive input
                placeholder="Enter PIN"
                className={`w-full rounded-md border ${pinError ? 'border-red-500' : 'border-gray-300'} px-4 py-2 text-lg text-center shadow-sm focus:border-blue-500 focus:ring-blue-500`}
                value={pin}
                onChange={handlePinChange}
                disabled={loading}
              />
              {pinError && <p className="mt-2 text-sm text-red-500 text-center">{pinError}</p>}
            </div>
            <button
              onClick={handlePinSubmit}
              disabled={loading || pin.length === 0}
              className={`w-full py-2 px-4 rounded-md text-white font-semibold transition-colors ${loading || pin.length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {loading ? (
                <svg
                  className="animate-spin h-5 w-5 mx-auto text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : 'Access Dashboard'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render the actual dashboard content if access is granted
  return (
    <div className="min-h-screen w-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden p-8 sm:p-12 text-gray-800"
           style={{ fontFamily: '"Inter", sans-serif' }}>

        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-blue-800 leading-tight">
            Event Management Dashboard
          </h1>
          <p className="text-md mt-2 text-gray-600">
            Navigate through various sections of your event application.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Link to Create Event Page */}
          <Link target='_blank' href="/events/create" className="group block p-6 bg-blue-50 hover:bg-blue-100 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105">
            <h2 className="text-xl font-semibold text-blue-700 group-hover:text-blue-900 mb-2">
              Create New Event
            </h2>
            <p className="text-gray-600 group-hover:text-gray-700">
              Set up a new event, define its details, dates, and locations.
            </p>
          </Link>

          {/* Link to Events List Page */}
          <Link target='_blank' href="/events" className="group block p-6 bg-green-50 hover:bg-green-100 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105">
            <h2 className="text-xl font-semibold text-green-700 group-hover:text-green-900 mb-2">
              View All Events
            </h2>
            <p className="text-gray-600 group-hover:text-gray-700">
              Browse all available events, public details, and their sessions.
            </p>
          </Link>

          {/* Link to Public Registration Page */}
          <Link target='_blank' href="/public-register" className="group block p-6 bg-purple-50 hover:bg-purple-100 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105">
            <h2 className="text-xl font-semibold text-purple-700 group-hover:text-purple-900 mb-2">
              Public Registration Form
            </h2>
            <p className="text-gray-600 group-hover:text-gray-700">
              Direct link for attendees to register for events.
            </p>
          </Link>

          {/* Link to All Registrations List Page */}
          <Link target='_blank' href="/registrations" className="group block p-6 bg-red-50 hover:bg-red-100 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105">
            <h2 className="text-xl font-semibold text-red-700 group-hover:text-red-900 mb-2">
              All Event Registrations
            </h2>
            <p className="text-gray-600 group-hover:text-gray-700">
              View, manage, and filter all registrations across events.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
