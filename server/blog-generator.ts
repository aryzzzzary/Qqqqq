import { blogService } from "./services/blog-service";
import { storage } from "./storage";

/**
 * This is a utility script for automatically generating blog posts
 * It can be run manually or set up as a cron job
 */
export class BlogGenerator {
  // Topics to cycle through
  private static topics = [
    "instagram automation best practices",
    "ai content creation for instagram",
    "instagram marketing strategies",
    "instagram engagement automation",
    "instagram analytics optimization",
    "instagram hashtag strategies",
    "instagram reels optimization",
    "instagram growth tactics",
    "instagram business account tips",
    "social media automation roi",
    "instagram algorithm updates",
    "instagram content planning",
    "instagram caption writing tips",
    "instagram visual content strategy",
    "instagram dm automation",
    "instagram competitor analysis",
    "instagram influencer marketing",
    "instagram story engagement",
    "instagram post timing optimization",
    "instagram audience growth"
  ];
  
  // Current position in the topics list
  private static currentTopicIndex = 0;
  
  /**
   * Generate a new blog post and store it in the database
   */
  public static async generateAndStoreBlogPost(): Promise<boolean> {
    try {
      // Get the next topic from the list
      const topic = this.getNextTopic();
      
      console.log(`Generating blog post about: ${topic}`);
      
      // Generate the blog post content
      const blogPostContent = await blogService.generateBlogPost(topic);
      
      if (!blogPostContent) {
        console.error("Failed to generate blog post content");
        return false;
      }
      
      // Add current date as publishedAt
      const postWithDate = {
        ...blogPostContent,
        publishedAt: new Date().toISOString()
      };
      
      // Store the blog post in the database
      const post = await storage.createBlogPost(postWithDate);
      
      console.log(`Blog post created: ${post.title} (ID: ${post.id})`);
      return true;
    } catch (error) {
      console.error("Error in blog post generation:", error);
      return false;
    }
  }
  
  /**
   * Generate multiple blog posts
   */
  public static async generateMultiplePosts(count: number): Promise<number> {
    let successCount = 0;
    
    for (let i = 0; i < count; i++) {
      const success = await this.generateAndStoreBlogPost();
      if (success) {
        successCount++;
      }
      
      // Add a delay between post generations to avoid API rate limits
      if (i < count - 1) {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    return successCount;
  }
  
  /**
   * Get the next topic from the list
   */
  private static getNextTopic(): string {
    const topic = this.topics[this.currentTopicIndex];
    this.currentTopicIndex = (this.currentTopicIndex + 1) % this.topics.length;
    return topic;
  }
}

// If this file is run directly, generate a blog post
// Using import.meta.url to check if this is the main module
if (import.meta.url.endsWith(process.argv[1])) {
  (async () => {
    try {
      const count = process.argv[2] ? parseInt(process.argv[2]) : 1;
      const successCount = await BlogGenerator.generateMultiplePosts(count);
      console.log(`Generated ${successCount} of ${count} requested blog posts`);
      process.exit(0);
    } catch (error) {
      console.error("Error running blog generator:", error);
      process.exit(1);
    }
  })();
}