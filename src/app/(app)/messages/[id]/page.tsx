
'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { getConversationDetails, sendMessage, markConversationRead, type Message, type ConversationDetails } from '../actions';
import { supabase } from '@/lib/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Send } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatTimestamp } from '@/lib/utils';
import { cn } from '@/lib/utils';

export default function ChatPage() {
    const { user } = useAuth();
    const router = useRouter();
    const params = useParams();
    const conversationId = params.id as string;

    const [conversation, setConversation] = useState<ConversationDetails | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }

    useEffect(scrollToBottom, [messages]);

    useEffect(() => {
        if (!conversationId) return;

        const fetchDetails = async () => {
            try {
                const details = await getConversationDetails(conversationId);
                setConversation(details);
            } catch (error) {
                console.error("Failed to fetch conversation details", error);
            } finally {
                setLoading(false);
            }
        };

        const fetchMessages = async () => {
            const { data } = await supabase
                .from('conversation_messages')
                .select('*')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: true });
            setMessages((data ?? []).map(row => ({
                id: row.id,
                senderId: row.sender_id,
                text: row.content,
                timestamp: new Date(row.created_at),
            })));
        };

        fetchDetails();
        fetchMessages();

        if (user) {
            markConversationRead(conversationId, user.id);
        }

        const channel = supabase
            .channel(`conversation-${conversationId}-${Math.random().toString(36).slice(2)}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversation_messages', filter: `conversation_id=eq.${conversationId}` }, (payload) => {
                const row = payload.new as any;
                setMessages(prev => [...prev, {
                    id: row.id,
                    senderId: row.sender_id,
                    text: row.content,
                    timestamp: new Date(row.created_at),
                }]);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [conversationId, user]);


    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !newMessage.trim() || !conversationId) return;

        setSending(true);
        const text = newMessage;
        setNewMessage('');

        try {
            await sendMessage(conversationId, user.id, text);
        } catch (error) {
            console.error("Failed to send message", error);
            setNewMessage(text); // Put message back in input on error
        } finally {
            setSending(false);
        }
    };
    
    if (loading) {
        return (
             <div className="flex flex-col h-screen">
                <header className="sticky top-0 z-10 flex items-center gap-4 border-b bg-background/80 p-2 backdrop-blur-sm h-14">
                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => router.back()}>
                        <ArrowLeft />
                    </Button>
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-5 w-24" />
                    </div>
                </header>
                <main className="flex-1 p-4 space-y-4">
                    <Skeleton className="h-10 w-3/5 ml-auto rounded-lg" />
                    <Skeleton className="h-10 w-3/5 mr-auto rounded-lg" />
                    <Skeleton className="h-10 w-3/5 ml-auto rounded-lg" />
                </main>
            </div>
        )
    }

    if (!conversation) {
        return (
            <div>
                <header className="sticky top-0 z-10 flex items-center gap-4 border-b bg-background/80 p-2 backdrop-blur-sm h-14">
                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => router.back()}>
                        <ArrowLeft />
                    </Button>
                    <h1 className="font-bold">Chat not found</h1>
                </header>
                <div className="p-8 text-center text-muted-foreground">
                    <p>Could not load the conversation.</p>
                </div>
            </div>
        )
    }

    const otherUser = conversation.participants.find(p => p.uid !== user?.id);

    return (
        <div className="flex flex-col h-screen">
            <header className="sticky top-0 z-10 flex items-center gap-4 border-b bg-background/80 p-2 backdrop-blur-sm h-14">
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => router.back()}>
                    <ArrowLeft />
                </Button>
                {otherUser && (
                    <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={otherUser.photoURL} />
                            <AvatarFallback>{otherUser.displayName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="font-bold">{otherUser.displayName}</span>
                    </div>
                )}
            </header>
            <main className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                    <div key={msg.id} className={cn("flex items-end gap-2", msg.senderId === user?.id ? "justify-end" : "justify-start")}>
                         {msg.senderId !== user?.id && (
                             <Avatar className="h-8 w-8 self-start">
                                <AvatarImage src={otherUser?.photoURL} />
                                <AvatarFallback>{otherUser?.displayName.charAt(0)}</AvatarFallback>
                            </Avatar>
                         )}
                         <div className={cn(
                             "max-w-xs md:max-w-md rounded-2xl px-4 py-2",
                             msg.senderId === user?.id 
                                ? "bg-primary text-primary-foreground rounded-br-none"
                                : "bg-secondary rounded-bl-none"
                         )}>
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                         </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </main>
            <footer className="sticky bottom-0 bg-background border-t p-2">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <Input 
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Start a new message" 
                        className="flex-1 bg-secondary border-none rounded-full" 
                        autoComplete="off"
                    />
                    <Button type="submit" size="icon" className="rounded-full" disabled={sending || !newMessage.trim()}>
                        <Send className="h-5 w-5" />
                    </Button>
                </form>
            </footer>
        </div>
    );
}
