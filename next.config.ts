import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // OpenChemLib loads its torsion tables from a JSON file next to its own
  // bundle at runtime, which only resolves if the package keeps its real
  // layout on disk instead of being inlined into the server build.
  serverExternalPackages: ["openchemlib"],
  redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "orgchem\\.ethanyanxu\\.com" }],
        destination: "https://chem.ethanyanxu.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
