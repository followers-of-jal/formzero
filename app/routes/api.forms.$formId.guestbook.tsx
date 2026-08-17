import type { Route } from "./+types/api.forms.$formId.guestbook";
import { data } from "react-router";

// CORS headers to allow guestbook embeds from any domain
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
  "Access-Control-Max-Age": "86400",
};

type SubmissionRow = {
  id: string
  data: string
  created_at: number
};

// JSONP callback names must be safe identifiers to avoid script injection.
const CALLBACK_RE = /^[A-Za-z_$][A-Za-z0-9_$.]*$/;

function jsonpResponse(callback: string, body: unknown): Response {
  const padded = `${callback}(${JSON.stringify(body)});`;
  return new Response(padded, {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function errorResponse(
  callback: string | null,
  error: string,
  status: number
): Response {
  if (callback) {
    if (!CALLBACK_RE.test(callback)) {
      return new Response("/* invalid callback */", {
        status: 400,
        headers: { "Content-Type": "application/javascript" },
      });
    }
    return jsonpResponse(callback, { error });
  }
  return data({ error }, { status, headers: corsHeaders });
}

export async function loader({ request, params, context }: Route.LoaderArgs) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const { formId } = params;
  const db = context.cloudflare.env.DB;
  const url = new URL(request.url);
  const callback = url.searchParams.get("callback")?.trim();

  const limit = Math.min(
    Math.max(parseInt(url.searchParams.get("limit") || "50", 10) || 50, 1),
    100
  );
  const offset = Math.max(
    parseInt(url.searchParams.get("offset") || "0", 10) || 0,
    0
  );

  const form = await db
    .prepare("SELECT id, is_guestbook FROM forms WHERE id = ?")
    .bind(formId)
    .first<{ id: string; is_guestbook: number }>();

  if (!form) {
    return errorResponse(callback ?? null, "Form not found", 404);
  }

  // Only forms explicitly flagged as guestbooks are publicly readable.
  if (!form.is_guestbook) {
    return errorResponse(callback ?? null, "Guestbook not enabled for this form", 404);
  }

  const rows = await db
    .prepare(
      "SELECT id, data, created_at FROM submissions WHERE form_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?"
    )
    .bind(formId, limit, offset)
    .all<SubmissionRow>();

  const total = await db
    .prepare("SELECT COUNT(*) AS count FROM submissions WHERE form_id = ?")
    .bind(formId)
    .first<{ count: number }>();

  const entries = (rows.results ?? []).map((row: SubmissionRow) => ({
    id: row.id,
    created_at: row.created_at,
    data: JSON.parse(row.data),
  }));

  const body = { entries, total: total?.count ?? 0, limit, offset };

  if (callback) {
    if (!CALLBACK_RE.test(callback)) {
      return new Response("/* invalid callback */", {
        status: 400,
        headers: { "Content-Type": "application/javascript" },
      });
    }
    return jsonpResponse(callback, body);
  }

  return data(body, { headers: corsHeaders });
}

export async function action({ request }: Route.ActionArgs) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  return data(
    { error: "Method not allowed" },
    { status: 405, headers: corsHeaders }
  );
}
