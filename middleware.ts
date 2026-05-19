import { type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, images, etc.
     * - api/* (API routes handle their own auth — running middleware on them
     *          causes a second supabase.auth.getUser() call per request)
     */
    "/((?!_next/static|_next/image|favicon.ico|images|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}

