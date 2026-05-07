import { build as viteBuild } from "vite";
import { rm } from "fs/promises";

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();

  console.log("build complete — deploy dist/ with nginx or your preferred static file server");
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
