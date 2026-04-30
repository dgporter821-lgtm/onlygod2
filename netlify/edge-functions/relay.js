// Edge Function - Stealth Relay
const TARGET_BASE = (Deno.env.get("TARGET_DOMAIN") || "").replace(/\/$/, "");

// حذف تمام هدرهایی که ممکن است لو بدهند
const STRIP_HEADERS = new Set([
  "host",
  "connection", 
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "forwarded",
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-forwarded-port",
  "x-real-ip",
  "cf-ray",
  "cf-connecting-ip",
  "cdn-loop",
  "x-edge-cache",
  "x-edge-request-id",
  "x-edge-location",
  "x-edge-purpose",
]);

export default async function handler(request) {
  if (!TARGET_BASE) {
    return new Response("Service Unavailable", { status: 503 });
  }

  try {
    const url = new URL(request.url);
    const targetUrl = TARGET_BASE + url.pathname + url.search;

    // ساخت هدرهای جدید از ابتدا
    const headers = new Headers();
    
    // فقط هدرهای ضروری را کپی کن
    for (const [key, value] of request.headers) {
      const k = key.toLowerCase();
      
      // رد کردن هدرهای خطرناک
      if (STRIP_HEADERS.has(k)) continue;
      if (k.startsWith("x-nf-")) continue;
      if (k.startsWith("x-netlify-")) continue;
      if (k.startsWith("cf-")) continue;
      if (k === "user-agent" || k === "accept" || k === "accept-language" || 
          k === "accept-encoding" || k === "referer" || k === "cookie") {
        headers.set(key, value);
      }
    }

    // اضافه کردن هدرهای معمولی شبیه مرورگر واقعی
    headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
    
    const method = request.method;
    const hasBody = method !== "GET" && method !== "HEAD";

    const fetchOptions = {
      method,
      headers,
      redirect: "manual",
    };

    if (hasBody) {
      fetchOptions.body = request.body;
    }

    const upstream = await fetch(targetUrl, fetchOptions);

    const responseHeaders = new Headers();
    for (const [key, value] of upstream.headers) {
      const k = key.toLowerCase();
      // حذف هدرهایی که لو می‌دهند پروکسی است
      if (k === "transfer-encoding" || k === "via" || k === "x-cache" || 
          k === "x-cache-hit" || k === "x-cache-lookup") {
        continue;
      }
      responseHeaders.set(key, value);
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
    
  } catch (error) {
    // خطای عمومی، لو ندادن جزئیات
    return new Response("Service Unavailable", { status: 502 });
  }
}
