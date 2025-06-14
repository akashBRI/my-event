"use client";

import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar"; // Adjust path if needed
import axios, { AxiosError } from "axios";
import { toast } from "react-hot-toast";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css"; // Ensure CSS is imported

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

// Interface for Term Deposit rates, values will be strings as they come from inputs
interface TermDepositRateRow {
    tenor: string;
    aed: string; // From input, will be converted to number for API
    usd: string; // From input, will be converted to number for API
}

export default function ProfilePage() {
    // User Profile State
    const [userData, setUserData] = useState<UserData>({
        id: "",
        email: "",
        role: "",
    });
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [apiError, setApiError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false); // New state for loader

    // State for the "INDICATIVE FOREIGN EXCHANGE RATE" form inputs
    const [exchangeDate, setExchangeDate] = useState<Date | null>(new Date());
    const [inrSellingRate, setInrSellingRate] = useState<number | ''>('');
    const [exchangeFormErrors, setExchangeFormErrors] = useState({
        exchangeDate: "",
        inrSellingRate: "",
    });

    // States for "INTEREST RATES ON TERM DEPOSITS" form
    const [termDepositDate, setTermDepositDate] = useState<Date | null>(new Date());
    const [termDepositRates, setTermDepositRates] = useState<TermDepositRateRow[]>([
        { tenor: "1 months to below 3 months", aed: "", usd: "" },
        { tenor: "3 months to below 6 months", aed: "", usd: "" },
        { tenor: "6 months to below 12 months", aed: "", usd: "" },
        { tenor: "12 months to below 24 months", aed: "", usd: "" },
        { tenor: "24 months to below 36 months", aed: "", usd: "" },
    ]);
    const [termDepositFormErrors, setTermDepositFormErrors] = useState<Record<string, string>>({});

    // States for "INTEREST RATE ON HOME LOAN" form
    const [homeLoanDate, setHomeLoanDate] = useState<Date | null>(new Date());
    const [fullyVariableRate, setFullyVariableRate] = useState<number | ''>('');
    const [eiborMonths, setEiborMonths] = useState<number | ''>('');
    const [minimumHomeLoanRate, setMinimumHomeLoanRate] = useState<number | ''>('');
    const [homeLoanFormErrors, setHomeLoanFormErrors] = useState({
        homeLoanDate: "",
        fullyVariableRate: "",
        eiborMonths: "",
        minimumHomeLoanRate: "",
    });

    useEffect(() => {
        const getUserDetails = async () => {
            try {
                setLoadingProfile(true);
                setApiError("");
                const response = await axios.get("/api/users/me");
                setUserData(response.data.data);
            } catch (error: any) {
                console.error("Failed to fetch user details:", error);
                const axiosError = error as AxiosError<ErrorResponseData>;
                setApiError(
                    axiosError.response?.data?.error ||
                    axiosError.response?.data?.message ||
                    "Failed to fetch user details."
                );
                toast.error(axiosError.response?.data?.error || axiosError.response?.data?.message || "Failed to fetch user details.");
            } finally {
                setLoadingProfile(false);
            }
        };

        getUserDetails();
    }, []); // Empty dependency array as apiError is no longer needed here

    // Helper to format date toYYYY-MM-DD
    const formatDate = (date: Date | null) => {
        if (!date) return "";
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };

    // Function to reset all fields except dates
    const resetFormFields = (formType: 'all' | 'exchange' | 'termDeposit' | 'homeLoan') => {
        if (formType === 'all' || formType === 'exchange') {
            setInrSellingRate('');
        }
        if (formType === 'all' || formType === 'termDeposit') {
            setTermDepositRates([
                { tenor: "1 months to below 3 months", aed: "", usd: "" },
                { tenor: "3 months to below 6 months", aed: "", usd: "" },
                { tenor: "6 months to below 12 months", aed: "", usd: "" },
                { tenor: "12 months to below 24 months", aed: "", usd: "" },
                { tenor: "24 months to below 36 months", aed: "", usd: "" },
            ]);
        }
        if (formType === 'all' || formType === 'homeLoan') {
            setFullyVariableRate('');
            setEiborMonths('');
            setMinimumHomeLoanRate('');
        }
    };


    // --- Master Submission Handler for Admin View ---
    const handleAllRatesSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true); // Start loading

        // Reset all errors
        setExchangeFormErrors({ exchangeDate: "", inrSellingRate: "" });
        setTermDepositFormErrors({});
        setHomeLoanFormErrors({
            homeLoanDate: "",
            fullyVariableRate: "",
            eiborMonths: "",
            minimumHomeLoanRate: "",
        });

        let allFormsValid = true;
        let currentErrors: typeof exchangeFormErrors = { exchangeDate: "", inrSellingRate: "" };
        let termErrors: Record<string, string> = {};
        let homeLoanErrors: typeof homeLoanFormErrors = {
            homeLoanDate: "",
            fullyVariableRate: "",
            eiborMonths: "",
            minimumHomeLoanRate: "",
        };

        // Validate Exchange Rate Form
        if (!exchangeDate) {
            currentErrors.exchangeDate = "Date is required.";
            allFormsValid = false;
        }
        if (inrSellingRate === "" || isNaN(Number(inrSellingRate)) || Number(inrSellingRate) <= 0) {
            currentErrors.inrSellingRate = "Valid INR Selling Rate is required.";
            allFormsValid = false;
        }
        setExchangeFormErrors(currentErrors); // Set errors for display

        // Validate Term Deposits Form
        if (!termDepositDate) {
            termErrors.termDepositDate = "Effective Date is required.";
            allFormsValid = false;
        }
        const formattedTermRates = termDepositRates.map((row, index) => {
            const aedNum = Number(row.aed);
            const usdNum = Number(row.usd);

            if (row.tenor.trim() === "") {
                termErrors[`tenor_${index}`] = "Tenor cannot be empty.";
                allFormsValid = false;
            }
            if (isNaN(aedNum) || aedNum < 0) {
                termErrors[`aed_${index}`] = "Valid AED rate is required.";
                allFormsValid = false;
            }
            if (isNaN(usdNum) || usdNum < 0) {
                termErrors[`usd_${index}`] = "Valid USD rate is required.";
                allFormsValid = false;
            }
            return { tenor: row.tenor, aed: aedNum, usd: usdNum };
        });
        setTermDepositFormErrors(termErrors); // Set errors for display

        // Validate Home Loan Form
        if (!homeLoanDate) {
            homeLoanErrors.homeLoanDate = "Effective Date is required.";
            allFormsValid = false;
        }
        if (fullyVariableRate === "" || isNaN(Number(fullyVariableRate)) || Number(fullyVariableRate) <= 0) {
            homeLoanErrors.fullyVariableRate = "Valid Fully Variable Rate is required.";
            allFormsValid = false;
        }
        if (eiborMonths === "" || isNaN(Number(eiborMonths)) || Number(eiborMonths) < 0 || !Number.isInteger(Number(eiborMonths))) {
            homeLoanErrors.eiborMonths = "Valid EIBOR Months (integer >= 0) are required.";
            allFormsValid = false;
        }
        if (minimumHomeLoanRate === "" || isNaN(Number(minimumHomeLoanRate)) || Number(minimumHomeLoanRate) <= 0) {
            homeLoanErrors.minimumHomeLoanRate = "Valid Minimum Home Loan Rate is required.";
            allFormsValid = false;
        }
        setHomeLoanFormErrors(homeLoanErrors); // Set errors for display


        if (!allFormsValid) {
            toast.error("Please correct errors in all forms before submitting.");
            setIsSubmitting(false); // Stop loading if validation fails
            return;
        }

        let overallSuccess = true;
        let successMessages: string[] = [];
        let errorMessages: string[] = [];

        toast.loading("Updating all rates...");

        // --- API Calls ---
        try {
            // 1. Exchange Rate Update
            const exchangeData = {
                date: formatDate(exchangeDate),
                inrSellingRate: Number(inrSellingRate),
            };
            await axios.post("/api/rates/exchange", exchangeData);
            successMessages.push("Exchange Rate updated successfully!");
        } catch (error: any) {
            overallSuccess = false;
            const axiosError = error as AxiosError<ErrorResponseData>;
            errorMessages.push(
                `Exchange Rate: ${axiosError.response?.data?.error || axiosError.response?.data?.message || "Failed to update."}`
            );
        }

        try {
            // 2. Term Deposits Update
            const termDepositData = {
                effectiveDate: formatDate(termDepositDate),
                rates: formattedTermRates,
            };
            await axios.post("/api/rates/term-deposits", termDepositData);
            successMessages.push("Term Deposits data updated successfully!");
        } catch (error: any) {
            overallSuccess = false;
            const axiosError = error as AxiosError<ErrorResponseData>;
            errorMessages.push(
                `Term Deposits: ${axiosError.response?.data?.error || axiosError.response?.data?.message || "Failed to update."}`
            );
        }

        try {
            // 3. Home Loan Update
            const homeLoanData = {
                effectiveDate: formatDate(homeLoanDate),
                fullyVariableRate: Number(fullyVariableRate),
                eiborMonths: Number(eiborMonths),
                minimumHomeLoanRate: Number(minimumHomeLoanRate),
            };
            await axios.post("/api/rates/home-loan", homeLoanData);
            successMessages.push("Home Loan data updated successfully!");
        } catch (error: any) {
            overallSuccess = false;
            const axiosError = error as AxiosError<ErrorResponseData>;
            errorMessages.push(
                `Home Loan: ${axiosError.response?.data?.error || axiosError.response?.data?.message || "Failed to update."}`
            );
        }

        toast.dismiss(); // Dismiss the initial loading toast

        if (overallSuccess) {
            toast.success("All rates updated successfully!");
            resetFormFields('all'); // Reset fields on overall success
        } else {
            // Show individual success messages
            successMessages.forEach(msg => toast.success(msg));
            // Show individual error messages
            errorMessages.forEach(msg => toast.error(msg));
            toast.error("Some updates failed. Please check messages above.");
        }
        setIsSubmitting(false); // Stop loading after all operations
    };
    // --- END: Master Submission Handler ---

    // --- Separate Submission Handlers for individual roles ---

    const handleExchangeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setExchangeFormErrors({ exchangeDate: "", inrSellingRate: "" });

        let formValid = true;
        let currentErrors: typeof exchangeFormErrors = { exchangeDate: "", inrSellingRate: "" };

        if (!exchangeDate) {
            currentErrors.exchangeDate = "Date is required.";
            formValid = false;
        }
        if (inrSellingRate === "" || isNaN(Number(inrSellingRate)) || Number(inrSellingRate) <= 0) {
            currentErrors.inrSellingRate = "Valid INR Selling Rate is required.";
            formValid = false;
        }
        setExchangeFormErrors(currentErrors);

        if (!formValid) {
            toast.error("Please correct errors in the form.");
            setIsSubmitting(false);
            return;
        }

        toast.loading("Updating Exchange Rate...");
        try {
            const exchangeData = {
                date: formatDate(exchangeDate),
                inrSellingRate: Number(inrSellingRate),
            };
            await axios.post("/api/rates/exchange", exchangeData);
            toast.dismiss();
            toast.success("ER updated successfully!");
            resetFormFields('exchange'); // Reset specific fields
        } catch (error: any) {
            toast.dismiss();
            const axiosError = error as AxiosError<ErrorResponseData>;
            toast.error(
                axiosError.response?.data?.error ||
                axiosError.response?.data?.message ||
                "Failed to update Exchange Rate."
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleTermDepositSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setTermDepositFormErrors({});

        let formValid = true;
        let termErrors: Record<string, string> = {};

        if (!termDepositDate) {
            termErrors.termDepositDate = "Effective Date is required.";
            formValid = false;
        }
        const formattedTermRates = termDepositRates.map((row, index) => {
            const aedNum = Number(row.aed);
            const usdNum = Number(row.usd);

            if (row.tenor.trim() === "") {
                termErrors[`tenor_${index}`] = "Tenor cannot be empty.";
                formValid = false;
            }
            if (isNaN(aedNum) || aedNum < 0) {
                termErrors[`aed_${index}`] = "Valid AED rate is required.";
                formValid = false;
            }
            if (isNaN(usdNum) || usdNum < 0) {
                termErrors[`usd_${index}`] = "Valid USD rate is required.";
                formValid = false;
            }
            return { tenor: row.tenor, aed: aedNum, usd: usdNum };
        });
        setTermDepositFormErrors(termErrors);

        if (!formValid) {
            toast.error("Please correct errors in the form.");
            setIsSubmitting(false);
            return;
        }

        toast.loading("Updating Term Deposits data...");
        try {
            const termDepositData = {
                effectiveDate: formatDate(termDepositDate),
                rates: formattedTermRates,
            };
            await axios.post("/api/rates/term-deposits", termDepositData);
            toast.dismiss();
            toast.success("TD data updated successfully!");
            resetFormFields('termDeposit'); // Reset specific fields
        } catch (error: any) {
            toast.dismiss();
            const axiosError = error as AxiosError<ErrorResponseData>;
            toast.error(
                axiosError.response?.data?.error ||
                axiosError.response?.data?.message ||
                "Failed to update Term Deposits data."
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleHomeLoanSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setHomeLoanFormErrors({
            homeLoanDate: "",
            fullyVariableRate: "",
            eiborMonths: "",
            minimumHomeLoanRate: "",
        });

        let formValid = true;
        let homeLoanErrors: typeof homeLoanFormErrors = {
            homeLoanDate: "",
            fullyVariableRate: "",
            eiborMonths: "",
            minimumHomeLoanRate: "",
        };

        if (!homeLoanDate) {
            homeLoanErrors.homeLoanDate = "Effective Date is required.";
            formValid = false;
        }
        if (fullyVariableRate === "" || isNaN(Number(fullyVariableRate)) || Number(fullyVariableRate) <= 0) {
            homeLoanErrors.fullyVariableRate = "Valid Fully Variable Rate is required.";
            formValid = false;
        }
        if (eiborMonths === "" || isNaN(Number(eiborMonths)) || Number(eiborMonths) < 0 || !Number.isInteger(Number(eiborMonths))) {
            homeLoanErrors.eiborMonths = "Valid EIBOR Months (integer >= 0) are required.";
            formValid = false;
        }
        if (minimumHomeLoanRate === "" || isNaN(Number(minimumHomeLoanRate)) || Number(minimumHomeLoanRate) <= 0) {
            homeLoanErrors.minimumHomeLoanRate = "Valid Minimum Home Loan Rate is required.";
            formValid = false;
        }
        setHomeLoanFormErrors(homeLoanErrors);

        if (!formValid) {
            toast.error("Please correct errors in the form.");
            setIsSubmitting(false);
            return;
        }

        toast.loading("Updating Home Loan data...");
        try {
            const homeLoanData = {
                effectiveDate: formatDate(homeLoanDate),
                fullyVariableRate: Number(fullyVariableRate),
                eiborMonths: Number(eiborMonths),
                minimumHomeLoanRate: Number(minimumHomeLoanRate),
            };
            await axios.post("/api/rates/home-loan", homeLoanData);
            toast.dismiss();
            toast.success("HL data updated successfully!");
            resetFormFields('homeLoan'); // Reset specific fields
        } catch (error: any) {
            toast.dismiss();
            const axiosError = error as AxiosError<ErrorResponseData>;
            toast.error(
                axiosError.response?.data?.error ||
                axiosError.response?.data?.message ||
                "Failed to update Home Loan data."
            );
        } finally {
            setIsSubmitting(false);
        }
    };
    // --- END: Separate Submission Handlers ---


    const handleTermDepositRateChange = (index: number, field: keyof TermDepositRateRow, value: string) => {
        const newRates = [...termDepositRates];
        newRates[index] = { ...newRates[index], [field]: value };
        setTermDepositRates(newRates);
    };


    // Conditional rendering based on user role
    const renderContent = () => {
        if (loadingProfile) {
            return (
                <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
            <div className="z-10 w-full max-w-md overflow-hidden rounded-2xl border border-gray-100 shadow-xl">
                <div className="text-center text-gray-700 p-6 rounded-md bg-white shadow-xl max-w-md w-full">
                    <h2 className="text-xl font-semibold text-black mb-4">Loading Profile...</h2>
                    <p>Fetching your user details and permissions.</p>
                </div>
                </div>
</div>
            );
        }

        if (apiError) {
            return (
                <div className="text-center text-red-700 p-6 rounded-md bg-white shadow-xl max-w-md w-full">
                    <h2 className="text-xl font-semibold text-red-800 mb-4">Error</h2>
                    <p>{apiError}</p>
                    <p className="mt-2 text-sm text-gray-500">Please try logging in again or contact support.</p>
                </div>
            );
        }

        // Admin can see all forms
        if (userData.role === "admin") {
            return (
                <>
                    <div className="bg-white p-6 rounded-md shadow-xl max-w-2xl w-full mb-8 mt-16">
                        <h2 className="text-2xl font-bold text-center text-black mb-6">
                            Update All Rates
                        </h2>
                        {/* Master form to submit all rates */}
                        <form onSubmit={handleAllRatesSubmit} className="space-y-6">

                            {/* Exchange Rate Section */}
                            <fieldset className="border p-4 rounded-md">
                                <legend className="text-xl font-semibold text-gray-800 mb-4">Indicative Foreign Exchange Rate</legend>
                                <div className="mb-4">
                                    <label
                                        htmlFor="exchangeDate"
                                        className="block text-sm font-medium text-gray-700"
                                    >
                                        Effective Date
                                    </label>
                                    <DatePicker
                                        id="exchangeDate"
                                        selected={exchangeDate}
                                        onChange={(date: Date | null) => setExchangeDate(date)}
                                         dateFormat="dd-MM-yyyy"
                                        className="mt-1 block w-full border text-black border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                                    />
                                    {exchangeFormErrors.exchangeDate && (
                                        <p className="mt-1 text-sm text-red-500">
                                            {exchangeFormErrors.exchangeDate}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label
                                        htmlFor="inrSellingRate"
                                        className="block text-sm font-medium text-gray-700"
                                    >
                                        INR Selling Rate (e.g., 22.8)
                                    </label>
                                    <input
                                        type="number"
                                        id="inrSellingRate"
                                        value={inrSellingRate}
                                        onChange={(e) => setInrSellingRate(parseFloat(e.target.value))}
                                        step="0.001"
                                        className="mt-1 block w-full border text-black border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                                        placeholder="Enter rate"
                                    />
                                    {exchangeFormErrors.inrSellingRate && (
                                        <p className="mt-1 text-sm text-red-500">
                                            {exchangeFormErrors.inrSellingRate}
                                        </p>
                                    )}
                                </div>
                            </fieldset>

                            {/* Term Deposits Section - UPDATED TO TABLE DESIGN */}
                            <fieldset className="border p-4 rounded-md">
                                <legend className="text-xl font-semibold text-gray-800 mb-4">Interest Rates on Term Deposits</legend>
                                <div>
                                    <label
                                        htmlFor="termDepositDate"
                                        className="block text-sm font-medium text-gray-700"
                                    >
                                        Effective Date
                                    </label>
                                    <DatePicker
                                        id="termDepositDate"
                                        selected={termDepositDate}
                                        onChange={(date: Date | null) => setTermDepositDate(date)}
                                         dateFormat="dd-MM-yyyy"
                                        className="mt-1 block w-full border text-black border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                                    />
                                    {termDepositFormErrors.termDepositDate && (
                                        <p className="mt-1 text-sm text-red-500">
                                            {termDepositFormErrors.termDepositDate}
                                        </p>
                                    )}
                                </div>
                                <div className="overflow-x-auto mt-4"> {/* Added mt-4 for spacing */}
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    TENOR
                                                </th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    AED (درهم إماراتي)
                                                </th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    USD (دولار أمريكي)
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {termDepositRates.map((row, index) => (
                                                <tr key={index}>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                        {row.tenor}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        <input
                                                            type="number"
                                                            value={row.aed}
                                                            onChange={(e) => handleTermDepositRateChange(index, 'aed', e.target.value)}
                                                            className={`w-full p-1 border rounded text-black ${termDepositFormErrors[`aed_${index}`] ? 'border-red-500' : 'border-gray-300'}`}
                                                            step="0.01"
                                                            required
                                                        />
                                                        {termDepositFormErrors[`aed_${index}`] && (
                                                            <p className="mt-1 text-xs text-red-500">{termDepositFormErrors[`aed_${index}`]}</p>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        <input
                                                            type="number"
                                                            value={row.usd}
                                                            onChange={(e) => handleTermDepositRateChange(index, 'usd', e.target.value)}
                                                            className={`w-full p-1 border rounded text-black ${termDepositFormErrors[`usd_${index}`] ? 'border-red-500' : 'border-gray-300'}`}
                                                            step="0.01"
                                                            required
                                                        />
                                                        {termDepositFormErrors[`usd_${index}`] && (
                                                            <p className="mt-1 text-xs text-red-500">{termDepositFormErrors[`usd_${index}`]}</p>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </fieldset>

                            {/* Home Loan Section */}
                            <fieldset className="border p-4 rounded-md">
                                <legend className="text-xl font-semibold text-gray-800 mb-4">Interest Rate on Home Loan</legend>
                                <div>
                                    <label
                                        htmlFor="homeLoanDate"
                                        className="block text-sm font-medium text-gray-700"
                                    >
                                        Effective Date
                                    </label>
                                    <DatePicker
                                        id="homeLoanDate"
                                        selected={homeLoanDate}
                                        onChange={(date: Date | null) => setHomeLoanDate(date)}
                                         dateFormat="dd-MM-yyyy"
                                        className="mt-1 block w-full border text-black border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                                    />
                                    {homeLoanFormErrors.homeLoanDate && (
                                        <p className="mt-1 text-sm text-red-500">
                                            {homeLoanFormErrors.homeLoanDate}
                                        </p>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 mb-4"> {/* Added mt-4 for spacing */}
                                    <div>
                                        <label
                                            htmlFor="fullyVariableRate"
                                            className="block text-sm font-medium text-gray-700"
                                        >
                                            Fully Variable Rate
                                        </label>
                                        <input
                                            type="number"
                                            id="fullyVariableRate"
                                            value={fullyVariableRate}
                                            onChange={(e) => setFullyVariableRate(parseFloat(e.target.value))}
                                            step="0.001"
                                            className="mt-1 block w-full border text-black border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                                            placeholder="e.g., 3.5"
                                        />
                                        {homeLoanFormErrors.fullyVariableRate && (
                                            <p className="mt-1 text-sm text-red-500">
                                                {homeLoanFormErrors.fullyVariableRate}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label
                                            htmlFor="eiborMonths"
                                            className="block text-sm font-medium text-gray-700"
                                        >
                                            EIBOR Months
                                        </label>
                                        <input
                                            type="number"
                                            id="eiborMonths"
                                            value={eiborMonths}
                                            onChange={(e) => setEiborMonths(parseInt(e.target.value))}
                                            step="1"
                                            className="mt-1 block w-full border text-black border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                                            placeholder="e.g., 3, 6, 12"
                                        />
                                        {homeLoanFormErrors.eiborMonths && (
                                            <p className="mt-1 text-sm text-red-500">
                                                {homeLoanFormErrors.eiborMonths}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label
                                        htmlFor="minimumHomeLoanRate"
                                        className="block text-sm font-medium text-gray-700"
                                    >
                                        Minimum Home Loan Rate
                                    </label>
                                    <input
                                        type="number"
                                        id="minimumHomeLoanRate"
                                        value={minimumHomeLoanRate}
                                        onChange={(e) => setMinimumHomeLoanRate(parseFloat(e.target.value))}
                                        step="0.001"
                                        className="mt-1 block w-full border text-black border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                                        placeholder="e.g., 2.99"
                                    />
                                    {homeLoanFormErrors.minimumHomeLoanRate && (
                                        <p className="mt-1 text-sm text-red-500">
                                            {homeLoanFormErrors.minimumHomeLoanRate}
                                        </p>
                                    )}
                                </div>
                            </fieldset>

                            {/* Master Submit Button */}
                            <button
                                type="submit"
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-md font-medium text-white bg-black hover:bg-gray-800 mt-8 disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={isSubmitting} // Disable button when submitting
                            >
                                {isSubmitting ? "UPDATING ALL RATES..." : "UPDATE ALL RATES"}
                            </button>
                        </form>
                    </div>
                </>
            );
        }

        // Role 1 can see only Exchange Rate Form
        if (userData.role === "role1") {
            return (
                
                <div className="bg-white p-6 rounded-md shadow-xl max-w-lg w-full mt-16">
                    <h2 className="text-2xl font-bold text-center text-black mb-6">
                        Indicative Foreign Exchange Rate
                    </h2>
                    <form onSubmit={handleExchangeSubmit} className="space-y-4"> {/* Changed to handleExchangeSubmit */}
                        <div>
                            <label
                                htmlFor="exchangeDate"
                                className="block text-sm font-medium text-gray-700"
                            >
                                Effective Date
                            </label>
                            <DatePicker
                                id="exchangeDate"
                                selected={exchangeDate}
                                onChange={(date: Date | null) => setExchangeDate(date)}
                                 dateFormat="dd-MM-yyyy"
                                className="mt-1 block w-full text-black border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                            />
                            {exchangeFormErrors.exchangeDate && (
                                <p className="mt-1 text-sm text-red-500">
                                    {exchangeFormErrors.exchangeDate}
                                </p>
                            )}
                        </div>
                        <div>
                            <label
                                htmlFor="inrSellingRate"
                                className="block text-sm font-medium text-gray-700"
                            >
                                INR Selling Rate (e.g., 22.8)
                            </label>
                            <input
                                type="number"
                                id="inrSellingRate"
                                value={inrSellingRate}
                                onChange={(e) => setInrSellingRate(parseFloat(e.target.value))}
                                step="0.001"
                                className="mt-1 block w-full border text-black border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                                placeholder="Enter rate"
                            />
                            {exchangeFormErrors.inrSellingRate && (
                                <p className="mt-1 text-sm text-red-500">
                                    {exchangeFormErrors.inrSellingRate}
                                </p>
                            )}
                        </div>
                        <button
                            type="submit"
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "UPDATING EXCHANGE RATE..." : "UPDATE EXCHANGE RATE"}
                        </button>
                    </form>
                </div>
            );
        }

        // Role 2 can see only Term Deposits Form
        if (userData.role === "role2") {
            return (
                <div className="bg-white p-6 rounded-md shadow-xl max-w-xl w-full mt-16">
                    <h2 className="text-xl font-bold text-center text-black mb-6">
                        Interest Rates on Term Deposits
                    </h2>
                    <form onSubmit={handleTermDepositSubmit} className="space-y-4"> {/* Changed to handleTermDepositSubmit */}
                        <div>
                            <label
                                htmlFor="termDepositDate"
                                className="block text-sm font-medium text-gray-700"
                            >
                                Effective Date
                            </label>
                            <DatePicker
                                id="termDepositDate"
                                selected={termDepositDate}
                                onChange={(date: Date | null) => setTermDepositDate(date)}
                                 dateFormat="dd-MM-yyyy"
                                className="mt-1 block w-full border text-black border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                            />
                            {termDepositFormErrors.termDepositDate && (
                                <p className="mt-1 text-sm text-red-500">
                                    {termDepositFormErrors.termDepositDate}
                                </p>
                            )}
                        </div>
                        <div className="overflow-x-auto mt-4">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            TENOR
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            AED
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            USD
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {termDepositRates.map((row, index) => (
                                        <tr key={index}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {row.tenor}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <input
                                                    type="number"
                                                    value={row.aed}
                                                    onChange={(e) => handleTermDepositRateChange(index, 'aed', e.target.value)}
                                                    className={`w-full p-1 border rounded text-black ${termDepositFormErrors[`aed_${index}`] ? 'border-red-500' : 'border-gray-300'}`}
                                                    step="0.01"
                                                    required
                                                />
                                                {termDepositFormErrors[`aed_${index}`] && (
                                                    <p className="mt-1 text-xs text-red-500">{termDepositFormErrors[`aed_${index}`]}</p>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <input
                                                    type="number"
                                                    value={row.usd}
                                                    onChange={(e) => handleTermDepositRateChange(index, 'usd', e.target.value)}
                                                    className={`w-full p-1 border rounded text-black ${termDepositFormErrors[`usd_${index}`] ? 'border-red-500' : 'border-gray-300'}`}
                                                    step="0.01"
                                                    required
                                                />
                                                {termDepositFormErrors[`usd_${index}`] && (
                                                    <p className="mt-1 text-xs text-red-500">{termDepositFormErrors[`usd_${index}`]}</p>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <button
                            type="submit"
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "UPDATING TERM DEPOSITS DATA..." : "UPDATE TERM DEPOSITS DATA"}
                        </button>
                    </form>
                </div>
            );
        }

        // Role 3 can see only Home Loan Form
        if (userData.role === "role3") {
            return (
                <div className="bg-white p-6 rounded-md shadow-xl max-w-lg w-full mt-16">
                    <h2 className="text-2xl font-bold text-center text-black mb-6">
                        Interest Rate on Home Loan
                    </h2>
                    <form onSubmit={handleHomeLoanSubmit} className="space-y-4"> {/* Changed to handleHomeLoanSubmit */}
                        <div>
                            <label
                                htmlFor="homeLoanDate"
                                className="block text-sm font-medium text-gray-700"
                                >
                                Effective Date
                            </label>
                            <DatePicker
                                id="homeLoanDate"
                                selected={homeLoanDate}
                                onChange={(date: Date | null) => setHomeLoanDate(date)}
                                 dateFormat="dd-MM-yyyy"
                                className="mt-1 block w-full border text-black border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                            />
                            {homeLoanFormErrors.homeLoanDate && (
                                <p className="mt-1 text-sm text-red-500">
                                    {homeLoanFormErrors.homeLoanDate}
                                </p>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label
                                    htmlFor="fullyVariableRate"
                                    className="block text-sm font-medium text-gray-700"
                                    >
                                    Fully Variable Rate
                                </label>
                                <input
                                    type="number"
                                    id="fullyVariableRate"
                                    value={fullyVariableRate}
                                    onChange={(e) => setFullyVariableRate(parseFloat(e.target.value))}
                                    step="0.001"
                                    className="mt-1 block w-full border text-black border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                                    placeholder="e.g., 3.5"
                                />
                                {homeLoanFormErrors.fullyVariableRate && (
                                    <p className="mt-1 text-sm text-red-500">
                                        {homeLoanFormErrors.fullyVariableRate}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label
                                    htmlFor="eiborMonths"
                                    className="block text-sm font-medium text-gray-700"
                                    >
                                    EIBOR Months
                                </label>
                                <input
                                    type="number"
                                    id="eiborMonths"
                                    value={eiborMonths}
                                    onChange={(e) => setEiborMonths(parseInt(e.target.value))}
                                    step="1"
                                    className="mt-1 block w-full border text-black border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                                    placeholder="e.g., 3, 6, 12"
                                />
                                {homeLoanFormErrors.eiborMonths && (
                                    <p className="mt-1 text-sm text-red-500">
                                        {homeLoanFormErrors.eiborMonths}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div>
                            <label
                                htmlFor="minimumHomeLoanRate"
                                className="block text-sm font-medium text-gray-700"
                                >
                                Minimum Home Loan Rate
                            </label>
                            <input
                                type="number"
                                id="minimumHomeLoanRate"
                                value={minimumHomeLoanRate}
                                onChange={(e) => setMinimumHomeLoanRate(parseFloat(e.target.value))}
                                step="0.001"
                                className="mt-1 block w-full border text-black border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                                placeholder="e.g., 2.99"
                            />
                            {homeLoanFormErrors.minimumHomeLoanRate && (
                                <p className="mt-1 text-sm text-red-500">
                                    {homeLoanFormErrors.minimumHomeLoanRate}
                                </p>
                            )}
                        </div>

                        <button
                            type="submit"
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "UPDATING HOME LOAN DATA..." : "UPDATE HOME LOAN DATA"}
                        </button>
                    </form>
                </div>
            );
        }

        // Default Access Denied message for roles not explicitly handled
        return (
            <div className="text-center text-gray-700 p-6 rounded-md bg-white shadow-xl max-w-md w-full">
                <h2 className="text-xl font-semibold text-black mb-4">Access Denied</h2>
                <p>You do not have the required permissions to view any content on this page.</p>
                <p className="mt-2 text-sm text-gray-500">Your current role: <span className="font-bold">{userData.role || 'Not available'}</span></p>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <Navbar />
            <main className="flex flex-col items-center justify-center py-10 px-4">
                {renderContent()}
            </main>
        </div>
    );
}