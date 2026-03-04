const RAPID_FIRE_THRESHOLD = 5; // 5 requests
const RAPID_FIRE_WINDOW_MS = 60 * 1000; // 1 minute

// Local cache for detection (in a real production app, use Redis)
const requestHistory: Record<string, number[]> = {};

export async function checkForAbuse(memberId: string, requestText: string) {
    const now = Date.now();

    if (!requestHistory[memberId]) {
        requestHistory[memberId] = [];
    }

    // Add current timestamp
    requestHistory[memberId].push(now);

    // Filter out old timestamps
    requestHistory[memberId] = requestHistory[memberId].filter(
        ts => now - ts < RAPID_FIRE_WINDOW_MS
    );

    // Check for rapid fire
    if (requestHistory[memberId].length > RAPID_FIRE_THRESHOLD) {
        console.warn(`[Abuse] Rapid fire requests from ${memberId}: ${requestHistory[memberId].length} in 1 min`);
        return { shouldSuspend: true, reason: 'Rapid fire requests detected' };
    }

    // Check for duplicate content (TODO: implement semantic similarity check if needed)

    return { shouldSuspend: false };
}
