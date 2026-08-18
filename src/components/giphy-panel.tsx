'use client';

import { useContext } from 'react';
import { Grid, SearchBar, SearchContext, SearchContextManager } from '@giphy/react-components';
import { useResponsiveGridWidth } from '@/hooks/use-responsive-grid-width';

/**
 * The GIF/sticker picker, in one place and behind its own bundle.
 *
 * The composer and the reply box each carried their own near-identical copy of
 * this, which pulled @giphy/react-components into the main bundle twice over —
 * loaded by everyone on first paint, for a panel that only opens on a click.
 * Both now reach it through next/dynamic, so the Giphy code is fetched the
 * first time someone actually opens the picker.
 */

type GifSelectHandler = (gif: any, e: React.SyntheticEvent<HTMLElement, Event>) => void;

function PanelContents({
  onSelect,
  maxWidth,
  emptyMessage,
}: {
  onSelect: GifSelectHandler;
  maxWidth: number;
  emptyMessage: string;
}) {
  const { fetchGifs, searchKey } = useContext(SearchContext);
  const width = useResponsiveGridWidth(maxWidth);

  // Giphy's <Grid> is a masonry with no height of its own — it grows with
  // however many results come back. Unconstrained, the popover ended up taller
  // than a phone screen, and the search bar at the top got pushed out of view,
  // which is the one control the picker exists for. Cap the panel and scroll
  // the results underneath a pinned search bar.
  return (
    <div className="flex max-h-[60vh] flex-col">
      <div className="shrink-0">
        <SearchBar />
      </div>
      <div className="mt-2 min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <Grid
          key={searchKey}
          width={width}
          columns={3}
          fetchGifs={fetchGifs}
          onGifClick={onSelect}
          noResultsMessage={emptyMessage}
        />
      </div>
    </div>
  );
}

export function GiphyPanel({
  type,
  onSelect,
  maxWidth,
}: {
  type: 'gifs' | 'stickers';
  onSelect: GifSelectHandler;
  maxWidth: number;
}) {
  return (
    <SearchContextManager
      key={type}
      apiKey={process.env.NEXT_PUBLIC_GIPHY_API_KEY || ''}
      options={type === 'stickers' ? { type: 'stickers' } : undefined}
    >
      <PanelContents
        onSelect={onSelect}
        maxWidth={maxWidth}
        emptyMessage={type === 'stickers' ? 'No stickers found.' : 'No GIFs found.'}
      />
    </SearchContextManager>
  );
}

export default GiphyPanel;
