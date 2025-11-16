-- Schedule the Pi price update to run daily at midnight (UTC)
SELECT cron.schedule(
  'update-pi-price-daily',
  '0 0 * * *',
  $$
  SELECT
    net.http_post(
        url:='https://xvpwbocwasbtzrzrxyvu.supabase.co/functions/v1/update-pi-price',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2cHdib2N3YXNidHpyenJ4eXZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI4MDE2NjUsImV4cCI6MjA1ODM3NzY2NX0.J8yp04TRmdyM_l5FaOFP7Elz16n1ZlQkawH5Xp1vCs0"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);