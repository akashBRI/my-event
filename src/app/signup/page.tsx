"use client";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar"; // Adjust path if needed
import { useRouter } from "next/navigation";
import axios, { AxiosError } from "axios";
import { toast } from "react-hot-toast";

// Define an interface for the expected structure of your API error response data
interface ErrorResponseData {
    error?: string;
    message?: string;
    // Add any other properties you might expect in your API error responses
}

export default function SignupPage() {
    const router = useRouter();
    const [user, setUser] = useState({
        email: "",
        password: "",
        role: "", // Default role for new signups
    });
    const [buttonDisabled, setButtonDisabled] = useState(true);
    const [loading, setLoading] = useState(false);
    const [apiError, setApiError] = useState(""); // NEW STATE FOR API ERROR

    // State to hold validation errors
    const [formErrors, setFormErrors] = useState({
        email: "",
        password: "",
        role: "",
    });

    // Type guard for AxiosError
    function isAxiosError(error: unknown): error is AxiosError {
        return (error as AxiosError).isAxiosError !== undefined;
    }

    // Client-side Form Validation Function
    const validateForm = () => {
        let errors = { email: "", password: "", role: "" };
        let isValid = true;

        // Email validation
        if (!user.email) {
            errors.email = "Email is required.";
            isValid = false;
        } else if (!/\S+@\S+\.\S+/.test(user.email)) { // Basic email regex
            errors.email = "Email is invalid.";
            isValid = false;
        }

        // Password validation
        if (!user.password) {
            errors.password = "Password is required.";
            isValid = false;
        } else if (user.password.length < 5) { // Minimum 6 characters
            errors.password = "Password must be at least 5 characters.";
            isValid = false;
        }

        // Role validation
        if (!user.role) {
            errors.role = "Role is required."; // Should rarely hit if default is 'user'
            isValid = false;
        }

        setFormErrors(errors);
        return isValid;
    };

    const onSignup = async () => {
        setApiError(""); // Clear any previous API errors before a new attempt
        setFormErrors({ email: "", password: "", role: "" }); // Clear form errors as well

        // Run client-side validation first
        if (!validateForm()) {
            toast.error("Please correct the form errors.");
            return;
        }

        try {
            setLoading(true);
            const response = await axios.post("/api/users/signup", user);
            console.log("Signup success", response.data);
            toast.success("Signup successful! Please check your email to verify your account.");
        } catch (error: unknown) {
            console.error("Signup failed:", error);
            let errorMessage = "Signup failed.";

            if (isAxiosError(error) && error.response) {
                const responseData = error.response.data;
                if (typeof responseData === 'object' && responseData !== null) {
                    const errorData = responseData as ErrorResponseData;
                    if (errorData.error) {
                        errorMessage = errorData.error;
                    } else if (errorData.message) {
                        errorMessage = errorData.message;
                    }
                }
            } else if (error instanceof Error) {
                errorMessage = error.message;
            }

            setApiError(errorMessage); // Set the API error state
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user.email.length > 0 && user.password.length > 0 && user.role.length > 0) {
            setButtonDisabled(false);
        } else {
            setButtonDisabled(true);
        }
    }, [user]);

    return (
         <div className="flex flex-col min-h-screen bg-gray-50">
                    <Navbar />
        
                    <main className="flex-grow flex flex-col items-center justify-center py-6 px-4">
                <div className="z-10 w-full max-w-md overflow-hidden rounded-2xl border border-gray-100 shadow-xl bg-white p-6">
                <h2 className="text-xl font-semibold text-center text-black mb-4 mt-2">
                    ADD USER
                </h2>
                <hr className="mb-6" />

                {/* API Error Display */}
                {apiError && (
                    <div className="mb-4 p-2 rounded-md bg-red-100 border border-red-400 text-red-700 text-center text-sm">
                        {apiError}
                    </div>
                )}

                <form onSubmit={(e) => { e.preventDefault(); onSignup(); }} className="space-y-5  pb-2">

                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                            Email:
                        </label>
                        <input
                            className={`mt-1 block w-full rounded-md text-black border ${formErrors.email ? 'border-red-500' : 'border-gray-300'} shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2`}
                            id="email"
                            type="email"
                            value={user.email}
                            onChange={(e) => setUser({ ...user, email: e.target.value })}
                            placeholder="email"
                            onBlur={validateForm}
                        />
                        {formErrors.email && (
                            <p className="mt-1 text-sm text-red-500">{formErrors.email}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                            Password:
                        </label>
                        <input
                            className={`mt-1 block w-full rounded-md text-black border ${formErrors.password ? 'border-red-500' : 'border-gray-300'} shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2`}
                            id="password"
                            type="password"
                            value={user.password}
                            onChange={(e) => setUser({ ...user, password: e.target.value })}
                            placeholder="password"
                            onBlur={validateForm}
                        />
                        {formErrors.password && (
                            <p className="mt-1 text-sm text-red-500">{formErrors.password}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                            Select Role:
                        </label>
                        <select
                            className={`mt-1 block w-full rounded-md text-black border ${formErrors.role ? 'border-red-500' : 'border-gray-300'} shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2`}
                            id="role"
                            value={user.role}
                            onChange={(e) => setUser({ ...user, role: e.target.value })}
                            onBlur={validateForm}
                        >
                            <option value=""></option>
                           <option value="admin">Admin</option>
                            <option value="role1">Role 1</option>
                            <option value="role2">Role 2</option>
                            <option value="role3">Role 3</option>
                        </select>
                        {formErrors.role && (
                            <p className="mt-1 text-sm text-red-500">{formErrors.role}</p>
                        )}
                    </div>

                    <button
                        onClick={onSignup}
                        className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${buttonDisabled || loading ? "bg-gray-400 cursor-not-allowed" : "bg-black hover:bg-gray-800"}`}
                        disabled={buttonDisabled || loading}
                    >
                        {loading ? (
                            <svg
                                className="animate-spin ml-2 h-4 w-4 text-white"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                            >
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                />
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                />
                            </svg>
                        ) : (
                            "REGISTER"
                        )}
                    </button>

                   
                </form>
            </div>

        </main>

        </div>
    );
}