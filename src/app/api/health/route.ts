import { NextResponse } from "next/server";
import { getPortalBackendMode } from "@/lib/supabase/env";

export async function GET() {
  return NextResponse.json({
    ok: true,
    backendMode: getPortalBackendMode(),
    timestamp: new Date().toISOString(),
  });
}
