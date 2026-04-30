// Edge function - Simple request forwarder
export default async function handler(request) {
  const TARGET_BASE = (Netlify.env.get("TARGET") || "").replace(/\/$/, "");
  const TARGET_PORT = Netlify.env.get("TARGET_PORT") || "443";

  if (!TARGET_BASE) {
    return new Response("Service temporarily unavailable", { 
      status: 503 
    });
  }

  try {
    const url = new URL(request.url);
    // ساخت آدرس کامل با پورت دلخواه
    let targetUrl = TARGET_BASE;
    
    if (!targetUrl.includes("://")) {
      targetUrl = "https://" + targetUrl;
    }

    // اضافه کردن پورت اگر متفاوت از 443 باشد
    if (TARGET_PORT !== "443") {
      targetUrl = targetUrl.replace(/:\d+$/, "") + ":" + TARGET_PORT;
    }

    targetUrl += url.pathname + url.search;

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

    const responseHeaders = new Headers(upstream.headers);
    responseHeaders.delete("transfer-encoding");

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });

  } catch (error) {
    return new Response("Service unavailable", { status: 502 });
  }
}
