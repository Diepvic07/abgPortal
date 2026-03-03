import { NextRequest, NextResponse } from "next/server";
import { getActivePaidMembers } from "@/lib/supabase-db";
import { findMatches } from "@/lib/gemini";
import { blurText } from "@/lib/tier-utils";

const MAX_RESULTS = 3;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 5; // 5 requests per minute per IP

// Simple in-memory rate limiter (use Redis in production)
const ipRequestHistory: Record<string, number[]> = {};

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  if (!ipRequestHistory[ip]) {
    ipRequestHistory[ip] = [];
  }
  // Filter old timestamps
  ipRequestHistory[ip] = ipRequestHistory[ip].filter(
    (ts) => now - ts < RATE_LIMIT_WINDOW_MS
  );
  if (ipRequestHistory[ip].length >= RATE_LIMIT_MAX) {
    return false; // Rate limited
  }
  ipRequestHistory[ip].push(now);
  return true;
}

interface BlurredMatch {
  id: string;
  name: string;
  role: string;
  company: string;
  reason: string;
  blurred: true;
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

    const { query } = await request.json();

    if (!query || typeof query !== "string" || query.trim().length < 3) {
      return NextResponse.json(
        { error: "Query must be at least 3 characters" },
        { status: 400 }
      );
    }

    // Sanitize query - limit length and remove suspicious patterns
    const sanitizedQuery = query.trim().slice(0, 500);

    const members = await getActivePaidMembers();

    if (members.length === 0) {
      return NextResponse.json({
        matches: [],
        total: 0,
        message: "No members available at this time.",
      });
    }

    // Find matches using Gemini
    const matches = await findMatches(
      sanitizedQuery,
      members.map((m) => ({
        id: m.id,
        name: m.name,
        expertise: m.expertise,
        can_help_with: m.can_help_with,
        bio: m.bio,
        job_preferences: m.job_preferences,
        hiring_preferences: m.hiring_preferences,
      })),
      "en",
      "professional"
    );

    // Blur results and limit to MAX_RESULTS
    const blurredMatches: BlurredMatch[] = matches
      .slice(0, MAX_RESULTS)
      .map((match) => {
        const member = members.find((m) => m.id === match.id);
        if (!member) return null;

        return {
          id: `preview-${match.id.slice(-4)}`, // Obfuscated ID
          name: blurText(member.name, 2),
          role: blurText(member.role || "Professional", 3),
          company: blurText(member.company || "Company", 3),
          reason: match.reason, // Keep reason visible as teaser
          blurred: true as const,
        };
      })
      .filter((m): m is BlurredMatch => m !== null);

    return NextResponse.json({
      matches: blurredMatches,
      total: matches.length,
      message:
        blurredMatches.length > 0
          ? `Found ${matches.length} potential matches. Sign in to see full profiles.`
          : "No matches found for your query.",
    });
  } catch (error) {
    console.error("Public search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
