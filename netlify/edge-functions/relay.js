// Simple Netlify Edge Function Relay
export default async function handler(request) {
  const TARGET = Netlify.env.get("TARGET") || "";
  const PORT = Netlify.env.get("TARGET_PORT") || "2096";

  if (!TARGET) {
    return new Response("Service unavailable", { status: 503 });
  }

  try {
    const url = new URL(request.url);
    let targetUrl = TARGET;

    if (!targetUrl.startsWith("http")) {
      targetUrl = "https://" + targetUrl;
    }

    if (PORT !== "443") {
      targetUrl = targetUrl.replace(/:\d+$/, "") + ":" + PORT;
    }

    targetUrl += url.pathname + url.search;

    const response = await fetch(targetUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      redirect: "manual"
    });

    const headers = new Headers(response.headers);
    headers.delete("transfer-encoding");

    return new Response(response.body, {
      status: response.status,
      headers: headers
    });

  } catch (e) {
    return new Response("Service unavailable", { status: 502 });
  }
}
