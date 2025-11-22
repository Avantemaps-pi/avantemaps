-- Add priority column to notifications table
ALTER TABLE notifications 
ADD COLUMN priority text NOT NULL DEFAULT 'medium'
CHECK (priority IN ('low', 'medium', 'high'));

-- Add index for better query performance when filtering by priority
CREATE INDEX idx_notifications_priority ON notifications(priority);

-- Add comment to document the column
COMMENT ON COLUMN notifications.priority IS 'Priority level of the notification: low, medium, or high';