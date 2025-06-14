// src/app/api/public-register/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendEventPassEmail } from '@/lib/emailService';
import QRCode from 'qrcode';

export async function POST(req: Request) {
  try {
    const { firstName, lastName, email, phone, company, eventId, selectedOccurrenceIds } = await req.json();

    if (!firstName || !lastName || !email || !phone || !eventId || !selectedOccurrenceIds || !Array.isArray(selectedOccurrenceIds) || selectedOccurrenceIds.length === 0) {
      return NextResponse.json({ error: 'First Name, Last Name, Email, Phone, Event, and at least one session are required for registration.' }, { status: 400 });
    }

    // 1. Find or Create User
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          firstName,
          lastName,
          email,
          phone,
          company,
          emailVerified: new Date(),
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          firstName: user.firstName || firstName,
          lastName: user.lastName || lastName,
          phone: user.phone || phone,
          company: user.company || company,
        },
      });
    }

    // 2. Check if already registered for this event
    const existingRegistration = await prisma.eventRegistration.findUnique({
      where: {
        userId_eventId: {
          userId: user.id,
          eventId: eventId,
        },
      },
    });

    if (existingRegistration) {
      return NextResponse.json({ message: 'You are already registered for this event.', registration: existingRegistration }, { status: 200 });
    }

    // 3. Check event capacity
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { registrations: true },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
    }

    if (event.maxCapacity && event.registrations.length >= event.maxCapacity) {
      return NextResponse.json({ error: 'Event has reached its maximum capacity.' }, { status: 400 });
    }

    // 4. Generate dynamic passId
    let newPassNumber = 1000; // Starting number for passId

    const latestRegistration = await prisma.eventRegistration.findFirst({
      orderBy: {
        passId: 'desc',
      },
      select: {
        passId: true,
      },
    });

    if (latestRegistration && latestRegistration.passId) {
      const lastNumericPart = parseInt(latestRegistration.passId.replace('BRI-', ''));
      if (!isNaN(lastNumericPart)) {
        newPassNumber = lastNumericPart + 1;
      }
    }

    const passId = `BRI-${newPassNumber}`;

    const qrCodeData = `${process.env.NEXT_PUBLIC_APP_URL}/view-pass/${passId}`;

    // 5. Create Event Registration
    const newRegistration = await prisma.eventRegistration.create({
      data: {
        userId: user.id,
        eventId: eventId,
        passId: passId,
        qrCodeData: qrCodeData,
        status: "registered",
        selectedOccurrences: {
          create: selectedOccurrenceIds.map((occId: string) => ({
            occurrence: {
              connect: { id: occId }
            }
          })),
        },
      },
      include: {
        user: true,
        event: {
          include: {
            occurrences: true, // Crucial: Include event occurrences for email content
          }
        },
        selectedOccurrences: { // Crucial: Include selected occurrences for email content
          include: {
            occurrence: true,
          }
        }
      }
    });

    // 6. Send Email Confirmation with PDF Link
    const pdfLink = `${process.env.NEXT_PUBLIC_APP_URL}/api/event-pass-pdf/${newRegistration.passId}`;
    await sendEventPassEmail(user.email, event.name, newRegistration, pdfLink);

    return NextResponse.json(
      {
        message: 'Registration successful! Your pass details have been sent to your email.',
        registration: {
          passId: newRegistration.passId,
          eventName: event.name,
          eventLocation: event.location,
          qrCodeLink: qrCodeData,
          pdfLink: pdfLink,
          selectedOccurrences: newRegistration.selectedOccurrences.map((so: { id: string; occurrence: { id: string; startTime: Date; endTime: Date | null; location: string | null; } }) => ({
            id: so.occurrence.id,
            startTime: so.occurrence.startTime,
            endTime: so.occurrence.endTime,
            location: so.occurrence.location
          }))
        }
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Public registration error:', error);
    return NextResponse.json({ error: 'Something went wrong during registration.' }, { status: 500 });
  }
}
