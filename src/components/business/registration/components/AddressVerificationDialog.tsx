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
import { MapPin, Building2, Globe } from 'lucide-react';

interface ParsedAddress {
  street: string;
  apartment?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  lat: number;
  lng: number;
}

interface AddressVerificationDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  address: ParsedAddress | null;
}

export const AddressVerificationDialog: React.FC<AddressVerificationDialogProps> = ({
  open,
  onConfirm,
  onCancel,
  address
}) => {
  if (!address) return null;

  return (
    <AlertDialog open={open} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Verify Business Address
          </AlertDialogTitle>
          <AlertDialogDescription>
            Please confirm that the following address information is correct before proceeding.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">Street Address</p>
                <p className="text-sm text-muted-foreground">
                  {address.street}
                  {address.apartment && `, ${address.apartment}`}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Globe className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">Location</p>
                <p className="text-sm text-muted-foreground">
                  {address.city}, {address.state} {address.zipCode}
                </p>
                <p className="text-sm text-muted-foreground">{address.country}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">Coordinates</p>
                <p className="text-sm text-muted-foreground font-mono">
                  {address.lat.toFixed(6)}, {address.lng.toFixed(6)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Edit Address</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Confirm & Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
