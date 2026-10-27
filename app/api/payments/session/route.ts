import { NextResponse, type NextRequest } from "next/server";
import { requireSignedInProfile } from "@/lib/auth/guards";
import { createPaymentSession } from "@/lib/payments/providers";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const profile = await requireSignedInProfile();
    const body = await request.json();
    const assignmentId = typeof body?.assignmentId === "string" ? body.assignmentId.trim() : "";
    const provider = body?.provider;

    if (!assignmentId) {
      return NextResponse.json({ error: "Missing assignment id." }, { status: 400 });
    }

    if (provider !== "local_sandbox" && provider !== "m_pesa" && provider !== "flutterwave") {
      return NextResponse.json({ error: "Unsupported payment provider." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: assignment, error: assignmentError } = await supabase
      .from("assignments")
      .select("id, student_id, accepted_quotation_id, status")
      .eq("id", assignmentId)
      .eq("student_id", profile.id)
      .eq("status", "awaiting_payment")
      .maybeSingle();

    if (assignmentError || !assignment) {
      return NextResponse.json({ error: "You can only pay for your own accepted assignment." }, { status: 403 });
    }

    if (!assignment.accepted_quotation_id) {
      return NextResponse.json({ error: "The assignment does not have an accepted quotation." }, { status: 400 });
    }

    const { data: quotation, error: quotationError } = await supabase
      .from("quotations")
      .select("id, price_amount_minor, currency, status")
      .eq("id", assignment.accepted_quotation_id)
      .eq("status", "accepted")
      .maybeSingle();

    if (quotationError || !quotation) {
      return NextResponse.json({ error: "The assignment does not have an accepted quotation." }, { status: 400 });
    }

    const session = await createPaymentSession({
      assignmentId: assignment.id,
      studentId: profile.id,
      provider,
      amountMinor: Number(quotation.price_amount_minor),
      currency: quotation.currency,
      phoneNumber: typeof body?.phoneNumber === "string" ? body.phoneNumber : undefined,
      returnUrl: `/student/payments/complete?assignment_id=${encodeURIComponent(assignment.id)}`,
    });

    return NextResponse.json(session, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create a payment session.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
