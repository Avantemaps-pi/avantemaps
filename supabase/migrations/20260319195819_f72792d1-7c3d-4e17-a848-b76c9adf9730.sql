SELECT cron.schedule(
  'cleanup-deleted-accounts-daily',
  '0 3 * * *',
  $$
  SELECT
    net.http_post(
        url:='https://xvpwbocwasbtzrzrxyvu.supabase.co/functions/v1/cleanup-deleted-accounts',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2cHdib2N3YXNidHpyenJ4eXZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI4MDE2NjUsImV4cCI6MjA1ODM3NzY2NX0.J8yp04TRmdyM_l5FaOFP7Elz16n1ZlQkawH5Xp1vCs0"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);