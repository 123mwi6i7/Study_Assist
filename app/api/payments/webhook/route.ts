import { NextResponse, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    return NextResponse.json({
      ok: true,
      received: true,
      payload,
      message: "Sandbox-safe payment webhook received. Provider verification will be implemented in a live integration phase.",
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Invalid payment webhook payload." },
      { status: 400 },
    );
  }
}
