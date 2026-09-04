
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";

const pinnedItems = [
  {
    title: 'Master the Offside Trap',
    category: 'Tactics',
    imageUrl: 'https://placehold.co/300x400.png',
    hint: 'football tactics board'
  },
  {
    title: 'Top 10 Goals of the Season',
    category: 'Highlights',
    imageUrl: 'https://placehold.co/300x400.png',
    hint: 'football goal celebration'
  },
  {
    title: 'A Day in the Life of a Pro',
    category: 'Lifestyle',
    imageUrl: 'https://placehold.co/300x400.png',
    hint: 'football player training'
  },
  {
    title: 'History of the World Cup',
    category: 'Documentary',
    imageUrl: 'https://placehold.co/300x400.png',
    hint: 'vintage world cup'
  },
   {
    title: 'Legendary Derbies',
    category: 'Rivalries',
    imageUrl: 'https://placehold.co/300x400.png',
    hint: 'stadium flare smoke'
  }
];

export function PinnedContent() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold px-4">Pinned for you</h2>
      <div className="flex space-x-4 overflow-x-auto pb-4 px-4 no-scrollbar scroll-snap-x-mandatory">
        {pinnedItems.map((item, index) => (
          <div key={index} className="flex-shrink-0 w-[60vw] md:w-40 scroll-snap-align-start">
            <Card className="overflow-hidden rounded-lg group cursor-pointer">
              <div className="relative h-52">
                <Image
                  src={item.imageUrl}
                  alt={item.title}
                  fill
                  unoptimized
                  sizes="(max-width: 767px) 60vw, 160px"
                  objectFit="cover"
                  data-ai-hint={item.hint}
                  className="transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <CardContent className="p-3 bg-secondary">
                <p className="text-xs font-semibold text-primary uppercase">{item.category}</p>
                <h3 className="font-bold text-sm truncate">{item.title}</h3>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
