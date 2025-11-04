import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import Icon from '@/components/ui/icon';

interface Message {
  id: number;
  nickname: string;
  text: string;
  timestamp: number;
}

interface Invitation {
  id: number;
  telegram_username: string;
  invite_link: string;
  status: 'pending' | 'accepted';
  timestamp: number;
}

interface User {
  id: number;
  nickname: string;
}

const API_URL = 'https://functions.poehali.dev/844851c8-3337-4c5f-b232-bab753c8db7d';

const Index = () => {
  const [currentView, setCurrentView] = useState<'landing' | 'app'>('landing');
  const [nickname, setNickname] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [telegramUsername, setTelegramUsername] = useState('');

  useEffect(() => {
    if (currentView === 'app') {
      loadMessages();
      loadInvitations();
      const interval = setInterval(() => {
        loadMessages();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [currentView]);

  const loadMessages = async () => {
    try {
      const response = await fetch(`${API_URL}?action=messages`);
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const loadInvitations = async () => {
    if (!currentUser) return;
    try {
      const response = await fetch(`${API_URL}?action=invitations&userId=${currentUser.id}`);
      const data = await response.json();
      setInvitations(data.invitations || []);
    } catch (error) {
      console.error('Failed to load invitations:', error);
    }
  };

  const handleJoin = async () => {
    if (nickname.trim()) {
      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'register', nickname: nickname.trim() })
        });
        const data = await response.json();
        setCurrentUser(data.user);
        setCurrentView('app');
      } catch (error) {
        console.error('Failed to register:', error);
      }
    }
  };

  const handleSendMessage = async () => {
    if (newMessage.trim() && currentUser) {
      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'send_message',
            nickname: currentUser.nickname,
            text: newMessage.trim(),
            userId: currentUser.id
          })
        });
        const data = await response.json();
        setMessages([...messages, data.message]);
        setNewMessage('');
        loadMessages();
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    }
  };

  const handleSendInvite = async () => {
    if (telegramUsername.trim() && currentUser) {
      try {
        const inviteLink = `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent('Присоединяйся к анонимному чату!')}`;
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'send_invite',
            telegramUsername: telegramUsername.trim(),
            inviteLink,
            userId: currentUser.id
          })
        });
        const data = await response.json();
        setInvitations([...invitations, data.invitation]);
        setTelegramUsername('');
        loadInvitations();
      } catch (error) {
        console.error('Failed to send invitation:', error);
      }
    }
  };

  const formatTime = (timestamp: number) => {
    return new Intl.DateTimeFormat('ru', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(timestamp));
  };

  if (currentView === 'landing') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 space-y-6 bg-card border-border">
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Icon name="MessageCircle" size={32} className="text-primary" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-foreground">Анонимный чат</h1>
            <p className="text-muted-foreground">Общайтесь свободно под псевдонимом</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Ваш никнейм</label>
              <Input
                placeholder="Введите никнейм..."
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <Button
              onClick={handleJoin}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              size="lg"
            >
              Войти в чат
              <Icon name="ArrowRight" size={20} className="ml-2" />
            </Button>
          </div>

          <div className="pt-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Icon name="Lock" size={16} />
              <span>Полная анонимность</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Icon name="Users" size={16} />
              <span>Приглашения через Telegram</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Icon name="Shield" size={16} />
              <span>Безопасное общение</span>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon name="MessageCircle" size={20} className="text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Анонимный чат</h1>
              <p className="text-xs text-muted-foreground">Вы: {currentUser?.nickname}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentView('landing')}
            className="text-muted-foreground hover:text-foreground"
          >
            <Icon name="LogOut" size={18} />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="chat" className="flex-1 flex flex-col">
        <div className="border-b border-border bg-card px-6">
          <TabsList className="bg-transparent h-12 gap-6">
            <TabsTrigger
              value="chat"
              className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0"
            >
              <Icon name="MessageSquare" size={18} className="mr-2" />
              Чат
            </TabsTrigger>
            <TabsTrigger
              value="invites"
              className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0"
            >
              <Icon name="UserPlus" size={18} className="mr-2" />
              Приглашения
            </TabsTrigger>
            <TabsTrigger
              value="profile"
              className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0"
            >
              <Icon name="User" size={18} className="mr-2" />
              Профиль
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="chat" className="flex-1 flex flex-col m-0">
          <ScrollArea className="flex-1 px-6 py-4">
            <div className="space-y-4 max-w-3xl mx-auto">
              {messages.map((message) => (
                <div key={message.id} className="message-enter">
                  <div className="flex gap-3">
                    <Avatar className="w-9 h-9 bg-primary/20 border border-primary/30">
                      <AvatarFallback className="bg-transparent text-primary text-sm font-medium">
                        {message.nickname.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-baseline gap-2">
                        <span className="font-semibold text-sm text-foreground">{message.nickname}</span>
                        <span className="text-xs text-muted-foreground">{formatTime(message.timestamp)}</span>
                      </div>
                      <div className="text-sm text-foreground bg-secondary/50 rounded-lg px-3 py-2 inline-block">
                        {message.text}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="border-t border-border bg-card p-4">
            <div className="max-w-3xl mx-auto flex gap-2">
              <Input
                placeholder="Введите сообщение..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
              />
              <Button
                onClick={handleSendMessage}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Icon name="Send" size={18} />
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="invites" className="flex-1 m-0 p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            <Card className="p-6 bg-card border-border">
              <h2 className="text-xl font-semibold mb-4 text-foreground">Пригласить в чат</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Отправьте приглашение пользователю Telegram
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="@username"
                  value={telegramUsername}
                  onChange={(e) => setTelegramUsername(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendInvite()}
                  className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                />
                <Button
                  onClick={handleSendInvite}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Icon name="Send" size={18} className="mr-2" />
                  Отправить
                </Button>
              </div>
            </Card>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-foreground">История приглашений</h3>
              {invitations.length === 0 ? (
                <Card className="p-8 text-center bg-card border-border">
                  <Icon name="Inbox" size={48} className="mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">Приглашений пока нет</p>
                </Card>
              ) : (
                <div className="space-y-2">
                  {invitations.map((invite) => (
                    <Card key={invite.id} className="p-4 bg-card border-border">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10 bg-primary/20 border border-primary/30">
                            <AvatarFallback className="bg-transparent text-primary">
                              <Icon name="User" size={18} />
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-foreground">@{invite.telegram_username}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatTime(invite.timestamp)}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant={invite.status === 'accepted' ? 'default' : 'secondary'}
                          className={invite.status === 'accepted' ? 'bg-green-500/20 text-green-400 border-green-500/30' : ''}
                        >
                          {invite.status === 'pending' ? 'Ожидает' : 'Принято'}
                        </Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="profile" className="flex-1 m-0 p-6">
          <div className="max-w-md mx-auto space-y-6">
            <Card className="p-6 bg-card border-border">
              <div className="flex flex-col items-center text-center space-y-4">
                <Avatar className="w-24 h-24 bg-primary/20 border-2 border-primary/30">
                  <AvatarFallback className="bg-transparent text-primary text-3xl font-bold">
                    {currentUser?.nickname.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">{currentUser?.nickname}</h2>
                  <p className="text-sm text-muted-foreground mt-1">Анонимный пользователь</p>
                </div>
              </div>

              <Separator className="my-6" />

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Изменить никнейм
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="Новый никнейм"
                      className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                    />
                    <Button
                      onClick={async () => {
                        if (nickname.trim()) {
                          const response = await fetch(API_URL, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'register', nickname: nickname.trim() })
                          });
                          const data = await response.json();
                          setCurrentUser(data.user);
                        }
                      }}
                      variant="outline"
                      className="border-border hover:bg-secondary"
                    >
                      <Icon name="Check" size={18} />
                    </Button>
                  </div>
                </div>

                <div className="pt-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Сообщений отправлено</span>
                    <span className="font-semibold text-foreground">
                      {messages.filter(m => m.nickname === currentUser?.nickname).length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Приглашений отправлено</span>
                    <span className="font-semibold text-foreground">{invitations.length}</span>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-card border-border">
              <h3 className="font-semibold mb-3 text-foreground">О приложении</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Анонимный чат позволяет общаться без раскрытия личности</p>
                <p>• Полная конфиденциальность</p>
                <p>• Приглашения через Telegram</p>
                <p>• Простой и безопасный интерфейс</p>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Index;