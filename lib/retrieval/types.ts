export interface Chunk {
  id: string;
  pageTitle: string;
  headingPath: string;
  url: string;
  text: string;
  tokenCount: number;
}
export interface ScoredChunk { chunk: Chunk; score: number; rank: number }
