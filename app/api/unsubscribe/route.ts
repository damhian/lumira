import { createClient } from "@/lib/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Missing Token" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("user_preferences")
    .update({ is_active: false })
    .eq("unsubscribe_token", token)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Invalid token" }, { status: 404 });
  }

  return NextResponse.redirect("/unsubscribed");
}
