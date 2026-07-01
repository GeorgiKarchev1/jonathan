import { NextRequest, NextResponse } from "next/server";

const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:8787";
const GATEWAY_TOKEN = process.env.GATEWAY_TOKEN || "";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const res = await fetch(`${GATEWAY_URL}/chat`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(GATEWAY_TOKEN && { authorization: `Bearer ${GATEWAY_TOKEN}` }),
      },
      body: JSON.stringify(body),
      // Gateway can take up to 5 min for complex tasks
      signal: AbortSignal.timeout(310_000),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("[api/agent]", msg);
    return NextResponse.json({ error: "gateway_unreachable" }, { status: 502 });
  }
}
