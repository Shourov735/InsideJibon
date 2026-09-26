const http = require("http");
const urls = [
  "/",
  "/sign-in",
  "/sign-up",
  "/leaderboard",
  "/courses",
  "/about",
  "/sitemap.xml",
];
let i = 0;
function next() {
  if (i >= urls.length) process.exit(0);
  const u = urls[i++];
  const req = http.get({ host: "localhost", port: 3000, path: u }, (res) => {
    let body = "";
    res.on("data", (c) => (body += c));
    res.on("end", () => {
      console.log(
        `${u} -> ${res.statusCode} (${body.length}b, ct=${res.headers["content-type"] || "?"})`,
      );
      next();
    });
  });
  req.on("error", (e) => {
    console.log(`${u} -> ERR ${e.code}`);
    next();
  });
  req.setTimeout(90000, () => {
    req.destroy();
    console.log(`${u} -> TIMEOUT`);
    next();
  });
}
next();
