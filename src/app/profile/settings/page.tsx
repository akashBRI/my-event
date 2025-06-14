// app/profile/settings/page.tsx
"use client";

import React from "react";
import Navbar from "../../components/Navbar"; // Adjust path if needed

export default function SettingsPage() {
    return (
        <div className="flex flex-col min-h-screen bg-gray-50">
            <Navbar />
            <main className="flex-grow flex flex-col items-center justify-center py-8 px-4">
                <div className="z-10 w-full max-w-md overflow-hidden rounded-2xl border border-gray-100 shadow-xl bg-white p-6 text-center">
                    <h1 className="text-3xl font-semibold text-black mb-4">
                        Settings
                    </h1>
                    <p className="text-gray-600">This is the settings page.</p>
                    <p className="text-gray-600 mt-2">You can add your settings options here.</p>
                </div>
            </main>
        </div>
    );
}