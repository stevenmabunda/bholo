
'use server';

import { createClient } from '@/lib/supabase/server';
import { getUserProfile, type ProfileData } from '@/app/(app)/profile/actions';

export type Message = {
    id: string;
    senderId: string;
    text: string;
    timestamp: Date;
};

export type Conversation = {
    id: string;
    participantIds: string[];
    lastMessage: {
        text: string;
        timestamp: Date;
        senderId: string;
    };
    otherUser: ProfileData;
    isRead: boolean;
};

export type ConversationDetails = {
    id: string;
    participants: ProfileData[];
};

export async function getOrCreateConversation(currentUserId: string, otherUserId: string): Promise<string> {
    const supabase = await createClient();

    // Find an existing 1:1 conversation between exactly these two users.
    const { data: mine } = await supabase.from('conversation_participants').select('conversation_id').eq('user_id', currentUserId);
    const { data: theirs } = await supabase.from('conversation_participants').select('conversation_id').eq('user_id', otherUserId);

    const mineIds = new Set((mine ?? []).map(r => r.conversation_id));
    const shared = (theirs ?? []).map(r => r.conversation_id).find(id => mineIds.has(id));

    if (shared) return shared;

    const { data: conversation, error } = await supabase.from('conversations').insert({}).select().single();
    if (error || !conversation) throw error ?? new Error('Could not create conversation');

    const { error: participantsError } = await supabase.from('conversation_participants').insert([
        { conversation_id: conversation.id, user_id: currentUserId },
        { conversation_id: conversation.id, user_id: otherUserId },
    ]);
    if (participantsError) throw participantsError;

    return conversation.id;
}

export async function sendMessage(conversationId: string, senderId: string, text: string): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase.from('conversation_messages').insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content: text,
    });
    if (error) throw error;

    await supabase.from('conversation_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', senderId);
}

export async function getConversations(userId: string): Promise<Conversation[]> {
    const supabase = await createClient();

    const { data: mine } = await supabase
        .from('conversation_participants')
        .select('conversation_id, last_read_at')
        .eq('user_id', userId);

    if (!mine || mine.length === 0) return [];

    const conversations = await Promise.all(mine.map(async ({ conversation_id, last_read_at }) => {
        const [{ data: participants }, { data: lastMessageRows }] = await Promise.all([
            supabase.from('conversation_participants').select('user_id').eq('conversation_id', conversation_id),
            supabase.from('conversation_messages').select('*').eq('conversation_id', conversation_id).order('created_at', { ascending: false }).limit(1),
        ]);

        const otherUserId = (participants ?? []).map(p => p.user_id).find(id => id !== userId);
        const lastMessage = lastMessageRows?.[0];
        if (!otherUserId || !lastMessage) return null;

        const otherUser = await getUserProfile(otherUserId);
        if (!otherUser) return null;

        const isRead = lastMessage.sender_id === userId || new Date(lastMessage.created_at) <= new Date(last_read_at);

        return {
            id: conversation_id,
            participantIds: (participants ?? []).map(p => p.user_id),
            lastMessage: {
                text: lastMessage.content,
                timestamp: new Date(lastMessage.created_at),
                senderId: lastMessage.sender_id,
            },
            otherUser,
            isRead,
        } as Conversation;
    }));

    const validConversations = conversations.filter((c): c is Conversation => c !== null);
    validConversations.sort((a, b) => b.lastMessage.timestamp.getTime() - a.lastMessage.timestamp.getTime());

    return validConversations;
}

export async function getConversationDetails(conversationId: string): Promise<ConversationDetails | null> {
    const supabase = await createClient();

    const { data: participantRows } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', conversationId);

    if (!participantRows) return null;

    const participants = await Promise.all(participantRows.map(p => getUserProfile(p.user_id)));

    return {
        id: conversationId,
        participants: participants.filter((p): p is ProfileData => p !== null),
    };
}

export async function markConversationRead(conversationId: string, userId: string): Promise<void> {
    const supabase = await createClient();
    await supabase.from('conversation_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', userId);
}
