import React from 'react';
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
import { AlertTriangle, Building2, MapPin } from 'lucide-react';

interface SimilarBusiness {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
}

interface DuplicateWarningDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  similarBusinesses: SimilarBusiness[];
}

export const DuplicateWarningDialog: React.FC<DuplicateWarningDialogProps> = ({
  open,
  onConfirm,
  onCancel,
  similarBusinesses
}) => {
  return (
    <AlertDialog open={open} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Similar Business Already Exists
          </AlertDialogTitle>
          <AlertDialogDescription>
            We found {similarBusinesses.length} similar business{similarBusinesses.length > 1 ? 'es' : ''} with matching name and address. Please verify this is not a duplicate.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 py-4 max-h-[300px] overflow-y-auto">
          {similarBusinesses.map((business) => (
            <div 
              key={business.id} 
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border"
            >
              <Building2 className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="flex-1 space-y-1 min-w-0">
                <p className="text-sm font-medium truncate">{business.name}</p>
                <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span className="break-words">
                    {business.address}, {business.city}, {business.state}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel Registration</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Continue Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
