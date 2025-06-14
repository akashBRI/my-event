// src/app/api/public-register/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import QRCode from 'qrcode'; // For QR code generation
import { sendRegistrationEmail } from '@/lib/emailService'; // Corrected import: sendRegistrationEmail
import { PrismaClient, Prisma } from '@prisma/client'; // Import PrismaClient and Prisma namespace for typing

// Define a type for occurrence data as it exists in the database
interface EventOccurrence {
  id: string;
  startTime: Date; // Assuming Prisma stores as Date objects
  endTime: Date | null;
  location: string | null;
  eventId: string;
}


// Function to generate a unique pass ID
function generatePassId(): string {
  // Simple UUID-like string generation
  return 'PASS-' + Math.random().toString(36).substring(2, 11).toUpperCase();
}

export async function POST(req: Request) {
  try {
    // Destructure all expected fields from the request body
    const { firstName, lastName, email, phone, company, eventId, selectedOccurrenceIds } = await req.json();

    // 1. Basic Validation
    if (!firstName || !lastName || !email || !phone || !company || !eventId || !selectedOccurrenceIds || selectedOccurrenceIds.length === 0) {
      return NextResponse.json({ error: 'All required fields (First Name, Last Name, Email, Phone, Company, Event, and at least one Session) must be provided.' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format.' }, { status: 400 });
    }

    // Validate phone format (simple check for digits, spaces, +, -)
    const phoneRegex = /^[0-9\s\-\+()]+$/;
    if (!phoneRegex.test(phone)) {
        return NextResponse.json({ error: 'Invalid phone number format.' }, { status: 400 });
    }


    // 2. Check if user already exists or create a new user (or link to existing)
    // Explicitly define user type to allow null initially, then narrow it down.
    let user: Awaited<ReturnType<typeof prisma.user.findUnique>> | null = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Create user if not found
      user = await prisma.user.create({
        data: {
          email,
          firstName,
          lastName,
          phone,
          company,
        },
      });
    } else {
      // If user exists, update their profile with potentially new info
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          firstName: firstName || user.firstName,
          lastName: lastName || user.lastName,
          phone: phone || user.phone,
          company: company || user.company,
        },
      });
    }

    // Ensure user is not null before proceeding. This guarantees TypeScript knows 'user' is defined.
    if (!user) {
      // This case should ideally not be reached if Prisma create/update operations are successful
      return NextResponse.json({ error: 'Failed to create or retrieve user during registration.' }, { status: 500 });
    }


    // 3. Check if user is already registered for this specific event
    const existingRegistration = await prisma.eventRegistration.findUnique({
      where: {
        userId_eventId: {
          userId: user.id, // 'user' is now guaranteed non-null here
          eventId: eventId,
        },
      },
    });

    if (existingRegistration) {
      return NextResponse.json({ error: 'You are already registered for this event.' }, { status: 409 });
    }

    // 4. Validate selected occurrences against the event's actual occurrences
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        occurrences: true,
      },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
    }

    // Filter `event.occurrences` (from DB) to find valid ones based on `selectedOccurrenceIds` (from request)
    const validOccurrences = event.occurrences.filter((occ: EventOccurrence) => selectedOccurrenceIds.includes(occ.id)); // Explicitly type 'occ'
    if (validOccurrences.length !== selectedOccurrenceIds.length) {
      return NextResponse.json({ error: 'One or more selected sessions are invalid for this event.' }, { status: 400 });
    }

    // 5. Generate unique Pass ID and QR Code Data (now a URL)
    const passId = generatePassId();
    // QR code will now encode the direct URL to the PDF pass
    const passUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/event-pass-pdf/${passId}`;
    const qrCodeDataUrl = await QRCode.toDataURL(passUrl); // Generates QR code as a base64 data URL from the URL

    // 6. Create Event Registration and link selected occurrences in a transaction
    // Correctly type the 'tx' parameter using Prisma.TransactionClient
    const newRegistration = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const reg = await tx.eventRegistration.create({ // Use `tx` here
        data: {
          userId: user.id, // 'user' is guaranteed non-null here due to the check above
          eventId: eventId,
          passId: passId,
          qrCodeData: qrCodeDataUrl, // Store the base64 URL of the QR code
          status: 'registered', // Default status for new public registrations
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
              occurrences: true // Include all event occurrences
            }
          },
          selectedOccurrences: {
            include: {
              occurrence: true // Include details of the selected occurrences
            }
          }
        },
      });

      return reg;
    });

    // 7. Send registration confirmation email
    if (newRegistration) {
      await sendRegistrationEmail(newRegistration);
    }

    return NextResponse.json({ message: 'Registration successful! Check your email for pass details.', registrationId: newRegistration.id, passId: newRegistration.passId }, { status: 201 });

  } catch (error: any) {
    console.error('Public registration failed:', error);

    if (error.code === 'P2002' && error.meta?.target === 'EventRegistration_userId_eventId_key') {
      return NextResponse.json({ error: 'You are already registered for this event.' }, { status: 409 });
    }
    // Handle other Prisma or general errors
    if (error instanceof Error) {
      return NextResponse.json({ error: `An unexpected error occurred: ${error.message}` }, { status: 500 });
    }
    return NextResponse.json({ error: 'Something went wrong during registration.' }, { status: 500 });
  }
}
