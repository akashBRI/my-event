import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

export const dynamic = "force-dynamic";

const SORT_MAP = {
  registrationDate: { path: "registrationDate" as const },
  status: { path: "status" as const },
  "user.firstName": { path: "user" as const, key: "firstName" as const },
  "user.lastName":  { path: "user" as const, key: "lastName" as const },
  "user.email":     { path: "user" as const, key: "email" as const },
  "user.company":   { path: "user" as const, key: "company" as const },
  "event.name":     { path: "event" as const, key: "name" as const },
};

function parseSearchDateRange(raw: string) {
  const ts = Date.parse(raw);
  if (Number.isNaN(ts)) return null;
  const start = new Date(ts); start.setHours(0,0,0,0);
  const end = new Date(start); end.setDate(end.getDate() + 1);
  return { gte: start, lt: end };
}

function buildWhere(params: URLSearchParams) {
  const status     = (params.get("status")     || "").trim();
  const search     = (params.get("searchTerm") || "").trim();
  const eventId    = (params.get("eventId")    || "").trim();
  const sessionId  = (params.get("sessionId")  || "").trim();

  const where: any = {};

  if (status) where.status = status;
  if (eventId) (where.event ??= {}), (where.event.id = eventId);
  if (sessionId) where.selectedOccurrences = { some: { occurrenceId: sessionId } };

  if (search) {
    const dateRange = parseSearchDateRange(search);
    const or: any[] = [
      { status: { contains: search, mode: "insensitive" } },
      { passId: { contains: search, mode: "insensitive" } },
      { qrCodeData: { contains: search, mode: "insensitive" } },
      { event: { name: { contains: search, mode: "insensitive" } } },
      { event: { location: { contains: search, mode: "insensitive" } } },
      { user:  { firstName: { contains: search, mode: "insensitive" } } },
      { user:  { lastName:  { contains: search, mode: "insensitive" } } },
      { user:  { email:     { contains: search, mode: "insensitive" } } },
      { user:  { phone:     { contains: search, mode: "insensitive" } } },
      { user:  { company:   { contains: search, mode: "insensitive" } } },
      { selectedOccurrences: { some: { occurrence: { location: { contains: search, mode: "insensitive" } } } } },
    ];
    if (dateRange) or.push({ registrationDate: dateRange });
    where.AND = [...(where.AND ?? []), { OR: or }];
  }

  return where;
}

function buildOrderBy(sortBy: string, sortDirection: "asc" | "desc") {
  let orderBy: any = { registrationDate: "desc" };
  const mapping = SORT_MAP[sortBy as keyof typeof SORT_MAP];
  if (mapping) {
    if (mapping.path === "registrationDate" || mapping.path === "status") {
      orderBy = { [mapping.path]: sortDirection };
    } else if (mapping.path === "user" && mapping.key) {
      orderBy = { user: { [mapping.key]: sortDirection } };
    } else if (mapping.path === "event" && mapping.key) {
      orderBy = { event: { [mapping.key]: sortDirection } };
    }
  }
  return orderBy;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const params = url.searchParams;

    const page  = Math.max(1, parseInt(params.get("page")  || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(params.get("limit") || "10", 10)));
    const skip  = (page - 1) * limit;

    const sortBy = (params.get("sortBy") || "registrationDate").trim();
    const sortDirection = params.get("sortDirection") === "ascending" ? "asc" : "desc";

    const where   = buildWhere(params);
    const orderBy = buildOrderBy(sortBy, sortDirection);

    const [data, total] = await prisma.$transaction([
      prisma.eventRegistration.findMany({
        where,
        take: limit,
        skip,
        orderBy,
        include: {
          user:  { select: { id: true, firstName: true, lastName: true, email: true, phone: true, company: true } },
          event: { select: { id: true, name: true, location: true } },
          selectedOccurrences: {
            include: { occurrence: true },
            orderBy: { occurrence: { startTime: "asc" } },
          },
        },
      }),
      prisma.eventRegistration.count({ where }),
    ]);

    return NextResponse.json({ data, total, page, limit });
  } catch (error: any) {
    console.error("Error fetching registrations:", error);
    if (error instanceof PrismaClientKnownRequestError) {
      return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 });
    }
    return NextResponse.json({ error: `An unexpected error occurred: ${error?.message ?? "Unknown error"}` }, { status: 500 });
  }
}
