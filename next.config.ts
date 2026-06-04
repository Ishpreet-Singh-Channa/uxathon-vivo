import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // allowedDevOrigins:['192.168.200.108']
    // ["http://localhost:3000", "http://192.168.1.14:3000"],
    /* config options here */
    allowedDevOrigins: ['uxathon.singh.dpdns.org', '192.168.1.31', '192.168.1.32'],
};

export default nextConfig;
