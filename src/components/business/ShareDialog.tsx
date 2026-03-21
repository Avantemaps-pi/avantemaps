
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
  Twitter,
  Link,
  Send,
  Music,
  Ghost
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

  const shareText = `Check out ${placeName} on Avante Maps!`;
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(shareText);

  const shareOptions = [
    {
      name: 'Copy Link',
      icon: Copy,
      ariaLabel: 'Copy link to clipboard',
      action: () => {
        navigator.clipboard.writeText(shareUrl);
        toast({ title: 'Success', description: 'Link copied to clipboard!', duration: 2000 });
        onClose();
      }
    },
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      ariaLabel: 'Share on WhatsApp',
      action: () => {
        window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`, '_blank');
        onClose();
      }
    },
    {
      name: 'X',
      icon: Twitter,
      ariaLabel: 'Share on X (Twitter)',
      action: () => {
        window.open(`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`, '_blank', 'width=600,height=400');
        onClose();
      }
    },
    {
      name: 'LinkedIn',
      icon: Link,
      ariaLabel: 'Share on LinkedIn',
      action: () => {
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`, '_blank', 'width=600,height=400');
        onClose();
      }
    },
    {
      name: 'Telegram',
      icon: Send,
      ariaLabel: 'Share on Telegram',
      action: () => {
        window.open(`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`, '_blank');
        onClose();
      }
    },
    {
      name: 'Gmail',
      icon: Mail,
      ariaLabel: 'Share via Gmail',
      action: () => {
        window.open(`https://mail.google.com/mail/?view=cm&su=${encodeURIComponent(`${placeName} - Avante Maps`)}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`, '_blank');
        onClose();
      }
    },
    {
      name: 'Discord',
      icon: MessageCircle,
      ariaLabel: 'Share on Discord',
      action: () => {
        navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
        toast({ title: 'Copied for Discord', description: 'Link copied! Paste it in your Discord channel.', duration: 3000 });
        onClose();
      }
    },
    {
      name: 'TikTok',
      icon: Music,
      ariaLabel: 'Share on TikTok',
      action: () => {
        navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
        toast({ title: 'Copied for TikTok', description: 'Link copied! Paste it in your TikTok bio or message.', duration: 3000 });
        onClose();
      }
    },
    {
      name: 'Snapchat',
      icon: Ghost,
      ariaLabel: 'Share on Snapchat',
      action: () => {
        window.open(`https://www.snapchat.com/share?url=${encodedUrl}`, '_blank');
        onClose();
      }
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share {placeName}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-3 py-4">
          {shareOptions.map((option, index) => {
            const IconComponent = option.icon;
            return (
              <Button
                key={index}
                variant="outline"
                className="flex flex-col items-center gap-2 h-20 p-3 hover:bg-primary/10 hover:scale-105 transition-all duration-200 hover:shadow-md"
                onClick={option.action}
                aria-label={option.ariaLabel}
              >
                <IconComponent className="h-6 w-6" />
                <span className="text-xs text-center">{option.name}</span>
              </Button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareDialog;
