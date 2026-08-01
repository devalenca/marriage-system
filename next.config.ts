import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	turbopack: {
		// GSAP routes its plugin subpaths through an extensionless `./*` entry
		// in its exports map. Node resolves `gsap/ScrollTrigger` from it, but
		// Turbopack does not, and the landing's motion layer failed to build.
		// The alias points at the same ESM file the exports map would pick,
		// so the import keeps its typed specifier.
		resolveAlias: {
			"gsap/ScrollTrigger": "gsap/ScrollTrigger.js",
		},
	},
};

export default nextConfig;
