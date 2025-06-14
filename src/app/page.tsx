"use client";
import React from 'react';
import Link from 'next/link';

export default function DashboardPage() {
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
          <Link target='blank' href="/events/create" className="group block p-6 bg-blue-50 hover:bg-blue-100 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105">
            <h2 className="text-xl font-semibold text-blue-700 group-hover:text-blue-900 mb-2">
              Create New Event
            </h2>
            <p className="text-gray-600 group-hover:text-gray-700">
              Set up a new event, define its details, dates, and locations.
            </p>
          </Link>

          {/* Link to Events List Page */}
          <Link target='blank' href="/events" className="group block p-6 bg-green-50 hover:bg-green-100 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105">
            <h2 className="text-xl font-semibold text-green-700 group-hover:text-green-900 mb-2">
              View All Events
            </h2>
            <p className="text-gray-600 group-hover:text-gray-700">
              Browse all available events, public details, and their sessions.
            </p>
          </Link>

          {/* Link to Public Registration Page */}
          <Link target='blank' href="/public-register" className="group block p-6 bg-purple-50 hover:bg-purple-100 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105">
            <h2 className="text-xl font-semibold text-purple-700 group-hover:text-purple-900 mb-2">
              Public Registration Form
            </h2>
            <p className="text-gray-600 group-hover:text-gray-700">
              Direct link for attendees to register for events.
            </p>
          </Link>

          {/* Link to All Registrations List Page */}
          <Link target='blank' href="/registrations" className="group block p-6 bg-red-50 hover:bg-red-100 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105">
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
