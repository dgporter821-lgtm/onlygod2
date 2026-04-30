// Netlify Edge Function - Single TARGET variable support
export default async function handler(request) {
  let TARGET = Netlify.env.get("TARGET") || "";

  if (!TARGET) {
    return new Response("Service configuration error", { status: 503 });
  }

  try {
    // اگر کاربر https:// نگذاشته باشد، اضافه کن
    if (!TARGET.startsWith("http")) {
      TARGET = "https://" + TARGET;
    }

    const url = new URL(request.url);
    const targetUrl = TARGET + url.pathname + url.search;

    // آماده‌سازی هدرها
    const headers = new Headers();
    let forwardedIp = null;

    for (const [key, value] of request.headers) {
      const k = key.toLowerCase();
      if (k.startsWith("x-nf-") || k.startsWith("x-netlify-") || 
          k === "host" || k === "connection" || k === "keep-alive") {
        continue;
      }
      if (k === "x-real-ip" || k === "x-forwarded-for") {
        if (!forwardedIp) forwardedIp = value;
        continue;
      }
      headers.set(k, value);
    }

    if (forwardedIp) headers.set("x-forwarded-for", forwardedIp);

    const fetchOptions = {
      method: request.method,
      headers: headers,
      redirect: "manual",
      body: (request.method !== "GET" && request.method !== "HEAD") ? request.body : null,
    };

    const upstream = await fetch(targetUrl, fetchOptions);

    const responseHeaders = new Headers(upstream.headers);
    responseHeaders.delete("transfer-encoding");

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });

  } catch (error) {
    console.error("Relay error:", error);
    return new Response("Service temporarily unavailable", { 
      status: 502 
    });
  }
}
