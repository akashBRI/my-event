"use client";

import axios from "axios";
import Link from "next/link";
import React, { useEffect, useState, useCallback } from "react"; // Added useCallback
import { useRouter, useSearchParams } from "next/navigation"; // Import useSearchParams

export default function VerifyEmailPage() {
    const router = useRouter();
    const searchParams = useSearchParams(); // Get search params

    const [token, setToken] = useState("");
    const [verified, setVerified] = useState(false);
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(true); // New loading state

    // Use useCallback to memoize verifyUserEmail
    const verifyUserEmail = useCallback(async () => {
        try {
            setLoading(true); // Start loading
            const response = await axios.post('/api/verifyemail', { token });
            setVerified(true);
            setError(false); // Clear any previous errors
            console.log("Email verification successful:", response.data);
        } catch (error: any) {
            setError(true);
            console.error("Email verification failed:", error.response?.data?.error || error.message);
            // You might want to show a more specific error message to the user
        } finally {
            setLoading(false); // End loading
        }
    }, [token]); // token is a dependency because verifyUserEmail uses it

    useEffect(() => {
        const urlToken = searchParams.get('token'); // Get token from URL
        if (urlToken) {
            setToken(urlToken);
        }
    }, [searchParams]);

    useEffect(() => {
        if (token.length > 0) {
            verifyUserEmail();
        }
    }, [token, verifyUserEmail]); // verifyUserEmail is a dependency now

    return (
        <div className="flex flex-col items-center justify-center min-h-screen py-2 bg-gray-50">
            <h1 className="text-4xl font-bold text-black mb-6">Verify Your Email</h1>

            {loading && (
                <div className="text-center text-gray-600">
                    <p className="mb-2">Verifying your email. Please wait...</p>
                    <svg
                        className="animate-spin h-8 w-8 text-black mx-auto"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                </div>
            )}

            {verified && !loading && (
                <div className="text-center">
                    <h2 className="text-2xl text-green-600 mb-4">Email Verified!</h2>
                    <p className="text-gray-700 mb-6">Your email has been successfully verified. You can now log in.</p>
                    <Link href="/login" className="px-6 py-3 rounded-lg bg-black text-white text-lg hover:bg-gray-800 transition-colors">
                        Login Now
                    </Link>
                </div>
            )}

            {error && !loading && (
                <div className="text-center">
                    <h2 className="text-2xl text-red-600 mb-4">Verification Failed</h2>
                    <p className="text-gray-700 mb-6">There was an issue verifying your email. The token may be invalid or expired.</p>
                    <Link href="/signup" className="px-6 py-3 rounded-lg bg-black text-white text-lg hover:bg-gray-800 transition-colors">
                        Try Signing Up Again
                    </Link>
                </div>
            )}

            {!token && !loading && !verified && !error && (
                <div className="text-center text-gray-600">
                    <p className="mb-4">No verification token found in the URL. Please ensure you clicked the full link from your email.</p>
                    <Link href="/signup" className="px-6 py-3 rounded-lg bg-black text-white text-lg hover:bg-gray-800 transition-colors">
                        Go to Signup
                    </Link>
                </div>
            )}
        </div>
    );
}
