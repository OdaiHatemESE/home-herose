import { useWindowDimensions } from 'react-native';

/**
 * One app, three canvases:
 *  - phone   (< 768 wide): single column, bottom tab bar
 *  - tablet  (≥ 768): side navigation, two-column content
 *  - wide    (≥ 1100, tablet landscape / desktop): roomier grids
 */
export function useLayout() {
  const { width, height } = useWindowDimensions();
  const tablet = width >= 768;
  const wide = width >= 1100;
  const landscape = width > height;
  return {
    width,
    height,
    phone: !tablet,
    tablet,
    wide,
    landscape,
    gutter: tablet ? 28 : 16,
    /** columns for card grids */
    cols: (phone: number, tab: number, wideCols = tab) => (wide ? wideCols : tablet ? tab : phone),
  };
}
