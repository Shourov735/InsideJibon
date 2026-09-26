const http = require("http");
const markers = [
  "Application error",
  "Unhandled Runtime Error",
  "Failed to compile",
  "Module not found",
  "nextjs__container_errors",
  "__next_error__",
  "error.tsx",
  "Server Error",
  "Internal Server Error",
];
http
  .get({ host: "localhost", port: 3000, path: "/" }, (res) => {
    let body = "";
    res.on("data", (c) => (body += c));
    res.on("end", () => {
      console.log(`status=${res.statusCode} bytes=${body.length}`);
      const lower = body.toLowerCase();
      let hits = 0;
      for (const m of markers) {
        if (lower.includes(m.toLowerCase())) {
          const idx = lower.indexOf(m.toLowerCase());
          console.log(`!! marker "${m}" at ${idx}`);
          hits++;
        }
      }
      console.log(hits === 0 ? "no error markers" : `found ${hits} markers`);
      const hasHtml = lower.includes("<html");
      const hasBody = lower.includes("<body");
      const hasFooter = lower.includes("insidejibon") || lower.includes("Tanvir") || lower.includes("footer");
      console.log(`html=${hasHtml} body=${hasBody} hasFooterOrBrand=${hasFooter}`);
    });
  })
  .on("error", (e) => console.log("err", e.message));
