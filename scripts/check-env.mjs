import fs from "node:fs";
import path from "node:path";

const requiredKeys = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "OPENAI_API_KEY",
  "OPENAI_STRATEGY_MODEL",
  "OPENAI_CONTENT_MODEL",
  "OPENAI_MOCK",
  "RATE_LIMIT_SALT",
  "ADMIN_EMAILS"
];

const envFile = process.env.ENV_FILE || pickExistingEnvFile();
const fileEnv = envFile ? readEnvFile(envFile) : {};
const env = { ...fileEnv, ...process.env };
const errors = [];
const warnings = [];

for (const key of requiredKeys) {
  if (!read(key)) {
    errors.push(`${key} is required.`);
  }
}

validateUrl("NEXT_PUBLIC_APP_URL", {
  allowLocalhost: process.env.ALLOW_LOCALHOST === "true"
});
validateUrl("NEXT_PUBLIC_SUPABASE_URL", {
  requireHttps: true,
  requireHostIncludes: ".supabase.co"
});

if (read("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")) {
  const value = read("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  if (!value.startsWith("sb_publishable_") && !value.startsWith("eyJ")) {
    errors.push(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY should be a Supabase publishable key."
    );
  }
}

if (read("SUPABASE_SECRET_KEY") && !read("SUPABASE_SECRET_KEY").startsWith("sb_secret_")) {
  errors.push("SUPABASE_SECRET_KEY should start with sb_secret_.");
}

if (read("OPENAI_API_KEY") && !read("OPENAI_API_KEY").startsWith("sk-")) {
  errors.push("OPENAI_API_KEY should start with sk-.");
}

if (read("OPENAI_MOCK") !== "false") {
  errors.push("OPENAI_MOCK must be false for production.");
}

if (read("RATE_LIMIT_SALT") && read("RATE_LIMIT_SALT").length < 24) {
  errors.push("RATE_LIMIT_SALT must be at least 24 characters.");
}

if (read("RATE_LIMIT_SALT") && new Set(read("RATE_LIMIT_SALT")).size < 8) {
  errors.push("RATE_LIMIT_SALT must be a strong random value, not a repeated string.");
}

if (read("ADMIN_EMAILS")) {
  const invalidEmails = read("ADMIN_EMAILS")
    .split(",")
    .map((email) => email.trim())
    .filter((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));

  if (invalidEmails.length > 0) {
    errors.push("ADMIN_EMAILS must contain valid comma-separated email addresses.");
  }
}

if (read("NEXT_PUBLIC_APP_URL")?.includes("vercel.app")) {
  warnings.push(
    "NEXT_PUBLIC_APP_URL points to vercel.app. That is fine for preview, but use the final custom domain before public launch."
  );
}

if (errors.length > 0) {
  console.error("Production environment check failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      envFile: envFile ? path.relative(process.cwd(), envFile) : null,
      checked: requiredKeys,
      warnings
    },
    null,
    2
  )
);

function read(key) {
  return String(env[key] || "").trim();
}

function validateUrl(key, options = {}) {
  const value = read(key);
  if (!value) {
    return;
  }

  try {
    const url = new URL(value);

    if (options.requireHttps && url.protocol !== "https:") {
      errors.push(`${key} must use https.`);
    }

    if (!options.allowLocalhost && ["localhost", "127.0.0.1"].includes(url.hostname)) {
      errors.push(`${key} must not point to localhost for production.`);
    }

    if (options.requireHostIncludes && !url.hostname.includes(options.requireHostIncludes)) {
      errors.push(`${key} must point to ${options.requireHostIncludes}.`);
    }
  } catch {
    errors.push(`${key} must be a valid URL.`);
  }
}

function pickExistingEnvFile() {
  const candidates = [".env.production.local", ".env.local"];

  for (const candidate of candidates) {
    const absolutePath = path.resolve(process.cwd(), candidate);
    if (fs.existsSync(absolutePath)) {
      return absolutePath;
    }
  }

  return null;
}

function readEnvFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const result = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#") || !line.includes("=")) {
      continue;
    }

    const index = line.indexOf("=");
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
}
