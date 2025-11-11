import { inngest } from "@/lib/inngest/client";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
// import { generateToken } from "@/lib/utils/token";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  // const unsubscribe_token = generateToken();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "You must be logged in to save preferences." },
      { status: 401 },
    );
  }

  const body = await request.json();
  const { categories, frequency, email } = body;

  if (!categories || !Array.isArray(categories) || categories.length === 0) {
    return NextResponse.json(
      { error: "Categories array is requeired and must not be empty." },
      { status: 400 },
    );
  }

  if (!frequency || !["daily", "weekly", "monthly"].includes(frequency)) {
    return NextResponse.json(
      { error: "Valid frequency is required (daily, weekly, biweekly)." },
      { status: 400 },
    );
  }

  const { error: upsertError } = await supabase.from("user_preferences").upsert(
    {
      user_id: user.id,
      categories,
      frequency,
      email,
      is_active: true,
      // unsubscribe_token,
    },
    { onConflict: "user_id" },
  );

  if (upsertError) {
    console.error("Error saving preferences:", upsertError);
    return NextResponse.json(
      { error: "Failed to save preferences." },
      { status: 500 },
    );
  }

  await inngest.send({
    name: "newsletter.schedule",
    data: {
      categories,
      email,
      frequency,
      userId: user.id,
      // unsubscribe_token,
    },
  });

  return NextResponse.json({
    success: true,
    message: "Preferences saved successfully and added to table.",
  });
}

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "You must be logged in to save preferences." },
      { status: 401 },
    );
  }

  try {
    const { data: preferences, error: fetchError } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { error: "Failed to get preferences." },
        { status: 500 },
      );
    }

    return NextResponse.json(preferences);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "You must be logged in to save preferences." },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    const { is_active } = body;

    const { error: updateError } = await supabase
      .from("user_preferences")
      .update({ is_active })
      .eq("user_id", user.id);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update preferences." },
        { status: 500 },
      );
    }

    if (!is_active) {
      await inngest.send({
        name: "newsletter.schedule.deleted",
        data: {
          userId: user.id,
        },
      });
    } else {
      const { data: preferences, error } = await supabase
        .from("user_preferences")
        // .select("categories, frequency, email, unsubscribe_token")
        .select("categories, frequency, email")
        .eq("user_id", user.id)
        .single();

      if (error || !preferences) {
        throw new Error("User preferences not found");
      }

      const now = new Date();
      let nextScheduleTime: Date;

      switch (preferences.frequency) {
        case "daily":
          nextScheduleTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          break;
        case "weekly":
          nextScheduleTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          break;
        case "biweekly":
          nextScheduleTime = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
          break;
        default:
          nextScheduleTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      }

      nextScheduleTime.setHours(9, 0, 0, 0);

      // TO DO -> Put this modification to allow user to unsubscribe later
      // let unsubscribeToken = preferences.unsubscribe_token;
      // if (!unsubscribeToken) {
      //   unsubscribeToken = generateToken();

      //   await supabase
      //     .from("user_preferences")
      //     .update({ unsubscribe_token: unsubscribeToken })
      //     .eq("user_id", user.id);
      // }

      await inngest.send({
        name: "newsletter.schedule",
        data: {
          categories: preferences.categories,
          email: preferences.email,
          frequency: preferences.frequency,
          userId: user.id,
          scheduledFor: nextScheduleTime.toISOString(),
          // unsubscribe_token: unsubscribeToken,
        },
        ts: nextScheduleTime.getTime(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
