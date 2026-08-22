
import React, { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { 
  MoreVertical,
  Trash,
  Share,
  BarChart
} from 'lucide-react';
import { useNavigate } from '@/lib/router-compat';
import DeleteBusinessDialog from './DeleteBusinessDialog';
import ShareDialog from './ShareDialog';
import { getOrigin } from '@/utils/browserEnv';

interface BusinessDropdownMenuProps {
  businessId?: number | undefined;
  businessName?: string | undefined;
  onDeleted?: (() => void) | undefined;
}

const BusinessDropdownMenu = ({ businessId, businessName, onDeleted }: BusinessDropdownMenuProps) => {
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);

  const handleNavigateToAnalytics = () => {
    navigate('/analytics', { state: { businessId } });
  };

  const shareUrl = `${getOrigin()}?place=${businessId}`;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem className="cursor-pointer" onClick={handleNavigateToAnalytics}>
            <BarChart className="mr-2 h-4 w-4" />
            <span>Analytics</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer" onClick={() => setShowShareDialog(true)}>
            <Share className="mr-2 h-4 w-4" />
            <span>Share</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            className="cursor-pointer text-red-600"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash className="mr-2 h-4 w-4" />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteBusinessDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        {...(businessId !== undefined ? { businessId } : {})}
        {...(businessName !== undefined ? { businessName } : {})}
        {...(onDeleted !== undefined ? { onDeleted } : {})}
      />

      <ShareDialog
        isOpen={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        placeName={businessName || 'Business'}
        shareUrl={shareUrl}
      />
    </>
  );
};

export default BusinessDropdownMenu;
