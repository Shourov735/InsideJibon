const http = require("http");
http
  .get({ host: "localhost", port: 3000, path: "/" }, (res) => {
    let body = "";
    res.on("data", (c) => (body += c));
    res.on("end", () => {
      const idx = body.toLowerCase().indexOf("error.tsx");
      console.log("--- snippet around match ---");
      console.log(body.slice(Math.max(0, idx - 80), idx + 120));
    });
  })
  .on("error", (e) => console.log("err", e.message));
