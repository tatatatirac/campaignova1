-- Local-only demo metadata. Video binary files are intentionally not committed.

insert into public.video_assets (
  title,
  description,
  industry_tags,
  platform_tags,
  duration_seconds,
  storage_path,
  preview_path,
  thumbnail_path,
  license_notes
)
values (
  'Proof Reel',
  'A clean vertical proof-led reel for service businesses.',
  array['services', 'local-business'],
  array['instagram', 'tiktok', 'youtube-shorts'],
  18,
  'demo/proof-reel.mp4',
  'demo/proof-reel-preview.mp4',
  'demo/proof-reel.webp',
  'Local development metadata only. Production assets require verified commercial rights.'
)
on conflict (storage_path) do nothing;
