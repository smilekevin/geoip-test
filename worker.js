export default {
  async fetch(request) {
    const url = new URL(request.url);
    const respond = (status, data, extraHeaders = {}) =>
      new Response(request.method === "HEAD" ? null : JSON.stringify(data), {
        status,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
          ...extraHeaders,
        },
      });

    if (url.pathname !== "/geoip-test") {
      return respond(404, { error: "Not found" });
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      return respond(405, { error: "Method not allowed" }, { Allow: "GET, HEAD" });
    }

    const values = url.searchParams.getAll("country");
    const target = (values[0] || "").trim().toUpperCase();
    if (values.length > 0 &&
        (values.length !== 1 || !/^[A-Z]{2}$/.test(target) || target === "XX")) {
      return respond(400, {
        error: "Provide one two-letter country code, e.g. ?country=cn",
      });
    }

    // Cloudflare supplies the connecting IP and its geolocation at the edge.
    // Prefer the original IPv6 address when Pseudo IPv4 overwrite is enabled.
    const ip = request.headers.get("CF-Connecting-IPv6") ||
      request.headers.get("CF-Connecting-IP") || null;
    const country = request.cf?.country?.toUpperCase() || null;
    const hasCountry = /^[A-Z]{2}$/.test(country || "") && country !== "XX";

    // Only a validated two-letter code is interpolated into HTML.
    if (values.length === 0) {
      const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Country Test</title>
</head>
<body>
  <main>
    <h1>客户端国家/地区</h1>
    <p>Country: <strong>${hasCountry ? country : "未知"}</strong></p>
    <p>${hasCountry ? "由 Cloudflare 根据客户端出口 IP 判断。" : "Cloudflare 未提供可用的国家/地区信息。"}</p>
    <p>添加 <code>?country=cn</code> 可检测是否匹配指定国家/地区。</p>
  </main>
</body>
</html>`;
      return new Response(request.method === "HEAD" ? null : html, {
        status: hasCountry ? 200 : 503,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }

    if (!hasCountry) {
      return respond(503, {
        ip, country, target, match: false,
        error: "Client country is unavailable",
      });
    }

    const match = country === target;
    return respond(match ? 200 : 403, { ip, country, target, match });
  },
};
