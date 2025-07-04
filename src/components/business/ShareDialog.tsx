
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
          description: 'Link copied to clipboard! Rich preview will be available when shared on social media.',
          duration: 3000
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
        const subject = encodeURIComponent(`Check out ${placeName} on Avante Maps`);
        const body = encodeURIComponent(`I found this amazing place on Avante Maps and thought you'd be interested!\n\n${placeName}\n\nView details: ${shareUrl}`);
        const emailUrl = `mailto:?subject=${subject}&body=${body}`;
        window.location.href = emailUrl;
        onClose();
      }
    },
    {
      name: 'Facebook',
      icon: Facebook,
      action: () => {
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
        window.open(facebookUrl, '_blank', 'width=600,height=400');
        onClose();
      }
    },
    {
      name: 'Twitter/X',
      icon: Twitter,
      action: () => {
        const twitterText = encodeURIComponent(`Check out ${placeName} on Avante Maps! 🗺️`);
        const twitterUrl = `https://twitter.com/intent/tweet?text=${twitterText}&url=${encodeURIComponent(shareUrl)}`;
        window.open(twitterUrl, '_blank', 'width=600,height=400');
        onClose();
      }
    },
    {
      name: 'LinkedIn',
      icon: Link,
      action: () => {
        const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
        window.open(linkedinUrl, '_blank', 'width=600,height=400');
        onClose();
      }
    }
  ];

  // Show native share if available, otherwise show LinkedIn
  const finalShareOptions = shareOptions.filter(option => {
    if (option.name === 'LinkedIn') {
      return !navigator.share; // Only show LinkedIn if native share is not available
    }
    return true;
  });

  // Add native share option if available
  if (navigator.share) {
    finalShareOptions.push({
      name: 'More Options',
      icon: Link,
      action: () => {
        navigator.share({
          title: placeName,
          text: `Check out ${placeName} on Avante Maps`,
          url: shareUrl
        }).catch(err => {
          console.error('Error sharing', err);
          // Fallback to copy link
          navigator.clipboard.writeText(shareUrl);
          toast({
            title: 'Link Copied',
            description: 'Link copied to clipboard!',
            duration: 2000
          });
        });
        onClose();
      }
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share {placeName}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-4">
          {finalShareOptions.map((option, index) => {
            const IconComponent = option.icon;
            return (
              <Button
                key={index}
                variant="outline"
                className="flex flex-col items-center gap-2 h-16 p-3 hover:bg-primary/10"
                onClick={option.action}
              >
                <IconComponent className="h-5 w-5" />
                <span className="text-xs text-center">{option.name}</span>
              </Button>
            );
          })}
        </div>
        <div className="text-xs text-muted-foreground text-center px-4 pb-2">
          Links shared will include rich previews with images and descriptions on social media platforms.
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareDialog;
