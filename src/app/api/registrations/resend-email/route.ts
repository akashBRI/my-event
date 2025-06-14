// src/app/api/registrations/resend-email/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendEventPassEmail } from '@/lib/emailService'; // Changed to sendEventPassEmail
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

// This API route handles resending the registration email for a given registration ID.
export async function POST(req: Request) {
  try {
    const { registrationId } = await req.json();

    // Validate that registrationId is provided.
    if (!registrationId) {
      return NextResponse.json({ error: 'Registration ID is required.' }, { status: 400 });
    }

    // Fetch the full registration details, including all necessary related data
    // that the `sendEventPassEmail` function expects.
    const registration = await prisma.eventRegistration.findUnique({
      where: { id: registrationId },
      include: {
        user: true, // Include user details (for email, name)
        event: {
          include: {
            occurrences: true, // Include all event occurrences to match email template needs
          },
        },
        selectedOccurrences: {
          include: {
            occurrence: true, // Include details of the specific selected occurrences
          },
        },
      },
    });

    // If no registration is found, return a 404 error.
    if (!registration) {
      return NextResponse.json({ error: 'Registration not found.' }, { status: 404 });
    }

    // Prepare arguments for sendEventPassEmail
    const toEmail = registration.user.email;
    const eventName = registration.event.name;
    const pdfLink = `${process.env.NEXT_PUBLIC_APP_URL}/api/event-pass-pdf/${registration.passId}`;

    // Call the email service to send the registration email with all required arguments.
    console.log(registration);
    
    await sendEventPassEmail(toEmail, eventName, registration, pdfLink);

    // Return a success response.
    return NextResponse.json({ message: 'Registration email resent successfully.' }, { status: 200 });

  } catch (error: unknown) {
    console.error('Error resending registration email:', error);

    // Handle specific Prisma errors, e.g., if the ID format is wrong
    if (error instanceof PrismaClientKnownRequestError) {
      return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 });
    }
    // Handle general errors
    if (error instanceof Error) {
      return NextResponse.json({ error: `An unexpected error occurred: ${error.message}` }, { status: 500 });
    }
    // Fallback for any other unexpected errors
    return NextResponse.json({ error: 'Something went wrong during email resend.' }, { status: 500 });
  }
}
