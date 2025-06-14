// src/app/api/public-pass/[passId]/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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
          select: { id: true, name: true, email: true } // Select minimal user info for public view
        },
        event: true,
      },
    });

    if (!registration) {
      return NextResponse.json({ error: 'Event pass not found.' }, { status: 404 });
    }

    // Return only necessary public data
    return NextResponse.json({
        id: registration.id,
        passId: registration.passId,
        registrationDate: registration.registrationDate,
        status: registration.status,
        qrCodeData: registration.qrCodeData, // The QR code data is usually a public link
        user: {
            id: registration.user.id,
            name: registration.user.name,
            email: registration.user.email // Or just name if email is too sensitive for public
        },
        event: {
            id: registration.event.id,
            name: registration.event.name,
            description: registration.event.description,
            date: registration.event.date,
            location: registration.event.location
        }
    });
  } catch (error) {
    console.error('Error fetching public pass details:', error);
    return NextResponse.json({ error: 'Failed to retrieve pass details.' }, { status: 500 });
  }
}