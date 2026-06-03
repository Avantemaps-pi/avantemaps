import React, { useEffect, useRef } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import UserProfileCard from '@/components/chat/UserProfileCard';
import ChatInterface from '@/components/chat/ChatInterface';
import { useChatState } from '@/hooks/useChatState';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/context/auth';

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

  // Honor incoming chatMode (e.g. 'live' from PlaceCard "Message" button)
  useEffect(() => {
    if (location.state?.chatMode && location.state.chatMode !== chatMode) {
      handleChatModeChange(location.state.chatMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state?.chatMode]);

  // If we landed in live mode expecting to open a conversation but the id is missing/invalid, surface a toast
  const missingConvNotifiedRef = useRef(false);
  useEffect(() => {
    if (missingConvNotifiedRef.current) return;
    const state = location.state as any;
    if (!state) return;
    if (state.chatMode !== 'live') return;
    if (state.openConversationId || state.inboxBusinessId) return;
    const intended = state.expectConversation === true;
    if (!intended) return;
    missingConvNotifiedRef.current = true;
    console.error('[Communicon] live chat opened without openConversationId', { state });
    toast.error("Couldn't open the conversation. Please try again.", {
      id: 'msg:open-conv-missing',
      description: 'The conversation reference was missing or invalid.',
      duration: 5000,
    });
  }, [location.state]);

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
    <AppLayout title="CommuniCon">
      <div className="max-w-4xl mx-auto mt-6">
        <UserProfileCard />
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
      </div>
    </AppLayout>
  );
};

export default Communicon;
