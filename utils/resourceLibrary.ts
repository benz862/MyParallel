/**
 * Resource Library for MyParallel
 * Maps wellness topics to helpful resources (PDFs, web links, etc)
 * These are sent to users via SMS or email when requested during voice calls
 */

export interface WellnessResource {
  title: string;
  description: string;
  url: string; // Link to PDF, article, or webpage
  type: 'pdf' | 'article' | 'video' | 'guide';
  topics: string[]; // Keywords this resource covers
}

export const WELLNESS_RESOURCES: Record<string, WellnessResource[]> = {
  // Mental Health & Emotions
  depression: [
    {
      title: "Understanding Depression",
      description: "A comprehensive guide to depression symptoms, causes, and treatment options.",
      url: "https://www.nimh.nih.gov/health/publications/depression",
      type: "guide",
      topics: ["depression", "mental health", "sadness", "mood"],
    },
    {
      title: "Daily Tips for Managing Depression",
      description: "Practical strategies for coping with depression in daily life.",
      url: "https://www.mind.org.uk/information-support/types-of-mental-health-problems/depression/self-care/",
      type: "article",
      topics: ["depression", "coping", "self-care", "wellness"],
    },
  ],
  anxiety: [
    {
      title: "Managing Anxiety: Evidence-Based Techniques",
      description: "Learn breathing exercises, grounding techniques, and cognitive strategies.",
      url: "https://www.adaa.org/understanding-anxiety",
      type: "guide",
      topics: ["anxiety", "panic", "stress", "worry"],
    },
    {
      title: "5-4-3-2-1 Grounding Technique",
      description: "Step-by-step instructions for the grounding technique to calm anxiety.",
      url: "https://www.mentalhealthamerica.net/grounding-techniques",
      type: "article",
      topics: ["anxiety", "grounding", "calming", "panic"],
    },
  ],
  loneliness: [
    {
      title: "Combating Loneliness: A Practical Guide",
      description: "Strategies for building connections and reducing feelings of isolation.",
      url: "https://www.bbc.com/bitesize/articles/z9n8n9q",
      type: "guide",
      topics: ["loneliness", "connection", "isolation", "community"],
    },
    {
      title: "Finding Community and Support Groups",
      description: "How to find local and online support communities.",
      url: "https://www.supportgroups.com/",
      type: "article",
      topics: ["loneliness", "support", "community", "connection"],
    },
  ],
  sleep: [
    {
      title: "Sleep Hygiene Guide",
      description: "Evidence-based tips for improving sleep quality and duration.",
      url: "https://www.sleepfoundation.org/sleep-hygiene",
      type: "guide",
      topics: ["sleep", "insomnia", "rest", "health"],
    },
    {
      title: "Bedtime Routine Ideas",
      description: "Create a calming routine to prepare for better sleep.",
      url: "https://www.aasm.org/what-is-sleep/",
      type: "article",
      topics: ["sleep", "routine", "relaxation", "wellness"],
    },
  ],
  grief: [
    {
      title: "Understanding Grief and Loss",
      description: "A compassionate guide to navigating the grieving process.",
      url: "https://www.webmd.com/mental-health/grief-loss",
      type: "guide",
      topics: ["grief", "loss", "bereavement", "mourning"],
    },
    {
      title: "Coping with Loss: Resources and Support",
      description: "Finding support and healing after loss.",
      url: "https://www.griefshare.org/",
      type: "article",
      topics: ["grief", "loss", "support", "healing"],
    },
  ],

  // Physical Health
  nutrition: [
    {
      title: "Healthy Eating for Wellness",
      description: "Nutrition basics and meal planning tips.",
      url: "https://www.heart.org/en/healthy-living/healthy-eating",
      type: "guide",
      topics: ["nutrition", "diet", "health", "eating"],
    },
  ],
  exercise: [
    {
      title: "Exercise Benefits for Mental & Physical Health",
      description: "How movement improves overall wellbeing.",
      url: "https://www.cdc.gov/physicalactivity/basics/",
      type: "guide",
      topics: ["exercise", "fitness", "movement", "activity"],
    },
  ],

  // Elder Care & Specific Populations
  elderly: [
    {
      title: "Healthy Aging Guide",
      description: "Tips for maintaining health and independence in older age.",
      url: "https://www.nia.nih.gov/health/healthy-aging",
      type: "guide",
      topics: ["elderly", "aging", "senior care", "health"],
    },
  ],

  // Crises
  crisis: [
    {
      title: "Crisis Resources & Hotlines",
      description: "Immediate help when you need it most.",
      url: "https://www.samhsa.gov/find-help/national-helpline",
      type: "guide",
      topics: ["crisis", "emergency", "help", "support"],
    },
  ],
};

/**
 * Find relevant resources based on detected topics or keywords
 * @param topics - Array of topic keywords detected from conversation
 * @returns Array of matching resources
 */
export function getRelevantResources(topics: string[]): WellnessResource[] {
  const resources = new Set<WellnessResource>();
  
  topics.forEach(topic => {
    const normalizedTopic = topic.toLowerCase().trim();
    const matchingResources = WELLNESS_RESOURCES[normalizedTopic] || [];
    matchingResources.forEach(r => resources.add(r));
  });
  
  return Array.from(resources);
}

/**
 * Format resources for display/delivery
 * @param resources - Array of resources
 * @returns Formatted text for SMS or email
 */
export function formatResourcesForDelivery(
  resources: WellnessResource[],
  deliveryMethod: 'sms' | 'email'
): string {
  if (resources.length === 0) {
    return "No resources available for this topic.";
  }

  if (deliveryMethod === 'sms') {
    // SMS needs to be concise
    return resources
      .slice(0, 2) // Limit to 2 resources for SMS
      .map((r, i) => `${i + 1}. ${r.title}\n${r.url}`)
      .join("\n\n");
  } else {
    // Email can be more detailed
    return resources
      .map(
        (r) =>
          `📚 ${r.title}\n${r.description}\n🔗 ${r.url}\nType: ${r.type}\n`
      )
      .join("\n---\n\n");
  }
}
