import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";

export async function GET() {
  const svc = createSupabaseServiceClient();
  if (!svc) {
    return NextResponse.json({ courses: [] });
  }

  const { data, error } = await svc
    .from("language_courses")
    .select("id,title,country,city,duration,price,description,is_active,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ courses: data ?? [] });
}

export async function POST(request: Request) {
  const svc = createSupabaseServiceClient();
  if (!svc) return NextResponse.json({ message: "Supabase is not configured." }, { status: 500 });

  const body = (await request.json()) as Record<string, unknown>;
  const { error } = await svc.from("language_courses").insert({
    title: body.title,
    country: body.country || null,
    city: body.city || null,
    duration: body.duration || null,
    price: body.price ?? null,
    description: body.description ?? null,
    is_active: body.is_active ?? true,
  });

  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  const svc = createSupabaseServiceClient();
  if (!svc) return NextResponse.json({ message: "Supabase is not configured." }, { status: 500 });

  const body = (await request.json()) as Record<string, unknown>;
  const id = body.id;
  if (!id || typeof id !== "string") {
    return NextResponse.json({ message: "id is required." }, { status: 400 });
  }

  const { error } = await svc
    .from("language_courses")
    .update({
      title: body.title,
      country: body.country || null,
      city: body.city || null,
      duration: body.duration || null,
      price: body.price ?? null,
      description: body.description ?? null,
      is_active: body.is_active ?? true,
    })
    .eq("id", id);

  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const svc = createSupabaseServiceClient();
  if (!svc) return NextResponse.json({ message: "Supabase is not configured." }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ message: "id is required." }, { status: 400 });

  const { error } = await svc.from("language_courses").delete().eq("id", id);
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

