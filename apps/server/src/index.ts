import Fastify from "fastify";

const port = Number(process.env.PORT ?? 3000);
// 0.0.0.0 = listen on all network interfaces (Wi-Fi, Tailscale), not only localhost.
const host = "0.0.0.0";

const app = Fastify({ logger: true });

app.get("/health", async () => {
  return { ok: true };
});

try {
  await app.listen({ port, host });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
