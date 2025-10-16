import React from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle, Mail, Facebook, Twitter, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ShareBarProps {
  title?: string;
  text?: string;
  url?: string;
  className?: string;
}

const ShareBar: React.FC<ShareBarProps> = ({ 
  title = 'Avante Maps',
  text = 'Check this out on Avante Maps!',
  url,
  className = ''
}) => {
  const { toast } = useToast();
  const shareUrl = url || window.location.href;

  const shareOptions = [
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      ariaLabel: 'Share on WhatsApp',
      color: 'hover:text-green-600',
      action: () => {
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`Check this out on Avante Maps! ${shareUrl}`)}`;
        window.open(whatsappUrl, '_blank');
      }
    },
    {
      name: 'X',
      icon: Twitter,
      ariaLabel: 'Share on X (Twitter)',
      color: 'hover:text-blue-500',
      action: () => {
        const twitterText = encodeURIComponent(`${text} 🗺️`);
        const twitterUrl = `https://twitter.com/intent/tweet?text=${twitterText}&url=${encodeURIComponent(shareUrl)}`;
        window.open(twitterUrl, '_blank', 'width=600,height=400');
      }
    },
    {
      name: 'Facebook',
      icon: Facebook,
      ariaLabel: 'Share on Facebook',
      color: 'hover:text-blue-600',
      action: () => {
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
        window.open(facebookUrl, '_blank', 'width=600,height=400');
      }
    },
    {
      name: 'Email',
      icon: Mail,
      ariaLabel: 'Share via email',
      color: 'hover:text-red-600',
      action: () => {
        const subject = encodeURIComponent(title);
        const body = encodeURIComponent(`${text}\n\nView here: ${shareUrl}`);
        const emailUrl = `mailto:?subject=${subject}&body=${body}`;
        window.location.href = emailUrl;
      }
    }
  ];

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url: shareUrl
        });
      } catch (err) {
        console.error('Error sharing', err);
        // Fallback to copy link
        navigator.clipboard.writeText(shareUrl);
        toast({
          title: 'Link Copied',
          description: 'Link copied to clipboard!',
          duration: 2000
        });
      }
    } else {
      // Fallback for desktop - copy to clipboard
      navigator.clipboard.writeText(shareUrl);
      toast({
        title: 'Link Copied',
        description: 'Link copied to clipboard!',
        duration: 2000
      });
    }
  };

  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      {shareOptions.map((option, index) => {
        const IconComponent = option.icon;
        return (
          <Button
            key={index}
            variant="outline"
            size="icon"
            className={`w-10 h-10 rounded-full hover:bg-primary/10 hover:scale-110 transition-all duration-200 ${option.color}`}
            onClick={option.action}
            aria-label={option.ariaLabel}
          >
            <IconComponent className="h-8 w-8" />
          </Button>
        );
      })}
      
      <Button
        variant="default"
        className="h-10 px-4 rounded-full hover:scale-105 transition-all duration-200 flex items-center gap-2"
        onClick={handleNativeShare}
        aria-label="Share using device share menu"
      >
        <Share2 className="h-5 w-5" />
        <span className="text-sm font-medium">Share</span>
      </Button>
    </div>
  );
};

export default ShareBar;
