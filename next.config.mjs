/** @type {import('next').NextConfig} */
export default { serverExternalPackages: ["pg", "@electric-sql/pglite", "@grpc/grpc-js"], devIndicators: false,
  // Old links keep working.
  async redirects() { return [{ source: "/demo", destination: "/story", permanent: true }, { source: "/details", destination: "/", permanent: false }]; },
};
