import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The PDF library runs on the server only and loads its own files.
  serverExternalPackages: ["@react-pdf/renderer"],
  // Ship the PDF fonts with the PDF route when the app is hosted.
  outputFileTracingIncludes: {
    "/export/pdf": ["./fonts/**/*"],
  },
};

export default nextConfig;
