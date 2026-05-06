import "./env.js";
import { log } from "./log.js";

(async () => {
  const [{ createApp }, { setupVite, serveStatic }] = await Promise.all([
    import("./app.js"),
    import("./vite.js"),
  ]);
  const { app, server } = await createApp();

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({ port, host: "0.0.0.0" }, () => {
    log(`serving on port ${port}`);
  });
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
