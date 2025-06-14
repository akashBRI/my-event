import { getDataFromToken } from "@/helpers/getDataFromToken";
import { NextRequest, NextResponse } from "next/server";
import User from "@/models/userModel";
import { connect } from "@/dbConfig/dbConfig";

connect();

export async function GET(request: NextRequest) {
    try {
        const userId = await getDataFromToken(request);
        // Find user by ID and select specific fields, including 'role'
        const user = await User.findOne({ _id: userId }).select("-password -forgotPasswordToken -forgotPasswordTokenExpiry -verifyToken -verifyTokenExpiry");

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json({
            message: "User found",
            success: true,
            data: {
                id: user._id,
                email: user.email,
                // Make sure to include the role here!
                role: user.role, // <-- ADD THIS LINE
                isAdmin: user.isAdmin, // Include isAdmin if you use it
                isVerfied: user.isVerfied // Include isVerified if you use it
            }
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}