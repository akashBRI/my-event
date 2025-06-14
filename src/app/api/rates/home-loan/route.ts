// api/rates/home-loan/route.ts
import { connect } from "../../../../dbConfig/dbConfig";
import HomeLoan from "../../../../models/homeLoan";
import { NextRequest, NextResponse } from "next/server";
import { getUserIdAndRoleFromToken } from "../../../../helpers/getUserIdAndRoleFromToken";

connect();

interface HomeLoanRequestBody {
    effectiveDate: string;
    fullyVariableRate: number;
    eiborMonths: number;
    minimumHomeLoanRate: number;
}

export async function POST(request: NextRequest) {
    try {
        const user = await getUserIdAndRoleFromToken(request);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized: Please log in." }, { status: 401 });
        }

        const allowedRoles = ['admin', 'role3'];
        if (!allowedRoles.includes(user.role)) {
            return NextResponse.json({ error: "Forbidden: You do not have permission to update Home Loan rates." }, { status: 403 }); // Reverted message
        }

        const reqBody: HomeLoanRequestBody = await request.json();
        const { effectiveDate, fullyVariableRate, eiborMonths, minimumHomeLoanRate } = reqBody;

        if (!effectiveDate || typeof fullyVariableRate !== 'number' || fullyVariableRate <= 0 ||
            typeof eiborMonths !== 'number' || !Number.isInteger(eiborMonths) || eiborMonths < 0 ||
            typeof minimumHomeLoanRate !== 'number' || minimumHomeLoanRate <= 0) {
            return NextResponse.json({ error: "Invalid data provided. Please check all fields for Home Loan rates." }, { status: 400 });
        }

        // --- REVERTED: Use findOneAndUpdate with upsert: true ---
        const dateObject = new Date(effectiveDate); // Convert date string to Date object

        const updatedHomeLoan = await HomeLoan.findOneAndUpdate(
            { effectiveDate: dateObject }, // Query by Date object
            { fullyVariableRate, eiborMonths, minimumHomeLoanRate },
            { new: true, upsert: true, runValidators: true }
        );

        return NextResponse.json({
            message: "Home Loan data upserted successfully!", // Changed message
            success: true,
            data: updatedHomeLoan,
        });

    } catch (error: any) {
        console.error("API Error (Home Loan POST):", error);
        return NextResponse.json({ error: error.message || "An unexpected error occurred." }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    try {
        const latestRates = await HomeLoan.findOne().sort({ createdAt: -1 });

        if (!latestRates) {
            return NextResponse.json({ message: "No home loan rates data found.", data: null }, { status: 404 });
        }

        return NextResponse.json({
            message: "Latest Home Loan Rates fetched successfully!",
            success: true,
            data: latestRates,
        });

    } catch (error: any) {
        console.error("API Error (Home Loan GET):", error);
        return NextResponse.json({ error: error.message || "An unexpected error occurred." }, { status: 500 });
    }
}