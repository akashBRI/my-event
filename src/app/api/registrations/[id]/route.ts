// src/app/api/registrations/[id]/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

interface Params {
  params: { id: string };
}

// GET a single registration by ID
export async function GET(req: Request, { params }: Params) {
  const { id } = params;

  if (!id) {
    return NextResponse.json({ error: 'Registration ID is required.' }, { status: 400 });
  }

  try {
    const registration = await prisma.eventRegistration.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            company: true,
          },
        },
        event: {
          select: {
            id: true,
            name: true,
            location: true,
            googleMapsLink: true,
            contactEmail: true,
            contactPhone: true,
          },
        },
        selectedOccurrences: {
          include: {
            occurrence: true,
          },
          orderBy: {
            occurrence: {
              startTime: 'asc'
            }
          }
        }
      },
    });

    if (!registration) {
      return NextResponse.json({ error: 'Registration not found.' }, { status: 404 });
    }

    return NextResponse.json(registration);
  } catch (error: unknown) {
    console.error(`Error fetching registration with ID ${id}:`, error);
    if (error instanceof PrismaClientKnownRequestError) {
      return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: `An unexpected error occurred: ${error.message}` }, { status: 500 });
    }
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}

// PATCH/PUT (Update) a registration by ID
export async function PATCH(req: Request, { params }: Params) {
  const { id } = params;

  if (!id) {
    return NextResponse.json({ error: 'Registration ID is required for update.' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { status, userId, eventId, selectedOccurrenceIds, ...otherFields } = body; // Destructure to safely update

    // Validate if status is a valid enum value if you have one in Prisma
    const allowedStatuses = ['registered', 'checked-in', 'cancelled']; // Example statuses
    if (status && !allowedStatuses.includes(status)) {
      return NextResponse.json({ error: `Invalid status provided. Allowed: ${allowedStatuses.join(', ')}` }, { status: 400 });
    }

    // Prepare data for update. Only include fields that can be updated.
    const updateData: any = {};
    if (status) {
      updateData.status = status;
    }
    // Add other editable fields here if you expand the edit form in frontend.
    // E.g., if you want to allow changing user/event, you'd handle linking logic.
    // For now, only status is expected from the frontend edit modal.

    const updatedRegistration = await prisma.eventRegistration.update({
      where: { id },
      data: updateData,
      include: { // Include updated data in response
        user: true,
        event: true,
        selectedOccurrences: {
          include: { occurrence: true }
        }
      }
    });

    return NextResponse.json(updatedRegistration);
  } catch (error: unknown) {
    console.error(`Error updating registration with ID ${id}:`, error);
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2025') { // Prisma error code for "record not found"
        return NextResponse.json({ error: 'Registration not found.' }, { status: 404 });
      }
      return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: `An unexpected error occurred: ${error.message}` }, { status: 500 });
    }
    return NextResponse.json({ error: 'Something went wrong during update.' }, { status: 500 });
  }
}

// DELETE a registration by ID
export async function DELETE(req: Request, { params }: Params) {
  const { id } = params;

  if (!id) {
    return NextResponse.json({ error: 'Registration ID is required for deletion.' }, { status: 400 });
  }

  try {
    // Delete associated EventOccurrenceRegistration records first if onDelete: Cascade isn't set
    // or if you want to explicitly handle it for clarity/logging.
    // With `onDelete: Cascade` on the relation, Prisma handles this automatically when deleting EventRegistration.
    await prisma.eventRegistration.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Registration deleted successfully.' }, { status: 200 });
  } catch (error: unknown) {
    console.error(`Error deleting registration with ID ${id}:`, error);
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Registration not found.' }, { status: 404 });
      }
      return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: `An unexpected error occurred: ${error.message}` }, { status: 500 });
    }
    return NextResponse.json({ error: 'Something went wrong during deletion.' }, { status: 500 });
  }
}
