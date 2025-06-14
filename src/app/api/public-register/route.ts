// src/app/api/public-register/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendEventPassEmail } from '@/lib/emailService';
import QRCode from 'qrcode';

export async function POST(req: Request) {
  try {
    const { firstName, lastName, email, phone, company, eventId } = await req.json();

    if (!firstName || !lastName || !email || !phone || !eventId) {
      return NextResponse.json({ error: 'First Name, Last Name, Email, Phone, and Event are required for registration.' }, { status: 400 });
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
          company, // Can be null if not provided in public form
          emailVerified: new Date(), // Consider this verified via this registration process
          // Password would be null for public registrations unless they set one later
        },
      });
    } else {
      // If user exists, update their details with provided public registration info
      // You might add logic to only update if fields are currently null or empty
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          firstName: user.firstName || firstName, // Only update if existing is null
          lastName: user.lastName || lastName,
          phone: user.phone || phone,
          company: user.company || company,
          // Do not update email or emailVerified here usually
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

    // Find the latest passId to determine the next number
    const latestRegistration = await prisma.eventRegistration.findFirst({
      orderBy: {
        passId: 'desc', // Order by passId in descending order to get the latest
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

    // The QR code data can be a link to the view-pass page or directly encoded data
    const qrCodeData = `${process.env.NEXT_PUBLIC_APP_URL}/view-pass/${passId}`; // Link to view pass page

    const newRegistration = await prisma.eventRegistration.create({
      data: {
        userId: user.id,
        eventId: eventId,
        passId: passId,
        qrCodeData: qrCodeData,
        status: "registered",
      },
      include: { event: true, user: true } // Include event and user for email details
    });

    // 5. Send Email Confirmation with PDF Link
    const pdfLink = `${process.env.NEXT_PUBLIC_APP_URL}/api/event-pass-pdf/${newRegistration.passId}`;
    await sendEventPassEmail(user.email, event.name, newRegistration, pdfLink);

    return NextResponse.json(
      {
        message: 'Registration successful! Your pass details have been sent to your email.',
        registration: {
          passId: newRegistration.passId,
          eventName: event.name,
          eventDate: event.date,
          eventLocation: event.location,
          qrCodeLink: qrCodeData,
          pdfLink: pdfLink
        }
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Public registration error:', error);
    return NextResponse.json({ error: 'Something went wrong during registration.' }, { status: 500 });
  }
}
