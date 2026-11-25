export type SetShareClipMedia = {
  /** URI shown on the video page (local file or remote). */
  playUri: string;
  /** Local (or shareable) full clip for destinations. */
  shareUri: string;
  socialShareUri?: string | null;
  posterFrameUri?: string | null;
};
