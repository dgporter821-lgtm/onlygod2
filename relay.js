// Simple edge handler for forwarding requests
export default async function handler(request) {
  const TARGET_BASE = (Netlify.env.get("TARGET") || "").replace(/\/$/, "");

  if (!TARGET_BASE) {
    return new Response("Service temporarily unavailable", { 
      status: 503,
      headers: { "Content-Type": "text/plain" }
    });
  }

  try {
    const url = new URL(request.url);
    const targetUrl = TARGET_BASE + url.pathname + url.search;

    // Prepare headers
    const headers = new Headers();
    let forwardedIp = null;

    for (const [key, value] of request.headers) {
      const lowerKey = key.toLowerCase();

      // Skip internal and sensitive headers
      if (lowerKey.startsWith("x-nf-") || 
          lowerKey.startsWith("x-netlify-") ||
          lowerKey === "host" || 
          lowerKey === "connection" ||
          lowerKey === "keep-alive") {
        continue;
      }

      if (lowerKey === "x-real-ip" || lowerKey === "x-forwarded-for") {
        if (!forwardedIp) forwardedIp = value;
        continue;
      }

      headers.set(lowerKey, value);
    }

    if (forwardedIp) {
      headers.set("x-forwarded-for", forwardedIp);
    }

    const method = request.method;
    const hasBody = method !== "GET" && method !== "HEAD";

    const fetchOptions = {
      method: method,
      headers: headers,
      redirect: "manual",
    };

    if (hasBody) {
      fetchOptions.body = request.body;
    }

    // Forward the request
    const upstreamResponse = await fetch(targetUrl, fetchOptions);

    // Prepare response headers
    const responseHeaders = new Headers();
    for (const [key, value] of upstreamResponse.headers) {
      const lowerKey = key.toLowerCase();
      if (lowerKey === "transfer-encoding") continue;
      responseHeaders.set(key, value);
    }

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: responseHeaders,
    });

  } catch (err) {
    return new Response("Service unavailable", { 
      status: 502,
      headers: { "Content-Type": "text/plain" }
    });
  }
}