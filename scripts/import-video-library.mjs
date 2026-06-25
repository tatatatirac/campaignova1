import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return Object.fromEntries(
    fs
      .readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .filter((line) => line && !line.trim().startsWith("#"))
      .map((line) => {
        const separator = line.indexOf("=");
        return [line.slice(0, separator), line.slice(separator + 1)];
      })
  );
}

function safeStorageName(value) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function requiredString(value, field, index) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Asset ${index + 1}: ${field} is required.`);
  }

  return value.trim();
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const manifestArgument = args.find((argument) => !argument.startsWith("--"));

if (!manifestArgument) {
  throw new Error(
    "Usage: npm run videos:import -- path/to/video-library.json [--dry-run]"
  );
}

const workspace = process.cwd();
const manifestPath = path.resolve(workspace, manifestArgument);
const manifestDirectory = path.dirname(manifestPath);
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

if (!Array.isArray(manifest.assets) || manifest.assets.length === 0) {
  throw new Error("The manifest must contain a non-empty assets array.");
}

const prepared = manifest.assets.map((asset, index) => {
  const title = requiredString(asset.title, "title", index);
  const sourceFile = path.resolve(
    manifestDirectory,
    requiredString(asset.sourceFile, "sourceFile", index)
  );
  const previewFile = path.resolve(
    manifestDirectory,
    requiredString(asset.previewFile, "previewFile", index)
  );

  if (!fs.existsSync(sourceFile)) {
    throw new Error(`Asset ${index + 1}: source file does not exist.`);
  }

  if (!fs.existsSync(previewFile)) {
    throw new Error(`Asset ${index + 1}: preview file does not exist.`);
  }

  if (!Array.isArray(asset.industryTags) || asset.industryTags.length === 0) {
    throw new Error(`Asset ${index + 1}: industryTags are required.`);
  }

  if (!Array.isArray(asset.platformTags) || asset.platformTags.length === 0) {
    throw new Error(`Asset ${index + 1}: platformTags are required.`);
  }

  if (!Number.isInteger(asset.durationSeconds) || asset.durationSeconds <= 0) {
    throw new Error(`Asset ${index + 1}: durationSeconds must be positive.`);
  }

  const slug = safeStorageName(asset.slug || title);
  const storagePath =
    asset.storagePath || `library/${slug}/${path.basename(sourceFile)}`;
  const previewPath =
    asset.previewPath || `library/${slug}/${path.basename(previewFile)}`;

  return {
    title,
    description:
      typeof asset.description === "string" ? asset.description.trim() : null,
    industryTags: asset.industryTags.map(String),
    platformTags: asset.platformTags.map(String),
    durationSeconds: asset.durationSeconds,
    sourceFile,
    previewFile,
    storagePath,
    previewPath,
    licenseNotes: requiredString(asset.licenseNotes, "licenseNotes", index)
  };
});

console.log(`Validated ${prepared.length} video assets.`);

if (dryRun) {
  console.log("Dry run complete. No files or database rows were changed.");
  process.exit(0);
}

const env = {
  ...loadEnvFile(path.join(workspace, ".env.local")),
  ...process.env
};
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const secretKey = env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required."
  );
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false }
});

for (const asset of prepared) {
  const source = fs.readFileSync(asset.sourceFile);
  const preview = fs.readFileSync(asset.previewFile);
  const sourceUpload = await supabase.storage
    .from("video-assets")
    .upload(asset.storagePath, source, {
      contentType: "video/mp4",
      upsert: true
    });

  if (sourceUpload.error) {
    throw sourceUpload.error;
  }

  const previewUpload = await supabase.storage
    .from("video-previews")
    .upload(asset.previewPath, preview, {
      contentType: "video/mp4",
      upsert: true
    });

  if (previewUpload.error) {
    throw previewUpload.error;
  }

  const { error } = await supabase.from("video_assets").upsert(
    {
      title: asset.title,
      description: asset.description,
      industry_tags: asset.industryTags,
      platform_tags: asset.platformTags,
      duration_seconds: asset.durationSeconds,
      storage_path: asset.storagePath,
      preview_path: asset.previewPath,
      thumbnail_path: null,
      is_active: true,
      license_notes: asset.licenseNotes
    },
    { onConflict: "storage_path" }
  );

  if (error) {
    throw error;
  }

  console.log(`Imported: ${asset.title}`);
}

console.log("Ready-video library import complete.");
