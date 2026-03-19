import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';

interface DangerZoneProps {
  onDeleteAccount: () => Promise<void>;
  onReinstateAccount: () => Promise<void>;
  isAccountDeleted: boolean;
  deletionDate?: string | null;
}

const DangerZone = ({
  onDeleteAccount,
  onReinstateAccount,
  isAccountDeleted,
  deletionDate,
}: DangerZoneProps) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReinstating, setIsReinstating] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDeleteAccount();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReinstate = async () => {
    setIsReinstating(true);
    try {
      await onReinstateAccount();
    } finally {
      setIsReinstating(false);
    }
  };

  const formattedDate = deletionDate
    ? new Date(deletionDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-destructive">Danger Zone</CardTitle>
        <CardDescription>
          Actions here cannot be easily reversed. Please proceed with caution.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAccountDeleted && formattedDate && (
          <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-sm text-destructive">
            Your account is scheduled for permanent deletion on <strong>{formattedDate}</strong>. 
            You can reinstate it before that date.
          </div>
        )}

        <div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full" disabled={isAccountDeleted || isDeleting}>
                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isAccountDeleted ? 'Deletion Scheduled' : 'Delete Account'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  Your account will become inactive immediately. All your data — businesses, bookmarks, 
                  comments, and reviews — will be permanently deleted after 15 days. This cannot be undone 
                  after the grace period.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Yes, delete my account
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {!isAccountDeleted && (
            <p className="text-xs text-muted-foreground mt-2">
              Your account will be immediately inactive and permanently deleted after 15 days.
            </p>
          )}
        </div>

        {isAccountDeleted && (
          <>
            <Separator />
            <div>
              <Button variant="outline" onClick={handleReinstate} className="w-full" disabled={isReinstating}>
                {isReinstating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Reinstate Account
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Cancel the scheduled deletion and reactivate your account.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default DangerZone;
