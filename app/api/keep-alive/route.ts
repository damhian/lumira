import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // safe for lightweight read queries
);

export async function GET() {
  try {
    // Run a trivial query to keep Supabase active
    const { error } = await supabase
      .from("user_preferences")
      .select("id")
      .limit(1);

    if (error) throw error;

    return NextResponse.json({ status: "alive" }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { status: "error", message: error },
      { status: 500 },
    );
  }
}
