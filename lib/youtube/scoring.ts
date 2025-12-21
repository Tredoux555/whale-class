// =====================================================
// WHALE PLATFORM - VIDEO RELEVANCE SCORING
// =====================================================
// Location: lib/youtube/scoring.ts
// Purpose: Score videos by relevance to curriculum works
// =====================================================

import type {
  YouTubeVideo,
  CurriculumWork,
  RelevanceScore,
  ScoringOptions,
  VideoSearchResult,
} from './types';
import { MONTESSORI_CHANNELS, VIDEO_DURATION_CATEGORIES, SCORE_THRESHOLDS } from './types';

/**
 * Score a video's relevance to a curriculum work
 */
export function scoreVideoRelevance(
  video: YouTubeVideo,
  work: CurriculumWork,
  options: ScoringOptions = {}
): RelevanceScore {
  const reasoning: string[] = [];
  
  // Apply weights (default to 1.0)
  const weights = {
    titleWeight: options.titleWeight ?? 1.0,
    descriptionWeight: options.descriptionWeight ?? 1.0,
    channelWeight: options.channelWeight ?? 1.0,
    viewCountWeight: options.viewCountWeight ?? 0.8,
    recencyWeight: options.recencyWeight ?? 1.0,
    durationWeight: options.durationWeight ?? 1.0,
    engagementWeight: options.engagementWeight ?? 0.5,
  };

  // 1. TITLE MATCH (0-20 points)
  const titleScore = scoreTitleMatch(video.title, work.work_name, reasoning);

  // 2. DESCRIPTION MATCH (0-20 points)
  const descriptionScore = scoreDescriptionMatch(
    video.description,
    work.work_name,
    work.description || '',
    reasoning
  );

  // 3. CHANNEL AUTHORITY (0-15 points)
  const channelScore = scoreChannelAuthority(video.channelTitle, reasoning);

  // 4. VIEW COUNT (0-10 points)
  const viewScore = scoreViewCount(video.viewCount || 0, reasoning);

  // 5. RECENCY (0-15 points)
  const recencyScore = scoreRecency(video.publishedAt, reasoning);

  // 6. DURATION (0-15 points)
  const durationScore = scoreDuration(video.duration || 0, reasoning);

  // 7. ENGAGEMENT (0-5 points)
  const engagementScore = scoreEngagement(video, reasoning);

  // Apply weights and calculate total
  const scoreBreakdown = {
    titleMatch: Math.round(titleScore * weights.titleWeight),
    descriptionMatch: Math.round(descriptionScore * weights.descriptionWeight),
    channelAuthority: Math.round(channelScore * weights.channelWeight),
    viewCount: Math.round(viewScore * weights.viewCountWeight),
    recency: Math.round(recencyScore * weights.recencyWeight),
    duration: Math.round(durationScore * weights.durationWeight),
    engagement: Math.round(engagementScore * weights.engagementWeight),
  };

  const totalScore = Math.min(
    100,
    Object.values(scoreBreakdown).reduce((sum, score) => sum + score, 0)
  );

  return {
    totalScore,
    scoreBreakdown,
    reasoning,
    isPassing: totalScore >= SCORE_THRESHOLDS.ACCEPTABLE,
  };
}

/**
 * Score title match (0-20 points)
 */
function scoreTitleMatch(title: string, workName: string, reasoning: string[]): number {
  const titleLower = title.toLowerCase();
  const workLower = workName.toLowerCase();

  // Exact work name match in title
  if (titleLower === workLower || titleLower === `montessori ${workLower}`) {
    reasoning.push(`✓ Exact title match: "${workName}"`);
    return 20;
  }

  // Work name appears in title
  if (titleLower.includes(workLower)) {
    reasoning.push(`✓ Work name in title: "${workName}"`);
    return 15;
  }

  // Check for key terms from work name
  const workTerms = workName.toLowerCase().split(/\s+/);
  const matchedTerms = workTerms.filter(term => 
    term.length > 3 && titleLower.includes(term)
  );

  if (matchedTerms.length >= 2) {
    reasoning.push(`✓ Multiple key terms in title: ${matchedTerms.join(', ')}`);
    return 12;
  }

  if (matchedTerms.length === 1) {
    reasoning.push(`○ Some title match: ${matchedTerms[0]}`);
    return 8;
  }

  // Check for Montessori mention
  if (titleLower.includes('montessori')) {
    reasoning.push(`○ Montessori in title but work name not found`);
    return 5;
  }

  reasoning.push(`✗ No strong title match`);
  return 0;
}

/**
 * Score description match (0-20 points)
 */
function scoreDescriptionMatch(
  description: string,
  workName: string,
  workDescription: string,
  reasoning: string[]
): number {
  const descLower = description.toLowerCase();
  const workLower = workName.toLowerCase();
  let score = 0;

  // Contains "Montessori"
  if (descLower.includes('montessori')) {
    score += 10;
    reasoning.push(`✓ "Montessori" in description`);
  }

  // Contains work name
  if (descLower.includes(workLower)) {
    score += 5;
    reasoning.push(`✓ Work name in description`);
  }

  // Contains educational keywords
  const educationalKeywords = [
    'lesson', 'presentation', 'tutorial', 'demonstration',
    'teaching', 'learning', 'activity', 'exercise', 'material'
  ];
  
  const foundKeywords = educationalKeywords.filter(kw => descLower.includes(kw));
  if (foundKeywords.length > 0) {
    score += Math.min(5, foundKeywords.length * 2);
    reasoning.push(`✓ Educational content: ${foundKeywords.slice(0, 2).join(', ')}`);
  }

  return Math.min(20, score);
}

/**
 * Score channel authority (0-15 points)
 */
function scoreChannelAuthority(channelTitle: string, reasoning: string[]): number {
  const channelLower = channelTitle.toLowerCase();

  // Official Montessori channels
  for (const officialChannel of MONTESSORI_CHANNELS) {
    if (channelLower.includes(officialChannel.toLowerCase())) {
      reasoning.push(`✓ Official Montessori channel: ${channelTitle}`);
      return 15;
    }
  }

  // Contains "Montessori"
  if (channelLower.includes('montessori')) {
    reasoning.push(`✓ Montessori-focused channel: ${channelTitle}`);
    return 12;
  }

  // Educational channel indicators
  const eduIndicators = ['education', 'learning', 'teacher', 'school', 'academy', 'training'];
  for (const indicator of eduIndicators) {
    if (channelLower.includes(indicator)) {
      reasoning.push(`○ Educational channel: ${channelTitle}`);
      return 8;
    }
  }

  // Parent/teacher review channels
  if (channelLower.includes('parent') || channelLower.includes('teacher') || 
      channelLower.includes('homeschool')) {
    reasoning.push(`○ Parent/teacher channel: ${channelTitle}`);
    return 5;
  }

  reasoning.push(`○ Unknown channel: ${channelTitle}`);
  return 3;
}

/**
 * Score view count (0-10 points)
 */
function scoreViewCount(viewCount: number, reasoning: string[]): number {
  if (viewCount >= 100000) {
    reasoning.push(`✓ High engagement: ${formatViews(viewCount)} views`);
    return 10;
  }
  
  if (viewCount >= 50000) {
    reasoning.push(`✓ Good engagement: ${formatViews(viewCount)} views`);
    return 9;
  }
  
  if (viewCount >= 10000) {
    reasoning.push(`○ Moderate engagement: ${formatViews(viewCount)} views`);
    return 7;
  }
  
  if (viewCount >= 1000) {
    reasoning.push(`○ Some engagement: ${formatViews(viewCount)} views`);
    return 5;
  }
  
  if (viewCount >= 100) {
    reasoning.push(`○ Limited engagement: ${viewCount} views`);
    return 3;
  }

  reasoning.push(`✗ Very few views: ${viewCount}`);
  return 1;
}

/**
 * Score recency (0-15 points)
 */
function scoreRecency(publishedAt: string, reasoning: string[]): number {
  const publishDate = new Date(publishedAt);
  const now = new Date();
  const ageInDays = Math.floor((now.getTime() - publishDate.getTime()) / (1000 * 60 * 60 * 24));
  const ageInYears = ageInDays / 365;

  if (ageInYears < 1) {
    reasoning.push(`✓ Recent: Published ${ageInDays} days ago`);
    return 15;
  }
  
  if (ageInYears < 2) {
    reasoning.push(`✓ Fairly recent: Published ${Math.floor(ageInYears * 12)} months ago`);
    return 12;
  }
  
  if (ageInYears < 3) {
    reasoning.push(`○ Recent enough: Published ${Math.floor(ageInYears)} years ago`);
    return 8;
  }
  
  if (ageInYears < 5) {
    reasoning.push(`○ Older content: Published ${Math.floor(ageInYears)} years ago`);
    return 5;
  }

  reasoning.push(`✗ Old content: Published ${Math.floor(ageInYears)} years ago`);
  return 2;
}

/**
 * Score duration (0-15 points)
 */
function scoreDuration(durationSeconds: number, reasoning: string[]): number {
  const minutes = Math.floor(durationSeconds / 60);

  // Ideal duration: 5-15 minutes
  if (durationSeconds >= VIDEO_DURATION_CATEGORIES.IDEAL.min &&
      durationSeconds <= VIDEO_DURATION_CATEGORIES.IDEAL.max) {
    reasoning.push(`✓ Ideal duration: ${minutes} minutes`);
    return 15;
  }

  // Acceptable: 3-20 minutes
  if (durationSeconds >= VIDEO_DURATION_CATEGORIES.MEDIUM.min &&
      durationSeconds <= VIDEO_DURATION_CATEGORIES.MEDIUM.max) {
    reasoning.push(`○ Acceptable duration: ${minutes} minutes`);
    return 12;
  }

  // Workable: 2-30 minutes
  if (durationSeconds >= VIDEO_DURATION_CATEGORIES.LONG.min &&
      durationSeconds <= VIDEO_DURATION_CATEGORIES.LONG.max) {
    reasoning.push(`○ Workable duration: ${minutes} minutes`);
    return 8;
  }

  // Too short or too long
  if (durationSeconds < 120) {
    reasoning.push(`✗ Too short: ${minutes} minutes`);
    return 3;
  }

  reasoning.push(`✗ Too long: ${minutes} minutes`);
  return 3;
}

/**
 * Score engagement (0-5 points)
 */
function scoreEngagement(video: YouTubeVideo, reasoning: string[]): number {
  const viewCount = video.viewCount || 0;
  const likeCount = video.likeCount || 0;
  
  if (viewCount === 0) {
    return 2;
  }

  // Calculate like ratio
  const likeRatio = likeCount / viewCount;
  
  // Estimate rating based on like ratio
  // Typical YouTube videos have 2-5% like ratio
  // High-quality educational content often has 5-10%
  
  if (likeRatio >= 0.08) {
    reasoning.push(`✓ High engagement: ${Math.round(likeRatio * 100)}% like ratio`);
    return 5;
  }
  
  if (likeRatio >= 0.05) {
    reasoning.push(`✓ Good engagement: ${Math.round(likeRatio * 100)}% like ratio`);
    return 4;
  }
  
  if (likeRatio >= 0.02) {
    reasoning.push(`○ Normal engagement: ${Math.round(likeRatio * 100)}% like ratio`);
    return 3;
  }

  return 2;
}

/**
 * Rank videos by relevance score
 */
export function rankVideos(
  videos: YouTubeVideo[],
  work: CurriculumWork,
  options: ScoringOptions = {}
): VideoSearchResult[] {
  const scored = videos.map(video => {
    const score = scoreVideoRelevance(video, work, options);
    return {
      video,
      relevanceScore: score.totalScore,
      reasoning: score.reasoning,
      scoreBreakdown: score.scoreBreakdown,
    };
  });

  // Sort by score descending
  return scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

/**
 * Get best video from search results
 */
export function getBestVideo(
  videos: YouTubeVideo[],
  work: CurriculumWork,
  minScore: number = SCORE_THRESHOLDS.ACCEPTABLE,
  options: ScoringOptions = {}
): VideoSearchResult | null {
  const ranked = rankVideos(videos, work, options);
  
  if (ranked.length === 0) {
    return null;
  }

  const best = ranked[0];
  
  if (best.relevanceScore < minScore) {
    return null;
  }

  return best;
}

/**
 * Format view count for display
 */
function formatViews(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

/**
 * Compare two videos and explain which is better
 */
export function compareVideos(
  video1: YouTubeVideo,
  video2: YouTubeVideo,
  work: CurriculumWork,
  options: ScoringOptions = {}
): {
  winner: YouTubeVideo;
  loser: YouTubeVideo;
  winnerScore: RelevanceScore;
  loserScore: RelevanceScore;
  explanation: string;
} {
  const score1 = scoreVideoRelevance(video1, work, options);
  const score2 = scoreVideoRelevance(video2, work, options);

  const [winner, loser, winnerScore, loserScore] = 
    score1.totalScore >= score2.totalScore
      ? [video1, video2, score1, score2]
      : [video2, video1, score2, score1];

  const scoreDiff = winnerScore.totalScore - loserScore.totalScore;
  
  let explanation = `Video "${winner.title}" scores ${scoreDiff} points higher. `;
  
  // Find biggest differences
  const diffs = Object.entries(winnerScore.scoreBreakdown).map(([key, value]) => ({
    category: key,
    diff: value - (loserScore.scoreBreakdown[key as keyof typeof loserScore.scoreBreakdown] || 0),
  })).sort((a, b) => b.diff - a.diff);

  if (diffs[0].diff > 0) {
    explanation += `Strongest advantage: ${diffs[0].category} (+${diffs[0].diff} points).`;
  }

  return { winner, loser, winnerScore, loserScore, explanation };
}







