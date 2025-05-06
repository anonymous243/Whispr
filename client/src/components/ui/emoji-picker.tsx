import { useState, useRef, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const emojiCategories = {
  smileys: [
    { emoji: '😀', name: 'grinning face' },
    { emoji: '😃', name: 'grinning face with big eyes' },
    { emoji: '😄', name: 'grinning face with smiling eyes' },
    { emoji: '😁', name: 'beaming face with smiling eyes' },
    { emoji: '😆', name: 'grinning squinting face' },
    { emoji: '😅', name: 'grinning face with sweat' },
    { emoji: '🤣', name: 'rolling on the floor laughing' },
    { emoji: '😂', name: 'face with tears of joy' },
    { emoji: '🙂', name: 'slightly smiling face' },
    { emoji: '🙃', name: 'upside-down face' },
    { emoji: '😉', name: 'winking face' },
    { emoji: '😊', name: 'smiling face with smiling eyes' },
    { emoji: '😇', name: 'smiling face with halo' },
    { emoji: '🥰', name: 'smiling face with hearts' },
    { emoji: '😍', name: 'smiling face with heart-eyes' },
    { emoji: '🤩', name: 'star-struck' }
  ],
  gestures: [
    { emoji: '👋', name: 'waving hand' },
    { emoji: '🤚', name: 'raised back of hand' },
    { emoji: '✋', name: 'raised hand' },
    { emoji: '🖖', name: 'vulcan salute' },
    { emoji: '👌', name: 'OK hand' },
    { emoji: '✌️', name: 'victory hand' },
    { emoji: '🤞', name: 'crossed fingers' },
    { emoji: '🤙', name: 'call me hand' },
    { emoji: '👍', name: 'thumbs up' },
    { emoji: '👎', name: 'thumbs down' },
    { emoji: '👏', name: 'clapping hands' },
    { emoji: '🙌', name: 'raising hands' }
  ],
  objects: [
    { emoji: '❤️', name: 'red heart' },
    { emoji: '💔', name: 'broken heart' },
    { emoji: '💯', name: 'hundred points' },
    { emoji: '🎂', name: 'birthday cake' },
    { emoji: '🍕', name: 'pizza' },
    { emoji: '🍔', name: 'hamburger' },
    { emoji: '🍺', name: 'beer mug' },
    { emoji: '🍻', name: 'clinking beer mugs' },
    { emoji: '🎮', name: 'video game' },
    { emoji: '📱', name: 'mobile phone' },
    { emoji: '💻', name: 'laptop' },
    { emoji: '📷', name: 'camera' }
  ]
};

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
}

export default function EmojiPicker({ onEmojiSelect }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji);
    setOpen(false);
  };

  const filteredEmojis = (category: typeof emojiCategories.smileys) => {
    if (!filter) return category;
    return category.filter(item => item.name.includes(filter.toLowerCase()));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="text-charcoal hover:bg-gray-100 rounded-full">
          <span className="material-icons text-xl">emoji_emotions</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent ref={popoverRef} className="w-64 p-2" align="end">
        <Tabs defaultValue="smileys" className="w-full">
          <TabsList className="grid grid-cols-3 mb-2">
            <TabsTrigger value="smileys">😊</TabsTrigger>
            <TabsTrigger value="gestures">👋</TabsTrigger>
            <TabsTrigger value="objects">🎮</TabsTrigger>
          </TabsList>
          
          <TabsContent value="smileys" className="mt-0">
            <ScrollArea className="h-48">
              <div className="grid grid-cols-6 gap-1">
                {filteredEmojis(emojiCategories.smileys).map((item, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleEmojiClick(item.emoji)}
                    title={item.name}
                  >
                    {item.emoji}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="gestures" className="mt-0">
            <ScrollArea className="h-48">
              <div className="grid grid-cols-6 gap-1">
                {filteredEmojis(emojiCategories.gestures).map((item, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleEmojiClick(item.emoji)}
                    title={item.name}
                  >
                    {item.emoji}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="objects" className="mt-0">
            <ScrollArea className="h-48">
              <div className="grid grid-cols-6 gap-1">
                {filteredEmojis(emojiCategories.objects).map((item, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleEmojiClick(item.emoji)}
                    title={item.name}
                  >
                    {item.emoji}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
