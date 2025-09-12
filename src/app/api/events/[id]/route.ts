// src/app/api/events/[id]/route.ts
import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function toIntOrNull(v: any) {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function validateCoreFields(body: any) {
  const errs: string[] = [];
  const need = (k: string) => !body[k] || String(body[k]).trim() === "";

  if (need("name")) errs.push("Event Name is required.");
  if (need("description")) errs.push("Description is required.");
  if (need("location")) errs.push("Main Event Location is required.");
  if (need("googleMapsLink")) errs.push("Google Maps Link is required.");
  if (need("contactEmail")) errs.push("Contact Email is required.");
  if (need("contactPhone")) errs.push("Contact Phone is required.");

  if (typeof body.googleMapsLink === "string" && body.googleMapsLink && !/^https?:\/\//i.test(body.googleMapsLink)) {
    errs.push("Google Maps Link must be a valid URL (start with http/https).");
  }
  if (typeof body.contactEmail === "string" && body.contactEmail) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.contactEmail)) errs.push("Invalid format for Contact Email.");
  }
  if (typeof body.contactPhone === "string" && body.contactPhone) {
    const phoneRegex = /^[0-9\s\-\+()]+$/;
    if (!phoneRegex.test(body.contactPhone)) errs.push("Invalid format for Contact Phone.");
  }
  if (body.maxCapacity !== undefined && body.maxCapacity !== null && body.maxCapacity !== "") {
    const n = Number(body.maxCapacity);
    if (!Number.isFinite(n) || n <= 0) errs.push("Max Capacity must be a positive number.");
  }
  return errs;
}

function validateOccurrences(occurrences: any[]) {
  const errs: string[] = [];
  if (!Array.isArray(occurrences) || occurrences.length === 0) {
    errs.push("At least one occurrence is required.");
    return errs;
  }
  for (const occ of occurrences) {
    if (!occ.startTime) { errs.push("Each occurrence must have a startTime."); continue; }
    const s = new Date(occ.startTime);
    if (isNaN(s.getTime())) errs.push(`Invalid date format for occurrence start time: ${occ.startTime}`);
    if (occ.endTime) {
      const e = new Date(occ.endTime);
      if (isNaN(e.getTime())) errs.push(`Invalid date format for occurrence end time: ${occ.endTime}`);
      if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && e < s) errs.push("Occurrence endTime cannot be before startTime.");
    }
  }
  return errs;
}

/** Allow preflight */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Allow": "PUT,DELETE,OPTIONS",
      "Access-Control-Allow-Methods": "PUT,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

/** PUT /api/events/[id] — full update + replace/sync occurrences */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  try {
    const body = await req.json();
    const { name, description, location, googleMapsLink, contactEmail, contactPhone, maxCapacity, occurrences = [] } = body || {};

    const coreErrs = validateCoreFields(body);
    if (coreErrs.length) return NextResponse.json({ error: coreErrs.join(" ") }, { status: 400 });

    const occErrs = validateOccurrences(occurrences);
    if (occErrs.length) return NextResponse.json({ error: occErrs.join(" ") }, { status: 400 });

    const existing = await prisma.event.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Event not found." }, { status: 404 });

    const updated = await prisma.$transaction(async (tx) => {
      // Existing occurrences for this event
      const existingOccs = await tx.eventOccurrence.findMany({ where: { eventId: id }, select: { id: true } });
      const existingIdSet = new Set(existingOccs.map(o => o.id));

      // Keep only ids that belong to this event
      const incomingIds = occurrences.filter((o: any) => o.id && existingIdSet.has(String(o.id))).map((o: any) => String(o.id));

      // Delete occurrences that aren't in incoming payload
      await tx.eventOccurrence.deleteMany({
        where: { eventId: id, NOT: { id: { in: incomingIds.length ? incomingIds : [""] } } },
      });

      // Update existing / create new
      for (const occ of occurrences) {
        const data = {
          startTime: new Date(occ.startTime),
          endTime: occ.endTime ? new Date(occ.endTime) : null,
          location: occ.location || null,
        };
        if (occ.id) {
          const occId = String(occ.id);
          if (!existingIdSet.has(occId)) {
            return NextResponse.json({ error: `Occurrence ${occId} does not belong to this event.` }, { status: 400 }) as unknown as any;
          }
          await tx.eventOccurrence.update({ where: { id: occId }, data });
        } else {
          await tx.eventOccurrence.create({ data: { ...data, eventId: id } });
        }
      }

      const event = await tx.event.update({
        where: { id },
        data: { name, description, location, googleMapsLink, contactEmail, contactPhone, maxCapacity: toIntOrNull(maxCapacity) },
        include: {
          occurrences: { orderBy: { startTime: "asc" } },
          registrations: { select: { id: true } },
        },
      });

      return event;
    });

    if (updated instanceof NextResponse) return updated;
    return NextResponse.json(updated);
  } catch (error: unknown) {
    console.error("Error updating event (PUT):", error);
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === "P2002" && error.meta?.target) {
        if (Array.isArray(error.meta.target) && error.meta.target.includes("eventId") && error.meta.target.includes("startTime")) {
          return NextResponse.json({ error: "Duplicate event occurrence: An event cannot have two occurrences starting at the exact same time." }, { status: 409 });
        }
      }
      return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 });
    }
    const message = error instanceof Error ? error.message : "Something went wrong.";
    return NextResponse.json({ error: `An unexpected error occurred: ${message}` }, { status: 500 });
  }
}

/** DELETE /api/events/[id] — delete everything related to the event */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  try {
    await prisma.$transaction(async (tx) => {
      await tx.eventRegistration.deleteMany({ where: { eventId: id } });
      await tx.eventOccurrence.deleteMany({ where: { eventId: id } });
      await tx.event.delete({ where: { id } });
    });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error("Error deleting event:", error);
    const message = error instanceof Error ? error.message : "Something went wrong.";
    return NextResponse.json({ error: `An unexpected error occurred while deleting the event: ${message}` }, { status: 500 });
  }
}


export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
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