import type { Route } from "./+types/api.forms.$formId.guestbook";
import { data } from "react-router";
import { filterProfanity } from "~/lib/profanity.server";

// CORS headers to allow guestbook embeds from any domain
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
  "Access-Control-Max-Age": "86400",
};

type SubmissionRow = {
  id: string;
  data: string;
  created_at: number;
};

export async function loader({ request, params, context }: Route.LoaderArgs) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const { formId } = params;
  const db = context.cloudflare.env.DB;
  const url = new URL(request.url);

  const limit = Math.min(
    Math.max(parseInt(url.searchParams.get("limit") || "50", 10) || 50, 1),
    100
  );
  const offset = Math.max(
    parseInt(url.searchParams.get("offset") || "0", 10) || 0,
    0
  );

  const form = await db
    .prepare("SELECT id FROM forms WHERE id = ?")
    .bind(formId)
    .first();

  if (!form) {
    return data(
      { error: "Form not found" },
      { status: 404, headers: corsHeaders }
    );
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
    data: filterProfanity(JSON.parse(row.data)),
  }));

  return data(
    { entries, total: total?.count ?? 0, limit, offset },
    { headers: corsHeaders }
  );
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
