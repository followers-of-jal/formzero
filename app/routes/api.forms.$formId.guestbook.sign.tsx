import type { Route } from "./+types/api.forms.$formId.guestbook.sign";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
  "Access-Control-Max-Age": "86400",
};

// JSONP callbacks must be safe identifiers to avoid script injection.
const CALLBACK_RE = /^[A-Za-z_$][A-Za-z0-9_$.]*$/;

function jsonp(callback: string, body: unknown): Response {
  return new Response(`${callback}(${JSON.stringify(body)});`, {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function badCallback(): Response {
  return new Response("/* invalid callback */", {
    status: 400,
    headers: { "Content-Type": "application/javascript" },
  });
}

export async function loader({ request, params, context }: Route.LoaderArgs) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const url = new URL(request.url);
  const callback = url.searchParams.get("callback")?.trim() ?? "";
  if (!CALLBACK_RE.test(callback)) return badCallback();

  const { formId } = params;
  const db = context.cloudflare.env.DB;

  // Honeypot: real visitors never fill this hidden field; bots do.
  if (url.searchParams.get("website")) {
    return jsonp(callback, { ok: false, error: "spam" });
  }

  const name = (url.searchParams.get("name") ?? "").trim().slice(0, 100);
  const email = (url.searchParams.get("email") ?? "").trim().slice(0, 200);
  const message = (url.searchParams.get("message") ?? "").trim().slice(0, 2000);

  if (!name || !message) {
    return jsonp(callback, { ok: false, error: "name and message required" });
  }

  const form = await db
    .prepare("SELECT id, is_guestbook FROM forms WHERE id = ?")
    .bind(formId)
    .first<{ id: string; is_guestbook: number }>();

  if (!form || !form.is_guestbook) {
    return jsonp(callback, { ok: false, error: "guestbook not available" });
  }

  const id = crypto.randomUUID();
  const createdAt = Date.now();

  await db
    .prepare(
      "INSERT INTO submissions (id, form_id, data, created_at) VALUES (?, ?, ?, ?)"
    )
    .bind(id, formId, JSON.stringify({ name, email, message }), createdAt)
    .run();

  return jsonp(callback, { ok: true, id });
}

export async function action({ request }: Route.ActionArgs) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  return new Response("/* method not allowed */", {
    status: 405,
    headers: { "Content-Type": "application/javascript" },
  });
}
