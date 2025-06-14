import {connect} from "@/dbConfig/dbConfig";
import User from "@/models/userModel";
import { NextRequest, NextResponse } from "next/server";
import bcryptjs from "bcryptjs";
import { sendEmail } from "@/helpers/mailer";


connect(); // Ensure your database connection is established

export async function POST(request: NextRequest){
    try {
        const reqBody = await request.json();
        // Destructure email, password, and NOW 'role'.
        // Removed 'username' from destructuring.
        const { email, password, role } = reqBody;

        console.log(reqBody);

        // Check if user already exists based on email (primary unique identifier)
        const user = await User.findOne({ email });

        if(user){
            return NextResponse.json({error: "User already exists with this email."}, {status: 400});
        }

        // Hash password
        const salt = await bcryptjs.genSalt(10);
        const hashedPassword = await bcryptjs.hash(password, salt);

        // Create new user instance, passing 'email', 'password', and 'role'.
        // Removed 'username' from the newUser object.
        const newUser = new User({
            email,
            password: hashedPassword,
            role, // Pass the role received from the frontend
        });

        const savedUser = await newUser.save();
        console.log("New user saved:", savedUser);

        // Send verification email
        //await sendEmail({ email, emailType: "VERIFY", userId: savedUser._id });

        return NextResponse.json({
            message: "User created successfully! Please check your email for verification.",
            success: true,
            savedUser: { // Return a subset of user data, avoid sending hashed password back
                id: savedUser._id,
                email: savedUser.email,
                role: savedUser.role,
                isVerfied: savedUser.isVerfied
            }
        });

    } catch (error: any) { // Consider refining this 'any' type with a more specific error type or handling
        console.error("Signup API error:", error); // Log the error for debugging
        return NextResponse.json({error: error.message || "An unexpected error occurred."}, {status: 500});
    }
}