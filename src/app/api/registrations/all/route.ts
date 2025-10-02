import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/registrations/all
 * - Returns ALL registrations (no pagination)
 * - Includes full user, event(+occurrences), and selectedOccurrences(+occurrence)
 */
export async function GET() {
  try {
    const data = await prisma.eventRegistration.findMany({
      orderBy: { registrationDate: "desc" },
      include: {
        user: true, // all user fields
        event: {
          include: {
            occurrences: true, // all event occurrences
          },
        },
        selectedOccurrences: {
          include: {
            occurrence: true, // the chosen occurrence(s) for this registration
          },
          orderBy: { occurrence: { startTime: "asc" } },
        },
      },
    });

    return NextResponse.json({ data, total: data.length });
  } catch (error: any) {
    console.error("Error fetching ALL registrations:", error);
    return NextResponse.json(
      { error: error?.message ?? "Failed to fetch registrations" },
      { status: 500 }
    );
  }
}
