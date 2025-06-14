// src/app/api/public-pass/[passId]/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

interface Params {
  params: { passId: string };
}

export async function GET(req: Request, { params }: Params) {
  const { passId } = params;

  if (!passId) {
    return NextResponse.json({ error: 'Pass ID is required.' }, { status: 400 });
  }

  try {
    const registration = await prisma.eventRegistration.findUnique({
      where: { passId },
      include: {
        user: {
          // Corrected: Select firstName and lastName instead of 'name'
          select: { id: true, firstName: true, lastName: true, email: true, phone: true, company: true }
        },
        event: {
          include: {
            occurrences: true // Include occurrences related to the event
          }
        },
        selectedOccurrences: {
          include: {
            occurrence: true // Include the actual occurrence details
          }
        }
      },
    });

    if (!registration) {
      return NextResponse.json({ error: 'Pass not found or invalid.' }, { status: 404 });
    }

    // You might want to simplify the returned data for a public endpoint
    // to avoid exposing too much sensitive information.
    // For now, we'll return a similar structure to view-pass but ensure consistency.
    return NextResponse.json(registration);
  } catch (error: unknown) {
    console.error(`Error fetching public pass details for ID ${passId}:`, error);
    if (error instanceof PrismaClientKnownRequestError) {
      return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: `An unexpected error occurred: ${error.message}` }, { status: 500 });
    }
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
