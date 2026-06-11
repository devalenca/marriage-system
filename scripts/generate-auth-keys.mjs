// Generates the JWT signing keypair Convex Auth needs on a deployment.
// Usage: node scripts/generate-auth-keys.mjs <outDir>
//   Writes <outDir>/jwt-private-key.txt and <outDir>/jwks.json, then set them:
//   npx convex env set -- JWT_PRIVATE_KEY "$(cat <outDir>/jwt-private-key.txt)"
//   npx convex env set -- JWKS "$(cat <outDir>/jwks.json)"
// Delete the files afterwards. Run again for the cloud deployment before
// deploying to Vercel.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { exportJWK, exportPKCS8, generateKeyPair } from "jose";

const outDir = process.argv[2];
if (!outDir) {
	console.error("Usage: node scripts/generate-auth-keys.mjs <outDir>");
	process.exit(1);
}

const keys = await generateKeyPair("RS256", { extractable: true });
const privateKey = await exportPKCS8(keys.privateKey);
const publicKey = await exportJWK(keys.publicKey);
const jwks = JSON.stringify({ keys: [{ use: "sig", ...publicKey }] });

mkdirSync(outDir, { recursive: true });
writeFileSync(
	join(outDir, "jwt-private-key.txt"),
	privateKey.trimEnd().replace(/\n/g, " "),
);
writeFileSync(join(outDir, "jwks.json"), jwks);
console.log(`Wrote jwt-private-key.txt and jwks.json to ${outDir}`);
