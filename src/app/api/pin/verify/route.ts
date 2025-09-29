import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { pin } = await req.json();

    // NEVER expose the secret on the client. Read from env on server only.
    const secret = process.env.DASHBOARD_PIN;
    const ok = Boolean(secret) && String(pin) === String(secret);

    // Prepare response
    const res = NextResponse.json({ ok });

    // Optional cookie (non-HttpOnly so client can read if you want; flip to HttpOnly if you protect via middleware)
    if (ok) {
      res.headers.append(
        "Set-Cookie",
        [
          `pin_access=granted`,
          `Path=/`,
          `Max-Age=${60 * 60 * 8}`,      // 8 hours
          `SameSite=Lax`,
          `Secure`,
        ].join("; ")
      );
    } else {
      // clear cookie
      res.headers.append(
        "Set-Cookie",
        [`pin_access=`, `Path=/`, `Max-Age=0`, `SameSite=Lax`, `Secure`].join("; ")
      );
    }

    return res;
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Invalid request" }, { status: 400 });
  }
}
