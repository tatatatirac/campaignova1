update storage.buckets
set file_size_limit = 52428800
where id in ('video-previews', 'video-assets');
