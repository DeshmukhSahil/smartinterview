import { NextRequest, NextResponse } from "next/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, ngrok-skip-browser-warning",
};

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lat, lng } = body;

    if (!lat || !lng) {
      return NextResponse.json({ error: "lat and lng are required" }, { status: 400, headers: corsHeaders });
    }

    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "ChirayuPower-ERP/1.0 (site-assessment-feature)",
        "Accept-Language": "en",
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim error: ${response.status}`);
    }

    const data = await response.json();
    const address = data.address || {};

    const suburb = address.suburb || address.neighbourhood || address.village || "";
    const city = address.city || address.town || address.county || "";
    const district = address.state_district || address.county || "";
    const state = address.state || "";
    const postcode = address.postcode || "";

    const areaName = [suburb, city].filter(Boolean).join(", ") || [district, state].filter(Boolean).join(", ") || data.display_name?.split(",").slice(0, 2).join(",").trim() || "Unknown Area";

    return NextResponse.json({
      area_name: areaName,
      suburb,
      city,
      district,
      state,
      pincode: postcode,
      display_name: data.display_name,
      raw: address,
    }, { headers: corsHeaders });
  } catch (error: any) {
    console.error("[site-assessment/reverse-geocode] Error:", error);
    return NextResponse.json(
      { error: "Reverse geocoding failed", details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
