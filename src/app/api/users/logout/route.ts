import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const response = NextResponse.redirect(new URL('/login', request.nextUrl));
    
    response.cookies.set("token", "", {
      httpOnly: true,
      expires: new Date(0),
    });

    response.headers.set("Cache-Control", "no-store");
    
    return response;

  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Logout API error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.error("Logout API error: unknown");
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}