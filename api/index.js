import { startServer } from "../server.jsx";

let appPromise = null;

export default async function handler(req, res) {
  if (!appPromise) {
    appPromise = startServer();
  }
  const app = await appPromise;
  return app(req, res);
}
