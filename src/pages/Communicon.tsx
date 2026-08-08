import React, { useEffect, useRef, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';

import ChatInterface from '@/components/chat/ChatInterface';
import { useChatState } from '@/hooks/useChatState';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/context/auth';
import { Loader2 } from 'lucide-react';

const Communicon = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const initialChatMode = (location.state as any)?.chatMode === 'live' ? 'live' : 'ai';

  const {
    message,
    setMessage,
    messages,
    setMessages,
    chatMode,
    handleChatModeChange,
    handleSendMessage,
    sendVerificationRequest,
    handleBusinessSelection,
    triggerVerificationFlow,
    triggerCertificationFlow,
    showMyListings,
    sendContactOTP,
    verifyContactOTP,
    isValidatingConversation,
    conversationValidated,
    validateConversation,
  } = useChatState(initialChatMode);

  useEffect(() => {
    if (window) {
      window.sendVerificationRequest = sendVerificationRequest;
      window.handleBusinessSelection = handleBusinessSelection;
    }
    return () => {
      if (window) {
        window.sendVerificationRequest = undefined;
        window.handleBusinessSelection = undefined;
      }
    };
  }, [sendVerificationRequest, handleBusinessSelection]);

  const hasTriggeredVerification = useRef(false);

  useEffect(() => {
    if (location.state?.triggerVerification && !hasTriggeredVerification.current) {
      hasTriggeredVerification.current = true;
      const verificationType = location.state.verificationType || 'verification';
      navigate(location.pathname, { replace: true, state: {} });
      triggerVerificationFlow(verificationType);
    }
  }, [location.state, triggerVerificationFlow, navigate, location.pathname]);

  const showConversationErrorToast = (
    result: 'not_found' | 'access_denied' | 'missing',
    onRetry: () => void,
  ) => {
    if (result === 'not_found') {
      toast.error('Conversation not found', {
        description:
          'This conversation does not exist or has been removed. Start a new one from the business listing.',
        action: { label: 'Retry', onClick: onRetry },
      });
    } else if (result === 'access_denied') {
      toast.error('Access denied', {
        description:
          "You don't have access to this conversation. Make sure you're logged into the correct account.",
        action: { label: 'Retry', onClick: onRetry },
      });
    }
  };

  const retryLiveChat = useCallback(async () => {
    const conversationId = (location.state as any)?.openConversationId;
    if (!conversationId) return;
    const result = await validateConversation(conversationId);
    if (result === 'valid') {
      handleChatModeChange('live');
      toast.success('Connected to live chat');
    } else {
      showConversationErrorToast(result, retryLiveChat);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, validateConversation, handleChatModeChange]);

  // Honor incoming chatMode (e.g. 'live' from PlaceCard "Message" button)
  useEffect(() => {
    const incomingMode = (location.state as any)?.chatMode;
    if (!incomingMode || incomingMode === chatMode) return;

    if (incomingMode === 'live') {
      const openConversationId = (location.state as any)?.openConversationId;
      if (
        openConversationId === null ||
        openConversationId === undefined ||
        (typeof openConversationId === 'string' && openConversationId.trim() === '')
      ) {
        handleChatModeChange('ai');
        toast.error('No conversation selected', {
          description: 'Open a business listing and tap Message to start a live chat.',
          action: { label: 'Go to Map', onClick: () => navigate('/map') },
        });
        return;
      }
      (async () => {
        const result = await validateConversation(openConversationId);
        if (result === 'valid') {
          handleChatModeChange('live');
        } else {
          showConversationErrorToast(result, retryLiveChat);
          handleChatModeChange('ai');
        }
      })();
      return;
    }

    handleChatModeChange(incomingMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state?.chatMode]);

  // Structured error log for live-mode opens without a usable conversation reference
  const missingConvNotifiedRef = useRef(false);
  useEffect(() => {
    if (missingConvNotifiedRef.current) return;
    const state = location.state as any;
    if (!state) return;
    if (state.chatMode !== 'live') return;
    const openConversationId = state.openConversationId ?? null;
    const inboxBusinessId = state.inboxBusinessId ?? null;
    const hasValidConvId =
      typeof openConversationId === 'string' && openConversationId.trim().length > 0;
    const hasValidInbox =
      typeof inboxBusinessId === 'number' && Number.isFinite(inboxBusinessId);
    if (hasValidConvId || hasValidInbox) return;
    missingConvNotifiedRef.current = true;
    const reason =
      openConversationId === null && inboxBusinessId === null
        ? 'missing_conversation_reference'
        : typeof openConversationId === 'string' && openConversationId.length === 0
          ? 'empty_conversation_id'
          : 'invalid_conversation_reference';
    console.error(
      JSON.stringify({
        ts: new Date().toISOString(),
        level: 'error',
        event: 'communicon.live_open.failed',
        fn: 'Communicon.liveModeMissingConversationEffect',
        reason,
        openConversationId,
        inboxBusinessId,
        chatMode: state.chatMode,
        expectConversation: state.expectConversation === true,
        userId: user?.uid ?? null,
        piUid: (user as any)?.pi_uid ?? null,
        pathname: location.pathname,
      }),
    );
  }, [location.state, location.pathname, user?.uid, user]);

  const handleSendMessageWrapper = () => {
    const event = new Event('submit') as unknown as React.FormEvent;
    handleSendMessage(event);
  };

  const handleQuickReply = (text: string) => {
    if (text === 'Check verification status') {
      triggerVerificationFlow('verification');
      return;
    }
    if (text === 'Check certification status') {
      triggerCertificationFlow();
      return;
    }
    if (text === 'My listings') {
      showMyListings();
      return;
    }
    handleSendMessage(null, text);
  };

  return (
    <AppLayout title="CommuniCon" hideBottomNav={true}>
      <div className="max-w-4xl mx-auto">
        {isValidatingConversation ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">Verifying conversation...</p>
          </div>
        ) : (
          <ChatInterface
            chatMode={chatMode}
            onChatModeChange={handleChatModeChange}
            messages={messages}
            message={message}
            setMessage={setMessage}
            handleSendMessage={handleSendMessageWrapper}
            handleQuickReply={handleQuickReply}
            showAttachmentIcon={false}
            hasLiveChatAccess={true}
            onSendContactOTP={sendContactOTP}
            onVerifyContactOTP={verifyContactOTP}
          />
        )}
      </div>
    </AppLayout>
  );
};

export default Communicon;
