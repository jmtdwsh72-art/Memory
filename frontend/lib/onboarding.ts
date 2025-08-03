/**
 * Onboarding utilities for Memory Agent
 */

const ONBOARDING_KEY = 'memoryAgent.onboardingComplete';
const FIRST_VISIT_KEY = 'memoryAgent.firstVisit';

export interface OnboardingState {
  isFirstVisit: boolean;
  onboardingComplete: boolean;
  hasMemoryData: boolean;
  hasLogData: boolean;
}

/**
 * Check if user has completed onboarding
 */
export function hasCompletedOnboarding(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(ONBOARDING_KEY) === 'true';
}

/**
 * Mark onboarding as complete
 */
export function completeOnboarding(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ONBOARDING_KEY, 'true');
  
  // Dispatch event for components to react to
  window.dispatchEvent(new CustomEvent('onboarding-complete'));
}

/**
 * Reset onboarding state (for testing or replay)
 */
export function resetOnboarding(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ONBOARDING_KEY);
  localStorage.removeItem(FIRST_VISIT_KEY);
  
  // Dispatch event for components to react to
  window.dispatchEvent(new CustomEvent('onboarding-reset'));
}

/**
 * Check if this is the user's first visit
 */
export function isFirstVisit(): boolean {
  if (typeof window === 'undefined') return false;
  
  const hasVisited = localStorage.getItem(FIRST_VISIT_KEY);
  if (!hasVisited) {
    localStorage.setItem(FIRST_VISIT_KEY, 'true');
    return true;
  }
  return false;
}

/**
 * Check if user has existing memory or log data
 */
export async function hasExistingData(): Promise<{ hasMemory: boolean; hasLogs: boolean }> {
  try {
    // Check for memory data
    const memoryResponse = await fetch('/api/memory/stats');
    const memoryData = await memoryResponse.json();
    const hasMemory = memoryData.success && memoryData.stats?.totalMemories > 0;

    // Check for log data
    const logsResponse = await fetch('/api/logs/stats');
    const logsData = await logsResponse.json();
    const hasLogs = logsData.success && logsData.stats?.totalLogs > 0;

    return { hasMemory, hasLogs };
  } catch (error) {
    console.warn('Failed to check existing data:', error);
    return { hasMemory: false, hasLogs: false };
  }
}

/**
 * Determine if onboarding should be shown
 */
export async function shouldShowOnboarding(): Promise<boolean> {
  // Skip if onboarding already completed
  if (hasCompletedOnboarding()) {
    return false;
  }

  // Check if first visit or no existing data
  const firstVisit = isFirstVisit();
  const { hasMemory, hasLogs } = await hasExistingData();
  
  // Show onboarding if it's first visit OR no existing data
  return firstVisit || (!hasMemory && !hasLogs);
}

/**
 * Get current onboarding state
 */
export async function getOnboardingState(): Promise<OnboardingState> {
  const isFirst = isFirstVisit();
  const completed = hasCompletedOnboarding();
  const { hasMemory, hasLogs } = await hasExistingData();
  
  return {
    isFirstVisit: isFirst,
    onboardingComplete: completed,
    hasMemoryData: hasMemory,
    hasLogData: hasLogs
  };
}

/**
 * Generate welcome message sequence
 */
export function getWelcomeMessageSequence(): Array<{ content: string; delay: number }> {
  return [
    {
      content: "👋 Welcome to Memory Agent!",
      delay: 500
    },
    {
      content: "I'm here to help you get started with your AI assistant that remembers everything.",
      delay: 1500
    },
    {
      content: "Let me show you around and explain how everything works! 🚀",
      delay: 2500
    }
  ];
}

/**
 * Listen for onboarding events
 */
export function onOnboardingEvent(
  event: 'complete' | 'reset',
  callback: () => void
): () => void {
  const eventName = `onboarding-${event}`;
  const handler = () => callback();
  
  window.addEventListener(eventName, handler);
  
  // Return cleanup function
  return () => window.removeEventListener(eventName, handler);
}