"use client"; // This is a Client Component

import React, { useState, useEffect } from "react";
import axios from "axios";

// Define interfaces for the data structures
interface ExchangeRates {
    date: string;
    inrSellingRate: number;
}

interface TermDepositRateItem {
    tenor: string;
    aed: number;
    usd: number;
}

interface TermDeposits {
    effectiveDate: string;
    rates: TermDepositRateItem[];
}

interface HomeLoans {
    effectiveDate: string;
    fullyVariableRate: number;
    eiborMonths: number;
    minimumHomeLoanRate: number;
}

// Helper function to format date
const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString || dateString === "Loading..." || dateString === "N/A" || dateString === "Error") {
        return dateString || "N/A";
    }
    try {
        const date = new Date(dateString);
        // Check if the date is valid
        if (isNaN(date.getTime())) {
            return dateString; // Return original if invalid date string
        }
        // 'en-GB' locale formats date as DD/MM/YYYY
        return date.toLocaleDateString('en-GB');
    } catch (e) {
        console.error("Error formatting date:", e);
        return dateString; // Fallback to original string on error
    }
};

export default function Page() {
    const [exchangerates, setExchangeRates] = useState<ExchangeRates>({
        date: "Loading...",
        inrSellingRate: 0,
    });
    const [termdeposits, setTermDeposits] = useState<TermDeposits>({
        effectiveDate: "Loading...",
        rates: Array(5).fill({ tenor: "", aed: 0, usd: 0 }), // Initialize with placeholder for 5 rows
    });
    const [homeloans, setHomeLoans] = useState<HomeLoans>({
        effectiveDate: "Loading...",
        fullyVariableRate: 0,
        eiborMonths: 0,
        minimumHomeLoanRate: 0,
    });

    // Function to fetch all rates
    const fetchAllRates = async () => {
        try {
            const [exchangeResponse, termDepositResponse, homeLoanResponse] = await Promise.all([
                axios.get("/api/rates/exchange"),
                axios.get("/api/rates/term-deposits"),
                axios.get("/api/rates/home-loan")
            ]);

            // Update Exchange Rates
            if (exchangeResponse.data && exchangeResponse.data.data) {
                setExchangeRates({
                    date: exchangeResponse.data.data.date || "N/A",
                    inrSellingRate: exchangeResponse.data.data.inrSellingRate || 0,
                });
            }

            // Update Term Deposit Rates
            if (termDepositResponse.data && termDepositResponse.data.data) {
                const data = termDepositResponse.data.data;
                const ratesData = data.rates || [];
                const formattedRates = Array(5).fill({ tenor: "", aed: 0, usd: 0 }).map((defaultVal, index) => {
                    return ratesData[index] ? {
                        tenor: ratesData[index].tenor,
                        aed: ratesData[index].aed || 0,
                        usd: ratesData[index].usd || 0,
                    } : defaultVal;
                });
                setTermDeposits({
                    effectiveDate: data.effectiveDate || "N/A",
                    rates: formattedRates,
                });
            }

            // Update Home Loan Rates
            if (homeLoanResponse.data && homeLoanResponse.data.data) {
                const data = homeLoanResponse.data.data;
                setHomeLoans({
                    effectiveDate: data.effectiveDate || "N/A",
                    fullyVariableRate: data.fullyVariableRate || 0,
                    eiborMonths: data.eiborMonths || 0,
                    minimumHomeLoanRate: data.minimumHomeLoanRate || 0,
                });
            }
        } catch (error) {
            console.error("Failed to fetch rates:", error);
            setExchangeRates(prev => ({ ...prev, date: "Error", inrSellingRate: 0 }));
            setTermDeposits(prev => ({ ...prev, effectiveDate: "Error", rates: Array(5).fill({ tenor: "", aed: 0, usd: 0 }) }));
            setHomeLoans(prev => ({ ...prev, effectiveDate: "Error", fullyVariableRate: 0, eiborMonths: 0, minimumHomeLoanRate: 0 }));
        }
    };

    useEffect(() => {
        // Initial fetch on component mount
        fetchAllRates();

        // Set up polling to fetch data every 5 seconds (5000 milliseconds)
        const intervalId = setInterval(fetchAllRates, 5000);

        // Cleanup function: Clear the interval when the component unmounts
        return () => clearInterval(intervalId);

    }, []); // Empty dependency array means this effect runs once on mount and cleans up on unmount

    return (
        <div
            className="w-screen h-screen bg-black bg-center bg-no-repeat bg-contain relative"
            style={{
                backgroundImage: "url('/bg1.png')",
            }}
        >
            {/* Exchange Rates */}
            <div
                className="absolute"
                style={{
                    top: "321px",
                    left: "610px",
                    fontFamily: "Arial, sans-serif",
                    fontSize: "26px",
                    fontWeight: "bold",
                    color: "white",
                }}
            >
                {formatDate(exchangerates.date)}
            </div>
            <div
                className="absolute"
                style={{
                    top: "462px",
                    left: "610px",
                    fontFamily: "Arial, sans-serif",
                    fontSize: "26px",
                    fontWeight: "bold",
                    color: "rgb(233 107 46)",
                }}
            >
                {exchangerates.inrSellingRate}
            </div>

            {/* Term Deposits */}
            <div
                className="absolute"
                style={{
                    top: "548px",
                    left: "610px",
                    fontFamily: "Arial, sans-serif",
                    fontSize: "26px",
                    fontWeight: "bold",
                    color: "white",
                }}
            >
                {formatDate(termdeposits.effectiveDate)}
            </div>

            <div
                className="absolute"
                style={{
                    top: "685px",
                    left: "495px",
                    fontFamily: "Arial, sans-serif",
                    fontSize: "26px",
                    fontWeight: "bold",
                    color: "rgb(233 107 46)",
                }}
            >
                {termdeposits.rates[0]?.aed + "%"}
            </div>

            <div
                className="absolute"
                style={{
                    top: "685px",
                    left: "680px",
                    fontFamily: "Arial, sans-serif",
                    fontSize: "26px",
                    fontWeight: "bold",
                    color: "rgb(233 107 46)",
                }}
            >
                {termdeposits.rates[0]?.usd + "%"}
            </div>

            <div
                className="absolute"
                style={{
                    top: "735px",
                    left: "495px",
                    fontFamily: "Arial, sans-serif",
                    fontSize: "26px",
                    fontWeight: "bold",
                    color: "rgb(233 107 46)",
                }}
            >
                {termdeposits.rates[1]?.aed + "%"}
            </div>

            <div
                className="absolute"
                style={{
                    top: "735px",
                    left: "680px",
                    fontFamily: "Arial, sans-serif",
                    fontSize: "26px",
                    fontWeight: "bold",
                    color: "rgb(233 107 46)",
                }}
            >
                {termdeposits.rates[1]?.usd + "%"}
            </div>

            <div
                className="absolute"
                style={{
                    top: "785px",
                    left: "495px",
                    fontFamily: "Arial, sans-serif",
                    fontSize: "26px",
                    fontWeight: "bold",
                    color: "rgb(233 107 46)",
                }}
            >
                {termdeposits.rates[2]?.aed + "%"}
            </div>

            <div
                className="absolute"
                style={{
                    top: "785px",
                    left: "680px",
                    fontFamily: "Arial, sans-serif",
                    fontSize: "26px",
                    fontWeight: "bold",
                    color: "rgb(233 107 46)",
                }}
            >
                {termdeposits.rates[2]?.usd + "%"}
            </div>

            <div
                className="absolute"
                style={{
                    top: "835px",
                    left: "490px",
                    fontFamily: "Arial, sans-serif",
                    fontSize: "26px",
                    fontWeight: "bold",
                    color: "rgb(233 107 46)",
                }}
            >
                {termdeposits.rates[3]?.aed + "%"}
            </div>

            <div
                className="absolute"
                style={{
                    top: "835px",
                    left: "675px",
                    fontFamily: "Arial, sans-serif",
                    fontSize: "26px",
                    fontWeight: "bold",
                    color: "rgb(233 107 46)",
                }}
            >
                {termdeposits.rates[3]?.usd + "%"}
            </div>

            <div
                className="absolute"
                style={{
                    top: "885px",
                    left: "490px",
                    fontFamily: "Arial, sans-serif",
                    fontSize: "26px",
                    fontWeight: "bold",
                    color: "rgb(233 107 46)",
                }}
            >
                {termdeposits.rates[4]?.aed + "%"}
            </div>

            <div
                className="absolute"
                style={{
                    top: "885px",
                    left: "675px",
                    fontFamily: "Arial, sans-serif",
                    fontSize: "26px",
                    fontWeight: "bold",
                    color: "rgb(233 107 46)",
                }}
            >
                {termdeposits.rates[4]?.usd + "%"}
            </div>

            {/* Home Loan Rates */}
            <div
                className="absolute"
                style={{
                    top: "963px",
                    left: "610px",
                    fontFamily: "Arial, sans-serif",
                    fontSize: "26px",
                    fontWeight: "bold",
                    color: "white",
                }}
            >
                {formatDate(homeloans.effectiveDate)}
            </div>

            <div
                className="absolute"
                style={{
                    top: "1105px",
                    left: "455px",
                    fontFamily: "Arial, sans-serif",
                    fontSize: "26px",
                    fontWeight: "bold",
                    color: "white",
                }}
            >
                {homeloans.fullyVariableRate + "%"}
            </div>

            <div
                className="absolute"
                style={{
                    top: "1105px",
                    left: "610px",
                    fontFamily: "Arial, sans-serif",
                    fontSize: "26px",
                    fontWeight: "bold",
                    color: "white",
                }}
            >
                {homeloans.eiborMonths}
            </div>

            <div
                className="absolute"
                style={{
                    top: "1158px",
                    left: "610px",
                    fontFamily: "Arial, sans-serif",
                    fontSize: "26px",
                    fontWeight: "bold",
                    color: "white",
                }}
            >
                {homeloans.minimumHomeLoanRate + "%"}
            </div>
        </div>
    );
}