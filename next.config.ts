import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The online shop moved when Lamonica's was rebranded as Woodstock's.
  // The sub-merchant behind it is unchanged.
  redirects() {
    return [
      { source: "/lamonica/:path*", destination: "/woodstock-pizza/:path*", permanent: false },
    ];
  },
};

export default nextConfig;
