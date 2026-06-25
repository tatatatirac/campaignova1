const rawBaseUrl = process.env.SMOKE_BASE_URL || process.env.NEXT_PUBLIC_APP_URL;

if (!rawBaseUrl) {
  console.error(
    "SMOKE_BASE_URL or NEXT_PUBLIC_APP_URL is required. Example: $env:SMOKE_BASE_URL='https://campaignova.com'; npm.cmd run smoke:prod"
  );
  process.exit(1);
}

const baseUrl = rawBaseUrl.replace(/\/+$/, "");
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 15000);

function assertHttpUrl(value) {
  const url = new URL(value);

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error(`Expected an http or https URL, got ${value}`);
  }
}

async function request(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      redirect: options.redirect || "follow",
      signal: controller.signal
    });
    const contentType = response.headers.get("content-type") || "";
    const body = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    return {
      path,
      status: response.status,
      ok: response.ok,
      contentType,
      location: response.headers.get("location"),
      body
    };
  } finally {
    clearTimeout(timeout);
  }
}

function fail(message, details) {
  console.error(message);
  if (details) {
    console.error(JSON.stringify(details, null, 2));
  }
  process.exit(1);
}

function expectText(result, expected) {
  if (typeof result.body !== "string" || !result.body.includes(expected)) {
    fail(`Expected ${result.path} to contain "${expected}".`, {
      status: result.status,
      contentType: result.contentType
    });
  }
}

async function main() {
  assertHttpUrl(baseUrl);

  const landing = await request("/");
  if (!landing.ok) {
    fail("Landing page smoke check failed.", landing);
  }
  expectText(landing, "Campaignova");

  const login = await request("/login");
  if (!login.ok) {
    fail("Login page smoke check failed.", login);
  }
  expectText(login, "Sign in");

  const privacy = await request("/privacy");
  if (!privacy.ok) {
    fail("Privacy page smoke check failed.", privacy);
  }
  expectText(privacy, "Privacy Policy");

  const terms = await request("/terms");
  if (!terms.ok) {
    fail("Terms page smoke check failed.", terms);
  }
  expectText(terms, "Terms of Service");

  const robots = await request("/robots.txt");
  if (!robots.ok) {
    fail("Robots smoke check failed.", robots);
  }
  expectText(robots, "Sitemap:");

  const sitemap = await request("/sitemap.xml");
  if (!sitemap.ok) {
    fail("Sitemap smoke check failed.", sitemap);
  }
  expectText(sitemap, "<urlset");

  const appRedirect = await request("/app", { redirect: "manual" });
  if (![301, 302, 303, 307, 308].includes(appRedirect.status)) {
    fail("Protected dashboard did not redirect anonymous traffic.", appRedirect);
  }

  const health = await request("/api/health");
  if (!health.ok || typeof health.body !== "object") {
    fail("Health endpoint smoke check failed.", health);
  }

  if (health.body.status !== "ok") {
    fail("Health endpoint is not ok.", health.body);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        baseUrl,
        checks: {
          landing: landing.status,
          login: login.status,
          privacy: privacy.status,
          terms: terms.status,
          robots: robots.status,
          sitemap: sitemap.status,
          appRedirect: appRedirect.status,
          health: health.body
        }
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : "Smoke check failed.", {
    baseUrl
  });
});
