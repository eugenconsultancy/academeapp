import React, { useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useChatStore } from '../stores/useChatStore';
import ChatWindow from '../components/chat/ChatWindow';
import MessageInput from '../components/chat/MessageInput';
import { chatApi } from '../api/chatApi';

export default function ChatDetail() {
  const { conversationId } = useParams();
  const setActiveConversation = useChatStore(s => s.setActiveConversation);
  const connectWebSocket = useChatStore(s => s.connectWebSocket);
  const disconnectWebSocket = useChatStore(s => s.disconnectWebSocket);
  const fetchMessages = useChatStore(s => s.setMessages);
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    setActiveConversation({ id: conversationId });
    connectWebSocket(conversationId);

    // Load initial messages
    chatApi.getMessages(conversationId, null, 30).then(res => {
      fetchMessages(conversationId, res.data.reverse()); // backend returns descending, reverse to chronological
      setLoading(false);
    });

    return () => {
      disconnectWebSocket();
    };
  }, [conversationId]);

  if (loading) return <div className="p-4">Loading messages...</div>;

  return (
    <div className="h-screen flex flex-col">
      <div className="flex-1 overflow-hidden">
        <ChatWindow conversationId={conversationId} />
      </div>
      <MessageInput conversationId={conversationId} />
    </div>
  );
}