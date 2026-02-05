import { NextResponse } from "next/server";

export async function GET() {
  try {
    const response = NextResponse.json({
      message: "Logout successful",
      success: true,
    });

    response.cookies.set("token", "", {
      httpOnly: true,
      expires: new Date(0),
    });

    console.log("Logout response sent");
    return response;

  } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Logout API error:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      console.error("Logout API error: unknown");
      return NextResponse.json(
        { error: "Something went wrong" },
        { status: 500 }
      );
  }
}
