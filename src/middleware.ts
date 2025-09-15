import { NextResponse, NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const password = request.cookies.get("authToken")?.value;

  // If no 'password' cookie and trying to access home page `/`
  if (!password && request.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

// Match homepage `/` and any additional routes you want protected
export const config = {
  matcher: ["/"],
};
