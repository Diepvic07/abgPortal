import { NextResponse } from 'next/server';

export function successResponse<T extends Record<string, unknown>>(data: T, status = 200) {
  return NextResponse.json({ success: true, ...data }, { status });
}

export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export function handleApiError(error: unknown) {
  console.error('API Error:', error);
  const message = error instanceof Error ? error.message : 'Internal server error';
  return errorResponse(message, 500);
}
