// api/rates/term-deposits/route.ts
import { connect } from "../../../../dbConfig/dbConfig";
import TermDeposit from "../../../../models/termDeposit";
import { NextRequest, NextResponse } from "next/server";
import { getUserIdAndRoleFromToken } from "../../../../helpers/getUserIdAndRoleFromToken";

connect();

interface TermDepositRateBody {
    tenor: string;
    aed: number;
    usd: number;
}

interface TermDepositRequestBody {
    effectiveDate: string;
    rates: TermDepositRateBody[];
}

export async function POST(request: NextRequest) {
    try {
        const user = await getUserIdAndRoleFromToken(request);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized: Please log in." }, { status: 401 });
        }

        const allowedRoles = ['admin', 'role2'];
        if (!allowedRoles.includes(user.role)) {
            return NextResponse.json({ error: "Forbidden: You do not have permission to update Term Deposits." }, { status: 403 }); // Reverted message
        }

        const reqBody: TermDepositRequestBody = await request.json();
        const { effectiveDate, rates } = reqBody;

        if (!effectiveDate || !Array.isArray(rates) || rates.length === 0) {
            return NextResponse.json({ error: "Invalid data: effectiveDate and an array of rates are required." }, { status: 400 });
        }

        const invalidRate = rates.some(r =>
            !r.tenor || typeof r.aed !== 'number' || r.aed < 0 || typeof r.usd !== 'number' || r.usd < 0
        );
        if (invalidRate) {
            return NextResponse.json({ error: "Invalid rates format: tenor, positive aed (number), and positive usd (number) are required for each rate entry." }, { status: 400 });
        }

        // --- REVERTED: Use findOneAndUpdate with upsert: true ---
        const dateObject = new Date(effectiveDate); // Convert date string to Date object

        const updatedTermDeposit = await TermDeposit.findOneAndUpdate(
            { effectiveDate: dateObject }, // Query by Date object
            { rates: rates },
            { new: true, upsert: true, runValidators: true }
        );

        return NextResponse.json({
            message: "Term Deposits data upserted successfully!", // Changed message
            success: true,
            data: updatedTermDeposit,
        });

    } catch (error: any) {
        console.error("API Error (Term Deposits POST):", error);
        return NextResponse.json({ error: error.message || "An unexpected error occurred." }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    try {
        const latestRates = await TermDeposit.findOne().sort({ createdAt: -1 });

        if (!latestRates) {
            return NextResponse.json({ message: "No term deposit rates data found.", data: null }, { status: 404 });
        }

        return NextResponse.json({
            message: "Latest Term Deposit Rates fetched successfully!",
            success: true,
            data: latestRates,
        });

    } catch (error: any) {
        console.error("API Error (Term Deposits GET):", error);
        return NextResponse.json({ error: error.message || "An unexpected error occurred." }, { status: 500 });
    }
}