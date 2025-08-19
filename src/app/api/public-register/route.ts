// src/app/api/public-register/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import QRCode from 'qrcode'; // For QR code generation
import { sendEventPassEmail } from '@/lib/emailService'; // Changed to sendEventPassEmail
import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

// Define a type for occurrence data as it exists in the database
interface EventOccurrence {
  id: string;
  startTime: Date;
  endTime: Date | null;
  location: string | null;
  eventId: string;
}

// Function to generate a unique sequential pass ID like BRI-1001
// This function attempts to find the highest existing sequential number
// and increments it. It includes a basic retry for generation, but the
// ultimate uniqueness guarantee comes from the database's unique constraint
// and the retry logic in the POST handler.
async function generatePassId(): Promise<string> {
  const prefix = 'BRI-';
  let nextNumber = 1001; // Start from 1001

  // Find the highest existing pass ID number
  const latestRegistration = await prisma.eventRegistration.findFirst({
    where: {
      passId: {
        startsWith: prefix,
      },
    },
    orderBy: {
      passId: 'desc', // Assuming string comparison works for BRI-000... numbers
    },
    select: {
      passId: true,
    },
  });

  if (latestRegistration && latestRegistration.passId) {
    const lastNumberStr = latestRegistration.passId.replace(prefix, '');
    const lastNumber = parseInt(lastNumberStr, 10);
    if (!isNaN(lastNumber) && lastNumber >= 1000) { // Ensure it's a valid number and at least our starting point
      nextNumber = lastNumber + 1;
    }
  }

  // Changed: No longer padding to 9 digits with leading zeros.
  // The number will now appear as its natural length (e.g., 1001, 10000, 999999999).
  const formattedNumber = String(nextNumber);
  return `${prefix}${formattedNumber}`;
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
    let user: Awaited<ReturnType<typeof prisma.user.findUnique>> | null = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
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

    if (!user) {
      return NextResponse.json({ error: 'Failed to create or retrieve user during registration.' }, { status: 500 });
    }

    const nonNullUser = user;

    // 3. Check if user is already registered for this specific event
    const existingRegistration = await prisma.eventRegistration.findUnique({
      where: {
        userId_eventId: {
          userId: nonNullUser.id,
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

    const validOccurrences = event.occurrences.filter((occ: EventOccurrence) => selectedOccurrenceIds.includes(occ.id));
    if (validOccurrences.length !== selectedOccurrenceIds.length) {
      return NextResponse.json({ error: 'One or more selected sessions are invalid for this event.' }, { status: 400 });
    }

    let newRegistration;
    let retries = 0;
    const MAX_RETRIES = 5; // Limit retries to prevent infinite loops in extreme cases

    do {
      try {
        const passId = await generatePassId(); // Generate new sequential pass ID
        const passUrl = `https://bri-event.vercel.app/api/event-pass-pdf/${passId}`;
        const qrCodeDataUrl = await QRCode.toDataURL(passUrl);

        // 6. Create Event Registration and link selected occurrences in a transaction
        newRegistration = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          const reg = await tx.eventRegistration.create({
            data: {
              userId: nonNullUser.id,
              eventId: eventId,
              passId: passId,
              qrCodeData: qrCodeDataUrl,
              status: 'registered',
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
                  occurrences: true
                }
              },
              selectedOccurrences: {
                include: {
                  occurrence: true
                }
              }
            },
          });
          return reg;
        });
      } catch (transactionError: any) {
        if (transactionError instanceof PrismaClientKnownRequestError && transactionError.code === 'P2002' && transactionError.meta?.target === 'EventRegistration_passId_key') {
          // Collision detected on passId, retry
          console.warn(`Pass ID collision detected for ${transactionError.meta?.target}. Retrying... (Attempt ${retries + 1})`);
          retries++;
          if (retries >= MAX_RETRIES) {
            throw new Error('Maximum pass ID generation retries reached due to collisions.');
          }
        } else {
          // Re-throw other errors
          throw transactionError;
        }
      }
    } while (!newRegistration && retries < MAX_RETRIES);

    if (!newRegistration) {
      return NextResponse.json({ error: 'Failed to generate a unique pass ID after multiple retries. Please try again.' }, { status: 500 });
    }

    console.log(newRegistration);
    // 7. Send registration confirmation email
    // Prepare arguments for sendEventPassEmail
    const toEmail = newRegistration.user.email;
    const eventName = newRegistration.event.name;
     const pdfLink = `https://bri-event.vercel.app/api/event-pass-pdf/${registration.passId}`; // Assuming NEXT_PUBLIC_BASE_URL for frontend
    
    await sendEventPassEmail(toEmail, eventName, newRegistration, pdfLink);

    return NextResponse.json({ message: 'Registration successful! Check your email for pass details.', registrationId: newRegistration.id, passId: newRegistration.passId }, { status: 201 });

  } catch (error: any) {
    console.error('Public registration failed:', error);

    if (error.code === 'P2002' && error.meta?.target === 'EventRegistration_userId_eventId_key') {
      return NextResponse.json({ error: 'You are already registered for this event.' }, { status: 409 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: `An unexpected error occurred: ${error.message}` }, { status: 500 });
    }
    return NextResponse.json({ error: 'Something went wrong during registration.' }, { status: 500 });
  }
}

