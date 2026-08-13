import { useEffect, useState } from 'react';

// @giphy/react-components' <Grid> needs a real pixel width for its
// masonry layout — it isn't CSS-responsive on its own. A fixed desktop
// width (e.g. 550px) overflows a typical ~360-390px mobile viewport
// inside the picker popover, so this clamps to whatever actually fits.
export function useResponsiveGridWidth(desktopWidth: number, horizontalMargin = 48) {
  const [width, setWidth] = useState(desktopWidth);

  useEffect(() => {
    const compute = () => {
      const available = window.innerWidth - horizontalMargin;
      setWidth(Math.max(260, Math.min(desktopWidth, available)));
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [desktopWidth, horizontalMargin]);

  return width;
}
