import { createApp } from "../server/app";

const appPromise = createApp().then(({ app }) => app);

export default async function handler(req: any, res: any) {
  const url = new URL(req.url ?? "/", "http://localhost");
  const rewritePath = url.searchParams.get("__path");
  if (rewritePath) {
    url.searchParams.delete("__path");
    req.url = `${rewritePath}${url.search}`;
  }

  const app = await appPromise;
  return app(req, res);
}
