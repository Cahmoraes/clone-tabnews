import { config } from "dotenv";
import { cwd } from "node:process";
import { join } from "node:path";

config({
  path: join(cwd(), ".env.development"),
  override: true,
});
