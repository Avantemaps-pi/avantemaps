# Security Configuration Guidelines

## Google Maps API Key Security

Your Google Maps API key is currently exposed in the codebase at `src/config/environment.ts`:
```
AIzaSyAp6za1pf11Tvq80kIRBpqqunXg4AcYa8s
```

### CRITICAL: Configure API Key Restrictions Immediately

1. **Go to Google Cloud Console**
   - Navigate to: https://console.cloud.google.com/apis/credentials
   - Find your API key and click on it to edit

2. **Set Application Restrictions**
   - Under "Application restrictions", select "HTTP referrers (web sites)"
   - Add your allowed domains:
     ```
     https://yourdomain.com/*
     https://*.lovable.app/*
     http://localhost:*
     ```

3. **Set API Restrictions**
   - Under "API restrictions", select "Restrict key"
   - Only enable these APIs:
     - Maps JavaScript API
     - Geocoding API
     - Places API (if needed)

4. **Set Usage Quotas**
   - Go to: https://console.cloud.google.com/apis/api/maps-backend.googleapis.com/quotas
   - Set reasonable daily quotas to prevent abuse
   - Enable billing alerts

### Optional: Move Geocoding to Edge Function

For enhanced security, consider proxying geocoding requests through an edge function:

```typescript
// supabase/functions/secure-geocode/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const { address } = await req.json();
  
  const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY'); // Store in Supabase secrets
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

## Supabase Platform Configuration

### Enable Leaked Password Protection

⚠️ **REQUIRED**: Enable this in Supabase Dashboard immediately

1. Go to: https://supabase.com/dashboard/project/xvpwbocwasbtzrzrxyvu/auth/policies
2. Enable "Leaked Password Protection"
3. This prevents users from using passwords that have been exposed in data breaches

Reference: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Storage Bucket Migration Strategy

### Current State
- `user-data` bucket: **PUBLIC** ⚠️
- `business-images` bucket: **PUBLIC** ⚠️

### Migration Plan

#### Phase 1: Create Private Buckets (Immediate)
```sql
-- Create new private buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('user-data-private', 'user-data-private', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('business-images-private', 'business-images-private', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']);

-- Create RLS policies for user-data-private
CREATE POLICY "Users can view their own files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'user-data-private' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'user-data-private' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'user-data-private' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'user-data-private' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create RLS policies for business-images-private
CREATE POLICY "Anyone can view business images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'business-images-private');

CREATE POLICY "Business owners can upload images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'business-images-private' AND
    EXISTS (
      SELECT 1 FROM businesses 
      WHERE id::text = (storage.foldername(name))[1] 
      AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can manage their images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'business-images-private' AND
    EXISTS (
      SELECT 1 FROM businesses 
      WHERE id::text = (storage.foldername(name))[1] 
      AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can delete their images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'business-images-private' AND
    EXISTS (
      SELECT 1 FROM businesses 
      WHERE id::text = (storage.foldername(name))[1] 
      AND owner_id = auth.uid()
    )
  );
```

#### Phase 2: Migrate Existing Files (Next)
```typescript
// Migration script to copy files from public to private buckets
import { supabase } from '@/integrations/supabase/client';

async function migrateFiles() {
  // 1. List all files in public bucket
  const { data: files } = await supabase.storage
    .from('user-data')
    .list();

  // 2. Copy each file to private bucket
  for (const file of files || []) {
    const { data: fileData } = await supabase.storage
      .from('user-data')
      .download(file.name);
    
    if (fileData) {
      await supabase.storage
        .from('user-data-private')
        .upload(file.name, fileData);
    }
  }
}
```

#### Phase 3: Update Application Code (After migration)
```typescript
// Use signed URLs for private files
const { data } = await supabase.storage
  .from('user-data-private')
  .createSignedUrl('path/to/file.jpg', 3600); // 1 hour expiry

// Use the signed URL in your components
<img src={data.signedUrl} alt="User upload" />
```

#### Phase 4: Cleanup (Final)
- After verifying all files migrated successfully
- Delete old public buckets
- Remove references to old buckets in code

## Security Checklist

- [x] RLS enabled on all tables
- [x] Role-based access control implemented
- [x] Input validation and content filtering
- [x] Secure edge function authentication
- [x] Rate limiting on API endpoints
- [x] Comment system with database backing
- [ ] **Google Maps API key restrictions configured**
- [ ] **Leaked password protection enabled**
- [ ] **Storage buckets migrated to private**

## Next Steps

1. **Immediate (Do Now)**:
   - Configure Google Maps API key restrictions in Google Cloud Console
   - Enable leaked password protection in Supabase Dashboard

2. **Short-term (This Week)**:
   - Run Phase 1 SQL migration to create private storage buckets
   - Plan file migration timeline

3. **Long-term (This Month)**:
   - Complete storage bucket migration
   - Test all file access with signed URLs
   - Remove public buckets

## Monitoring

- Monitor API usage in Google Cloud Console for unusual patterns
- Check Supabase logs regularly for failed authentication attempts
- Review storage bucket access patterns monthly
