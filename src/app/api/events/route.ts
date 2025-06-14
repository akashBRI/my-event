// src/app/api/events/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

export async function POST(req: Request) {
  try {
    // Destructure all required fields from the request body at once
    const { name, description, location, googleMapsLink, contactEmail, contactPhone, maxCapacity, occurrences } = await req.json();

    // Validate all required fields
    if (!name || !description || !location || !googleMapsLink || !contactEmail || !contactPhone || !occurrences || !Array.isArray(occurrences) || occurrences.length === 0) {
      return NextResponse.json({ error: 'All fields (Name, Description, Location, Google Maps Link, Contact Email, Contact Phone, and at least one Occurrence) are required.' }, { status: 400 });
    }

    // Validate email and phone formats for consistency
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactEmail)) {
      return NextResponse.json({ error: 'Invalid format for Contact Email.' }, { status: 400 });
    }
    const phoneRegex = /^[0-9\s\-\+()]+$/;
    if (!phoneRegex.test(contactPhone)) {
      return NextResponse.json({ error: 'Invalid format for Contact Phone.' }, { status: 400 });
    }
    if (!googleMapsLink.startsWith('http')) {
      return NextResponse.json({ error: 'Google Maps Link must be a valid URL (start with http/https).' }, { status: 400 });
    }


    // Validate each occurrence
    for (const occ of occurrences) {
      if (!occ.startTime) {
        return NextResponse.json({ error: 'Each occurrence must have a startTime.' }, { status: 400 });
      }
      if (isNaN(new Date(occ.startTime).getTime())) {
        return NextResponse.json({ error: `Invalid date format for occurrence: ${occ.startTime}` }, { status: 400 });
      }
      if (occ.endTime && isNaN(new Date(occ.endTime).getTime())) {
        return NextResponse.json({ error: `Invalid date format for occurrence end time: ${occ.endTime}` }, { status: 400 });
      }
    }

    const newEvent = await prisma.event.create({
      data: {
        name,
        description,
        location,
        googleMapsLink,
        contactEmail,
        contactPhone,
        maxCapacity: maxCapacity ? parseInt(maxCapacity) : null,
        occurrences: {
          create: occurrences.map((occ: any) => ({
            startTime: new Date(occ.startTime),
            endTime: occ.endTime ? new Date(occ.endTime) : null,
            location: occ.location
          })),
        },
      },
      include: {
        occurrences: true,
      },
    });

    return NextResponse.json(newEvent, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating event:', error);

    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2002' && error.meta?.target) {
        if (Array.isArray(error.meta.target) && error.meta.target.includes('eventId') && error.meta.target.includes('startTime')) {
          return NextResponse.json({ error: 'Duplicate event occurrence: An event cannot have two occurrences starting at the exact same time.' }, { status: 409 });
        }
      }
      return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: `An unexpected error occurred: ${error.message}` }, { status: 500 });
    }
    return NextResponse.json({ error: 'Something went wrong during event creation.' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const events = await prisma.event.findMany({
      include: {
        occurrences: {
          orderBy: { startTime: 'asc' }
        },
        registrations: {
          select: { id: true }
        }
      }
    });
    return NextResponse.json(events);
  } catch (error: unknown) {
    console.error('Error fetching events:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: `An unexpected error occurred: ${error.message}` }, { status: 500 });
    }
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
