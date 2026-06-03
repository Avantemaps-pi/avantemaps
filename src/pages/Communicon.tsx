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
    toast.error("Couldn't open the conversation. Please try again.", {
      id: 'msg:open-conv-missing',
      description: 'The conversation reference was missing or invalid.',
      duration: 5000,
    });
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
