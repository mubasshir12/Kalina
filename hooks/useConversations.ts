import { useState, useMemo, useCallback } from 'react';
import { Conversation, ChatMessage as ChatMessageType } from '../types';

export const useConversations = () => {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

    const activeConversation = useMemo(() =>
        conversations.find(c => c.id === activeConversationId),
        [conversations, activeConversationId]
    );

    const sortedConversations = useMemo(() => {
        return [...conversations].sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return 0;
        });
    }, [conversations]);

    const updateConversation = useCallback((conversationId: string, updater: (convo: Conversation) => Conversation) => {
        setConversations(prev =>
            prev.map(c =>
                c.id === conversationId ? updater(c) : c
            )
        );
    }, []);

    const updateConversationMessages = useCallback((conversationId: string, updater: (messages: ChatMessageType[]) => ChatMessageType[]) => {
        updateConversation(conversationId, c => ({ ...c, messages: updater(c.messages) }));
    }, [updateConversation]);
    
    const handleNewChat = useCallback(() => {
        const newConversationId = crypto.randomUUID();
        const newConversation: Conversation = {
            id: newConversationId,
            title: "New Chat",
            messages: [],
        };

        setConversations(prev => [newConversation, ...prev]);
        setActiveConversationId(newConversationId);
    }, []);

    const handleSelectConversation = useCallback((id: string) => {
        setActiveConversationId(id);
    }, []);

    const handleRenameConversation = useCallback((id: string, newTitle: string) => {
        updateConversation(id, c => ({ ...c, title: newTitle }));
    }, [updateConversation]);

    const handleDeleteConversation = useCallback((id: string) => {
        setConversations(prev => prev.filter(c => c.id !== id));
        if (activeConversationId === id) {
            setActiveConversationId(null);
        }
    }, [activeConversationId]);

    const handlePinConversation = useCallback((id: string) => {
        updateConversation(id, c => ({ ...c, isPinned: !c.isPinned }));
    }, [updateConversation]);

    return {
        conversations,
        setConversations,
        activeConversationId,
        setActiveConversationId,
        activeConversation,
        sortedConversations,
        updateConversation,
        updateConversationMessages,
        handleNewChat,
        handleSelectConversation,
        handleRenameConversation,
        handleDeleteConversation,
        handlePinConversation
    };
};
