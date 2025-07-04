
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
  Link,
  ExternalLink
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
        const emailUrl = `mailto:?subject=${encodeURIComponent(`Check out ${placeName}`)}&body=${encodeURIComponent(`I found this amazing place on Avante Maps: ${placeName}\n\n${shareUrl}`)}`;
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
      name: 'Twitter/X',
      icon: Twitter,
      action: () => {
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out ${placeName} on Avante Maps`)}&url=${encodeURIComponent(shareUrl)}`;
        window.open(twitterUrl, '_blank');
        onClose();
      }
    },
    {
      name: 'LinkedIn',
      icon: ExternalLink,
      action: () => {
        const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
        window.open(linkedinUrl, '_blank');
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

  // Preview testing URLs
  const previewTestUrls = {
    facebook: `https://developers.facebook.com/tools/debug/?q=${encodeURIComponent(shareUrl)}`,
    twitter: `https://cards-dev.twitter.com/validator?url=${encodeURIComponent(shareUrl)}`,
    linkedin: `https://www.linkedin.com/post-inspector/inspect/${encodeURIComponent(shareUrl)}`
  };

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

        {/* Preview Testing Section - Only show in development */}
        {process.env.NODE_ENV === 'development' && (
          <>
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-2">Test Social Media Previews</h4>
              <div className="flex flex-col gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start text-xs"
                  onClick={() => window.open(previewTestUrls.facebook, '_blank')}
                >
                  <Facebook className="h-4 w-4 mr-2" />
                  Facebook Sharing Debugger
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start text-xs"
                  onClick={() => window.open(previewTestUrls.twitter, '_blank')}
                >
                  <Twitter className="h-4 w-4 mr-2" />
                  Twitter Card Validator
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start text-xs"
                  onClick={() => window.open(previewTestUrls.linkedin, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  LinkedIn Post Inspector
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ShareDialog;
