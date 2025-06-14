// api/rates/exchange/route.ts
import { connect } from "../../../../dbConfig/dbConfig";
import ExchangeRate from "../../../../models/exchangeRate";
import { NextRequest, NextResponse } from "next/server";
import { getUserIdAndRoleFromToken } from "../../../../helpers/getUserIdAndRoleFromToken";

connect();

export async function POST(request: NextRequest) {
    try {
        const user = await getUserIdAndRoleFromToken(request);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized: Please log in." }, { status: 401 });
        }

        const allowedRoles = ['admin', 'role1'];
        if (!allowedRoles.includes(user.role)) {
            return NextResponse.json({ error: "Forbidden: You do not have permission to update Exchange Rates." }, { status: 403 }); // Reverted message to 'update'
        }

        interface ExchangeRateRequestBody {
            date: string;
            inrSellingRate: number;
        }
        const { date, inrSellingRate }: ExchangeRateRequestBody = await request.json();

        if (!date || typeof inrSellingRate !== 'number' || inrSellingRate <= 0) {
            return NextResponse.json({ error: "Invalid data provided: date (YYYY-MM-DD) and positive inrSellingRate are required." }, { status: 400 });
        }

        // --- REVERTED: Use findOneAndUpdate with upsert: true ---
        const effectiveDate = new Date(date); // Convert date string to Date object for query

        const updatedRate = await ExchangeRate.findOneAndUpdate(
            { date: effectiveDate }, // Query by Date object
            { inrSellingRate: inrSellingRate },
            { new: true, upsert: true, runValidators: true } // Creates if not exists, updates if exists
        );

        return NextResponse.json({
            message: "Exchange Rate data upserted successfully!", // Changed message to reflect upsert
            success: true,
            data: updatedRate,
        });

    } catch (error: any) {
        console.error("API Error (Exchange Rate POST):", error);
        return NextResponse.json({ error: error.message || "An unexpected error occurred." }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    try {
        const latestRate = await ExchangeRate.findOne().sort({ createdAt: -1 });

        if (!latestRate) {
            return NextResponse.json({ message: "No exchange rate data found.", data: null }, { status: 404 });
        }

        return NextResponse.json({
            message: "Latest Exchange Rate fetched successfully!",
            success: true,
            data: latestRate,
        });

    } catch (error: any) {
        console.error("API Error (Exchange Rate GET):", error);
        return NextResponse.json({ error: error.message || "An unexpected error occurred." }, { status: 500 });
    }
}