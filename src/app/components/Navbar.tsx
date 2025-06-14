// components/Navbar.tsx
"use client"; // This component will use client-side features like router, state, toast

import Link from "next/link";
import { useRouter } from "next/navigation";
import axios, { AxiosError } from "axios"; // Import AxiosError for type safety
import { toast } from "react-hot-toast";
import React, { useState, useEffect } from "react"; // Import useEffect

// Define interfaces for better type safety
interface ErrorResponseData {
    error?: string;
    message?: string;
}

interface UserData {
    id: string;
    email: string;
    role: string;
    isAdmin?: boolean; // Though not directly used for routing, good for clarity
}

export default function Navbar() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [userData, setUserData] = useState<UserData | null>(null); // State to store user data
    const [loadingUserRole, setLoadingUserRole] = useState(true); // State to track user role loading

    // Fetch user details on component mount
    useEffect(() => {
        const getUserDetails = async () => {
            try {
                setLoadingUserRole(true);
                const response = await axios.get("/api/users/me");
                setUserData(response.data.data);
            } catch (error) {
                console.error("Failed to fetch user details for Navbar:", error);
                const axiosError = error as AxiosError<ErrorResponseData>;
                // Don't show a toast for this, as it's just for nav visibility
                // User might not be logged in, which is expected for some pages
                setUserData(null); // Ensure user data is null on error
            } finally {
                setLoadingUserRole(false);
            }
        };

        getUserDetails();
    }, []); // Empty dependency array means this effect runs once on mount

    const logout = async () => {
        try {
            setLoading(true);
            await axios.get("/api/users/logout");
            toast.success("Logout successful");
            setUserData(null); // Clear user data on logout
            router.push("/login"); // Redirect to login page after logout
        } catch (error: any) {
            console.error("Logout failed:", error.message);
            toast.error("Logout failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // Render nothing or a simplified loading state if user role is still loading
    if (loadingUserRole) {
        return (
            <nav className="bg-white p-4 text-black border-b-2 fixed top-0 left-0 right-0 z-50 w-full">
                <div className="container mx-auto flex justify-between items-center">
                    <Link href="/" className="text-xl font-bold">
                        FOREX EXCHANGE BOARD
                    </Link>
                    <div className="space-x-4">
                        {/* Optionally show a loading spinner or placeholder */}
                        <span className="text-gray-500">Loading Navigation...</span>
                    </div>
                </div>
            </nav>
        );
    }

    return (
        <nav className="bg-white p-4 text-black border-b-2 fixed top-0 left-0 right-0 z-50 w-full">
            <div className="container mx-auto flex justify-between items-center">
                <Link href="/" className="text-xl font-bold">
                    FOREX EXCHANGE BOARD
                </Link>
                <div className="space-x-4">
                    {/* Conditional rendering based on user role */}
                    
                    {userData && ( // Show Profile and Logout to any logged-in user
                        <>
                            <Link href="/profile" className="hover:text-gray-500">
                                Dashboard
                            </Link>
                             </>
                    )}
                    {userData?.role === 'admin' && (
                        <>
                            <Link href="/signup" className="hover:text-gray-500">
                                Users
                            </Link>
                            <Link href="/profile/settings" className="hover:text-gray-500">
                                Settings
                            </Link>
                        </>
                    )}
                     {userData && ( // Show Profile and Logout to any logged-in user
                        <>
                            <button
                                onClick={logout}
                                disabled={loading}
                                className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? "Logging Out..." : "Logout"}
                            </button>
                        </>
                    )}
                    {!userData && ( // Show Login/Signup if no user data (not logged in)
                        <>
                             <Link href="/login" className="hover:text-gray-500">
                                Login
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}