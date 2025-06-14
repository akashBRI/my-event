// src/app/api/events/[id]/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

interface Params {
  params: { id: string };
}

export async function GET(req: Request, { params }: Params) {
  const { id } = params;

  if (!id) {
    return NextResponse.json({ error: 'Event ID is required.' }, { status: 400 });
  }

  try {
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        occurrences: {
          orderBy: { startTime: 'asc' } // Order occurrences by start time
        },
        registrations: {
          select: { id: true, userId: true, status: true } // Select relevant registration fields
        }
      }
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
    }

    return NextResponse.json(event);
  } catch (error: unknown) {
    console.error(`Error fetching event with ID ${id}:`, error);
    if (error instanceof PrismaClientKnownRequestError) {
      return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: `An unexpected error occurred: ${error.message}` }, { status: 500 });
    }
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
