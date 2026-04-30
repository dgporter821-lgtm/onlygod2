// Netlify Edge Function - Full working version
export default async function handler(request, context) {
  // درست خواندن متغیر محیطی - بدون نیاز به شی Netlify
  let TARGET = Deno.env.get("TARGET") || "";

  if (!TARGET) {
    console.error("TARGET environment variable is not set");
    return new Response("Service configuration error: TARGET not set", { 
      status: 503,
      headers: { "Content-Type": "text/plain" }
    });
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
      // حذف هدرهای غیرضروری Netlify
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
    // اضافه کردن هدر برای دیباگ (اختیاری)
    responseHeaders.set("X-Relay-Target", TARGET);

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });

  } catch (error) {
    console.error("Relay error:", error.message);
    return new Response("Service temporarily unavailable: " + error.message, { 
      status: 502,
      headers: { "Content-Type": "text/plain" }
    });
  }
}
