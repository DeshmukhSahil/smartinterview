// Passenger-compatible entry point for cPanel's Application Manager.
// `next start` alone doesn't reliably bind to the port Passenger assigns
// via process.env.PORT, so we start Next's request handler ourselves.
const { createServer } = require("http");
const next = require("next");

const port = process.env.PORT || 3000;
const app = next({ dev: false });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => handle(req, res)).listen(port, () => {
    console.log(`Ready on port ${port}`);
  });
});
