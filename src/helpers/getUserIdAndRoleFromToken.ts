import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import User from "../models/userModel";

interface IUserDataFromDB {
  _id: string;
  role: string;
}

export const getUserIdAndRoleFromToken = async (
  request: NextRequest
): Promise<{ id: string; role: string } | null> => {
  try {
    const token = request.cookies.get("token")?.value || "";
    if (!token) {
      return null;
    }

    const decodedToken = jwt.verify(token, process.env.TOKEN_SECRET!) as {
      id: string;
      username: string;
      email: string;
    };

    const user = await User.findById(decodedToken.id)
      .select("_id role")
      .lean() as IUserDataFromDB | null;

    if (!user) {
      return null;
    }

    return { id: user._id.toString(), role: user.role };
  } catch (error) {
    console.error("Error getting user from token:", error);
    return null;
  }
};
