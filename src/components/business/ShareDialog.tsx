
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  MessageCircle, 
  Mail, 
  Copy, 
  Facebook, 
  Twitter,
  Link
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  placeName: string;
  shareUrl: string;
}

const ShareDialog: React.FC<ShareDialogProps> = ({
  isOpen,
  onClose,
  placeName,
  shareUrl
}) => {
  const { toast } = useToast();

  const shareOptions = [
    {
      name: 'Copy Link',
      icon: Copy,
      action: () => {
        navigator.clipboard.writeText(shareUrl);
        toast({
          title: 'Success',
          description: 'Link copied to clipboard!',
          duration: 2000
        });
        onClose();
      }
    },
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      action: () => {
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`Check out ${placeName} on Avante Maps: ${shareUrl}`)}`;
        window.open(whatsappUrl, '_blank');
        onClose();
      }
    },
    {
      name: 'Email',
      icon: Mail,
      action: () => {
        const emailUrl = `mailto:?subject=${encodeURIComponent(placeName)}&body=${encodeURIComponent(`Check out ${placeName} on Avante Maps: ${shareUrl}`)}`;
        window.location.href = emailUrl;
        onClose();
      }
    },
    {
      name: 'Facebook',
      icon: Facebook,
      action: () => {
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
        window.open(facebookUrl, '_blank');
        onClose();
      }
    },
    {
      name: 'Twitter',
      icon: Twitter,
      action: () => {
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out ${placeName} on Avante Maps`)}&url=${encodeURIComponent(shareUrl)}`;
        window.open(twitterUrl, '_blank');
        onClose();
      }
    },
    {
      name: 'Native Share',
      icon: Link,
      action: () => {
        if (navigator.share) {
          navigator.share({
            title: placeName,
            text: `Check out ${placeName} on Avante Maps`,
            url: shareUrl
          }).catch(err => {
            console.error('Error sharing', err);
          });
        } else {
          // Fallback to copy link
          navigator.clipboard.writeText(shareUrl);
          toast({
            title: 'Success',
            description: 'Link copied to clipboard!',
            duration: 2000
          });
        }
        onClose();
      }
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share {placeName}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-4">
          {shareOptions.map((option, index) => {
            const IconComponent = option.icon;
            return (
              <Button
                key={index}
                variant="outline"
                className="flex flex-col items-center gap-2 h-16 p-3"
                onClick={option.action}
              >
                <IconComponent className="h-5 w-5" />
                <span className="text-xs">{option.name}</span>
              </Button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareDialog;
