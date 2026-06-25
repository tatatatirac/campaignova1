import type { MetadataRoute } from "next";

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://campaignova.com").replace(
    /\/+$/,
    ""
  );
}

export default function robots(): MetadataRoute.Robots {
  const baseUrl = appUrl();

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/login", "/privacy", "/terms"],
      disallow: ["/app", "/admin", "/onboarding", "/api"]
    },
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl
  };
}

