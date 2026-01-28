import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DeleteBusinessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId?: number;
  businessName?: string;
  onDeleted?: () => void;
}

const DeleteBusinessDialog = ({
  open,
  onOpenChange,
  businessId,
  businessName,
  onDeleted
}: DeleteBusinessDialogProps) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!businessId) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('businesses')
        .delete()
        .eq('id', businessId);

      if (error) {
        console.error('❌ Error deleting business:', error);
        toast.error('Failed to delete business');
        return;
      }

      toast.success(`"${businessName}" has been deleted`);
      onOpenChange(false);
      onDeleted?.();
    } catch (error) {
      console.error('❌ Error deleting business:', error);
      toast.error('Failed to delete business');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Business</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{businessName}"? This action cannot be undone 
            and will permanently remove all associated data including reviews, comments, and analytics.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteBusinessDialog;
