/**
 * Metro resolves static image imports to an asset registry id at build time.
 * TypeScript needs these ambient declarations to type those imports, since
 * `expo/types` does not provide them.
 */

declare module '*.png' {
  import type { ImageRequireSource } from 'react-native';

  const source: ImageRequireSource;
  export default source;
}

declare module '*.jpg' {
  import type { ImageRequireSource } from 'react-native';

  const source: ImageRequireSource;
  export default source;
}

declare module '*.svg' {
  import type { ImageRequireSource } from 'react-native';

  const source: ImageRequireSource;
  export default source;
}
