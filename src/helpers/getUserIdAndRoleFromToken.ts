// helpers/getUserIdAndRoleFromToken.ts
import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
// --- CHANGE START ---
import User from "../models/userModel"; // Relative path to .js model
// --- CHANGE END ---

interface IUserDataFromDB {
    _id: string;
    role: string;
}

export const getUserIdAndRoleFromToken = async (request: NextRequest): Promise<{ id: string; role: string } | null> => {
    try {
        const token = request.cookies.get("token")?.value || "";
        if (!token) {
            return null;
        }

        const decodedToken = jwt.verify(token, process.env.TOKEN_SECRET!) as { id: string; username: string; email: string };

        const user: IUserDataFromDB | null = await User.findById(decodedToken.id).select("_id role");

        if (!user) {
            return null;
        }

        return { id: user._id.toString(), role: user.role };

    } catch (error) {
        console.error("Error getting user from token:", error);
        return null;
    }
};