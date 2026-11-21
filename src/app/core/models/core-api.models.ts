import type {
  ResearchPaper,
  ResearchSortOption,
  SupportedResultLimit,
} from './research-paper.model';

export interface CoreAuthorDto {
  readonly name?: string | null;
}

export interface CoreJournalDto {
  readonly title?: string | null;
  readonly identifiers?: readonly string[] | null;
}

export interface CoreDataProviderDto {
  readonly id?: number;
  readonly name?: string | null;
  readonly url?: string | null;
  readonly logo?: string | null;
}

export interface CoreLanguageDto {
  readonly code?: string | null;
  readonly name?: string | null;
}

export interface CoreLinkDto {
  readonly type?: string | null;
  readonly url?: string | null;
}

export interface CoreWorkDto {
  readonly id?: number | string | null;
  readonly title?: string | null;
  readonly authors?: readonly CoreAuthorDto[] | null;
  readonly abstract?: string | null;
  readonly yearPublished?: number | string | null;
  readonly publishedDate?: string | null;
  readonly doi?: string | null;
  readonly publisher?: string | null;
  readonly journals?: readonly CoreJournalDto[] | null;
  readonly fieldOfStudy?: string | null;
  readonly subjects?: readonly string[] | null;
  readonly documentType?: string | null;
  readonly language?: CoreLanguageDto | null;
  readonly dataProviders?: readonly CoreDataProviderDto[] | null;
  readonly downloadUrl?: string | null;
  readonly sourceFulltextUrls?: readonly string[] | null;
  readonly links?: readonly CoreLinkDto[] | null;
  readonly citationCount?: number | null;
  readonly fullText?: string | null;
}

export interface CoreSearchResponseDto {
  readonly totalHits?: number;
  readonly limit?: number;
  readonly offset?: number;
  readonly results?: readonly CoreWorkDto[];
  readonly searchId?: string;
}

export interface CoreSearchRequest {
  readonly query: string;
  readonly limit: SupportedResultLimit;
  readonly offset?: number;
  readonly sort?: ResearchSortOption;
}

export interface CoreSearchResult {
  readonly totalHits: number | null;
  readonly limit: number;
  readonly offset: number;
  readonly papers: readonly ResearchPaper[];
  readonly rateLimitRemaining: number | null;
  readonly rateLimitReset: string | null;
}
