"use client";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios, { AxiosError } from "axios";
import { toast } from "react-hot-toast";


export default function LoginPage() {
    const router = useRouter();
    const [user, setUser] = useState({
        email: "",
        password: "",
    });
    const [errors, setErrors] = useState({
        email: "",
        password: "",
    });
    // New state for API response error message
    const [apiError, setApiError] = useState("");

    const [buttonDisabled, setButtonDisabled] = useState(true);
    const [loading, setLoading] = useState(false);

    const validateEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleValidation = () => {
        let formErrors = { email: "", password: "" };
        let isValid = true;

        if (!user.email) {
            formErrors.email = "Email is required.";
            isValid = false;
        } else if (!validateEmail(user.email)) {
            formErrors.email = "Invalid email format.";
            isValid = false;
        }

        if (!user.password) {
            formErrors.password = "Password is required.";
            isValid = false;
        } else if (user.password.length < 5) {
            formErrors.password = "Password must be at least 5 characters.";
            isValid = false;
        }

        setErrors(formErrors);
        setButtonDisabled(!isValid);
        return isValid;
    };

    const onLogin = async () => {
    setApiError("");

    if (!handleValidation()) {
        return;
    }

    try {
        setLoading(true);
        const response = await axios.post("/api/users/login", user);
        console.log("Login success", response.data);
        toast.success("Login success");
        router.push("/profile");
    } catch (error: unknown) { // Keep error as unknown here
        // Type assertion: Treat error as AxiosError
        const axiosError = error as AxiosError;

        console.error("Login failed", axiosError);

        let errorMessage: string; // Declare errorMessage with a type

        if (axiosError.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            errorMessage = (axiosError.response.data as any)?.error || "An unexpected error occurred during login.";
        } else if (axiosError.request) {
            // The request was made but no response was received
            errorMessage = "No response from server. Please check your internet connection.";
        } else {
            // Something happened in setting up the request that triggered an Error
            errorMessage = axiosError.message || "An unexpected error occurred.";
        }

        setApiError(errorMessage);
        toast.error(errorMessage);
    } finally {
        setLoading(false);
    }
};

    useEffect(() => {
        handleValidation();
    }, [user]);

    return (
        <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
            <div className="z-10 w-full max-w-md overflow-hidden rounded-2xl border border-gray-100 shadow-xl">
                <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 bg-white px-4 py-6 pt-8 text-center sm:px-8">
                    <h3 className="text-xl font-semibold text-black">SIGN IN</h3>
                    <p className="text-sm text-gray-500">
                        Use your email and password to sign in
                    </p>
                </div>
                <div className="flex flex-col space-y-4 px-8  pt-4">
                    {apiError && (
                        <div className=" p-2 rounded-md bg-red-100 border border-red-400 text-red-700 text-center text-sm">
                        {apiError}
                    </div>
                    )}

                </div>
                  
                <div className="flex flex-col space-y-4 px-8 pb-8 pt-4">
                    <div>
                        <label htmlFor="email" className="sr-only">Email</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="Email"
                            autoComplete="email"
                            required
                            className={`mt-1 block w-full appearance-none rounded-md text-black border ${errors.email ? 'border-red-500' : 'border-gray-300'} px-3 py-2 placeholder-gray-400 shadow-sm focus:border-black focus:outline-none focus:ring-black sm:text-sm`}
                            onChange={(e) => setUser({ ...user, email: e.target.value })}
                            value={user.email} // Bind value to state
                        />
                        {errors.email && (
                            <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                        )}
                    </div>
                    <div>
                        <label htmlFor="password" className="sr-only">Password</label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            placeholder="Password"
                            autoComplete="current-password"
                            required
                            className={`mt-1 block w-full appearance-none rounded-md text-black border ${errors.password ? 'border-red-500' : 'border-gray-300'} px-3 py-2 placeholder-gray-400 shadow-sm focus:border-black focus:outline-none focus:ring-black sm:text-sm`}
                            onChange={(e) => setUser({ ...user, password: e.target.value })}
                            value={user.password}
                        />
                        {errors.password && (
                            <p className="mt-1 text-sm text-red-500">{errors.password}</p>
                        )}
                    </div>
                </div>
                <div className="flex flex-col space-y-4 px-8 pb-8 ">
                    <button
                        onClick={onLogin}
                        disabled={buttonDisabled || loading} // Disable if validation fails or loading
                        className={`flex h-10 w-full items-center justify-center rounded-md border text-sm transition-all focus:outline-none ${buttonDisabled || loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-black text-white'}`}
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
                        ) : 'SIGN IN'}
                        <span aria-live="polite" className="sr-only" role="status">
                            {loading ? 'Loading' : 'Submit form'}
                        </span>
                    </button>

                </div>
            </div>
        </div>
    );
}