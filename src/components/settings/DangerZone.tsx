import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
interface DangerZoneProps {
  onDeleteAccount: () => void;
  onReinstateAccount: () => void;
}
const DangerZone = ({
  onDeleteAccount,
  onReinstateAccount
}: DangerZoneProps) => {
  return <Card>
      <CardHeader>
        <CardTitle className="text-red-600">Danger Zone</CardTitle>
        <CardDescription>
          Actions here cannot be easily reversed. Please proceed with caution.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Button variant="destructive" onClick={onDeleteAccount} className="w-full">
            Delete Account
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Warning: Your account will be immediately inactive and all your information will 
            be permanently deleted after 15 days.
          </p>
        </div>
        <Separator />
        <div>
          <Button variant="outline" onClick={onReinstateAccount} className="w-full">
            Reinstate Account
          </Button>
          <p className="text-xs text-muted-foreground mt-2">If your account is scheduled for deletion, you can reinstate it within 15 Days.</p>
        </div>
      </CardContent>
    </Card>;
};
export default DangerZone;