import { NextResponse } from "next/server";
import { AuthorizationError } from "@/lib/auth/authorize";
import { getCurrentUser } from "@/lib/auth/guards";
import { clientIp } from "@/lib/security/client-ip";
import { objectId } from "@/lib/validation/common";
import { readSellerDocumentFor } from "@/modules/sellers/service";

type Params = { params: Promise<{ sellerId: string }> };

/**
 * GET /admin/sellers/[id]/document — an admin downloads a shop's business registration (ADR-006).
 * middleware.ts already requires admin + TOTP for /admin; the service checks the role again.
 * Always an attachment, never cached, sandboxed: a hostile PDF can't run in our origin.
 */
export async function GET(_req: Request, { params }: Params): Promise<Response> {
  const id = objectId.safeParse((await params).sellerId);
  if (!id.success) return new NextResponse("Not found", { status: 404 });
  try {
    const doc = await readSellerDocumentFor(await getCurrentUser(), id.data, { ip: await clientIp() });
    if (!doc) return new NextResponse("Not found", { status: 404 });
    return new NextResponse(new Uint8Array(doc.bytes), {
      headers: {
        "Content-Type": doc.contentType,
        "Content-Disposition": `attachment; filename="${doc.filename}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "sandbox; default-src 'none'",
      },
    });
  } catch (e) {
    if (e instanceof AuthorizationError) return new NextResponse("Forbidden", { status: 403 });
    throw e;
  }
}
