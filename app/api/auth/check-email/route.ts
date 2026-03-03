import { NextRequest, NextResponse } from "next/server";
import { getMemberByEmail } from "@/lib/supabase-db";

type Intent = "signin" | "signup";
type Status = "approved" | "pending" | "not_found";

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 10; // 10 requests per minute per IP

// Simple in-memory rate limiter (use Redis in production)
const ipRequestHistory: Record<string, number[]> = {};

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  if (!ipRequestHistory[ip]) {
    ipRequestHistory[ip] = [];
  }
  ipRequestHistory[ip] = ipRequestHistory[ip].filter(
    (ts) => now - ts < RATE_LIMIT_WINDOW_MS
  );
  if (ipRequestHistory[ip].length >= RATE_LIMIT_MAX) {
    return false;
  }
  ipRequestHistory[ip].push(now);
  return true;
}

interface CheckEmailResponse {
  exists: boolean;
  status: Status;
  message: string;
  showOAuth: boolean;
  accountStatus?: string;
}

// Response matrix based on intent + status
function getResponse(
  exists: boolean,
  approvalStatus: string | undefined,
  accountStatus: string | undefined,
  intent: Intent
): CheckEmailResponse {
  // Handle suspended/banned accounts
  if (accountStatus === "suspended" || accountStatus === "banned") {
    return {
      exists: true,
      status: "approved",
      message: "Account suspended. Contact admin for assistance.",
      showOAuth: false,
      accountStatus,
    };
  }

  // Not found
  if (!exists) {
    if (intent === "signup") {
      return {
        exists: false,
        status: "not_found",
        message: "Great! Sign in with Google to continue.",
        showOAuth: true,
      };
    }
    // signin intent
    return {
      exists: false,
      status: "not_found",
      message: "Email not found. Join Community instead.",
      showOAuth: false,
    };
  }

  // Pending approval
  if (approvalStatus === "pending") {
    return {
      exists: true,
      status: "pending",
      message: "Application pending review. We'll notify you when approved.",
      showOAuth: false,
      accountStatus,
    };
  }

  // Approved member
  if (intent === "signup") {
    return {
      exists: true,
      status: "approved",
      message: "Already registered. Use Returning Member instead.",
      showOAuth: false,
      accountStatus,
    };
  }

  // signin intent, approved
  return {
    exists: true,
    status: "approved",
    message: "Welcome back! Sign in below.",
    showOAuth: true,
    accountStatus,
  };
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting by IP
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ||
               request.headers.get("x-real-ip") ||
               "unknown";

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const email = body.email;
    const intent: Intent = body.intent === "signup" ? "signup" : "signin";

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const member = await getMemberByEmail(email.trim().toLowerCase());

    if (!member) {
      return NextResponse.json(getResponse(false, undefined, undefined, intent));
    }

    return NextResponse.json(
      getResponse(
        true,
        member.approval_status || "approved",
        member.account_status,
        intent
      )
    );
  } catch (error) {
    console.error("Check email error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
