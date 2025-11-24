import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Copy, CheckCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function CronSetup() {
  const [copied, setCopied] = useState(false);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const cronSQL = `-- Enable required extensions (run once)
-- CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
-- CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule the notification processor to run every 5 minutes
SELECT cron.schedule(
  'process-scheduled-notifications',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT
    net.http_post(
        url:='${supabaseUrl}/functions/v1/process-scheduled-notifications',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer ${supabaseAnonKey}"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

-- To check if the cron job is scheduled:
-- SELECT * FROM cron.job;

-- To unschedule (if needed):
-- SELECT cron.unschedule('process-scheduled-notifications');`;

  const handleCopy = () => {
    navigator.clipboard.writeText(cronSQL);
    setCopied(true);
    toast.success('SQL copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="container mx-auto p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Cron Job Setup</h1>
        <p className="text-muted-foreground mt-2">Configure scheduled notification processing</p>
      </div>

      <Alert className="mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          This SQL contains your project-specific credentials. Run this once in the Supabase SQL Editor to enable
          scheduled notification processing. The cron job will run every 5 minutes to process pending scheduled notifications.
        </AlertDescription>
      </Alert>

      <Card className="p-6">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">SQL Setup Script</h3>
            <Button onClick={handleCopy} size="sm">
              {copied ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy SQL
                </>
              )}
            </Button>
          </div>
          <Badge variant="outline" className="mb-4">Run this in Supabase SQL Editor</Badge>
        </div>

        <div className="bg-muted p-4 rounded-md overflow-x-auto">
          <pre className="text-sm">
            <code>{cronSQL}</code>
          </pre>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Setup Instructions:</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Copy the SQL script above</li>
              <li>Go to your Supabase Dashboard → SQL Editor</li>
              <li>Paste and run the script</li>
              <li>Verify the cron job is created by checking <code>SELECT * FROM cron.job;</code></li>
            </ol>
          </div>

          <div>
            <h4 className="font-semibold mb-2">What this does:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Runs every 5 minutes to check for scheduled notifications</li>
              <li>Processes notifications that are due to be sent</li>
              <li>Sends notifications to target users based on criteria</li>
              <li>Updates notification status and tracking information</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
