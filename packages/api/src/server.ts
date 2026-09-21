import express from "express";
import cors from "cors";
import { router } from "./routes.js";
import { errorHandler } from "./errors.js";

const app = express();

app.use(cors({ origin: process.env.UI_ORIGIN ?? "*" }));
app.use(router);

// Must be registered LAST — Express calls this only when a route calls next(err)
// or an async handler rejects (see asyncHandler in errors.ts).
app.use(errorHandler);

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
  console.log(`api listening on http://localhost:${PORT}`);
});