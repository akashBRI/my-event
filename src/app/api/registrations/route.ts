// src/app/api/registrations/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

// Force this route to be dynamic, preventing static generation issues with request.url
export const dynamic = 'force-dynamic';

// GET all registrations with pagination, filter, and sort (search is client-side now)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Filters (searchTerm handling removed from backend)
    const statusFilter = searchParams.get('status') || '';
    const eventNameFilter = searchParams.get('eventName') || '';
    const userEmailFilter = searchParams.get('userEmail') || '';

    // Sorting
    const sortBy = searchParams.get('sortBy') || 'registrationDate'; // Default sort key
    const sortDirection = searchParams.get('sortDirection') === 'descending' ? 'desc' : 'asc'; // Default sort direction

    // Constructing the WHERE clause for Prisma
    const where: any = {};

    // Filters
    if (statusFilter) {
      where.status = statusFilter;
    }
    if (eventNameFilter) {
      where.event = {
        name: { contains: eventNameFilter, mode: 'insensitive' }
      };
    }
    if (userEmailFilter) {
      where.user = {
        email: { contains: userEmailFilter, mode: 'insensitive' }
      };
    }

    // Constructing the ORDER BY clause for Prisma
    const orderBy: any = {};
    if (sortBy.startsWith('user.')) {
      orderBy.user = { [sortBy.split('.')[1]]: sortDirection };
    } else if (sortBy.startsWith('event.')) {
      orderBy.event = { [sortBy.split('.')[1]]: sortDirection };
    } else {
      orderBy[sortBy] = sortDirection;
    }

    const [registrations, total] = await prisma.$transaction([
      prisma.eventRegistration.findMany({
        where,
        take: limit,
        skip: skip,
        orderBy,
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
            },
          },
          selectedOccurrences: { // THIS FIELD MUST BE RECOGNIZED BY PRISMA CLIENT
            include: {
              occurrence: true, // Include details of the related occurrence
            },
            orderBy: {
              occurrence: {
                startTime: 'asc'
              }
            }
          }
        },
      }),
      prisma.eventRegistration.count({ where }), // Get total count for pagination
    ]);

    return NextResponse.json({ data: registrations, total });

  } catch (error: unknown) {
    console.error('Error fetching registrations:', error);
    if (error instanceof PrismaClientKnownRequestError) {
      // P2002 is for unique constraint violation, P2025 for record not found etc.
      // The current error `Unknown field selectedOccurrences` is a validation error.
      // This implies the schema is not updated in Prisma Client.
      return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: `An unexpected error occurred: ${error.message}` }, { status: 500 });
    }
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}

// POST endpoint (optional, usually handled by public-register or an admin form)
// This remains commented out as its primary use case is handled by /api/public-register
// export async function POST(req: Request) {
//   return NextResponse.json({ message: "POST not implemented for this route directly." }, { status: 501 });
// }
