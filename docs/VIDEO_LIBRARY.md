# Ready-video library

Production MP4 files remain private in Supabase Storage. The application returns
only short-lived signed preview and download links after verifying ownership and
package entitlement.

## Import prepared videos

1. Copy `docs/video-library.example.json` outside the public source tree and add
   one manifest entry per prepared video.
2. Keep original MP4 and clean preview MP4 files outside Git.
3. Verify every `licenseNotes` value before upload.
4. Validate the manifest:

```powershell
npm.cmd run videos:import -- C:\secure\campaignova-videos\library.json --dry-run
```

5. Upload and register the library:

```powershell
npm.cmd run videos:import -- C:\secure\campaignova-videos\library.json
```

The importer uploads originals to `video-assets`, previews to
`video-previews`, and upserts metadata by `storage_path`.

## Product rules

- Starter receives 1 video.
- Growth receives 5 videos.
- Director receives 30 videos.
- The first video is available immediately.
- Remaining videos unlock 24 hours before recommended publishing time.
- Every user can preview all entitled videos without a third-party watermark.
- Early unlock requires explicit acknowledgment.
- Original MP4 files are never public.
