import { GoogleGenerativeAI } from "@google/generative-ai";
import { storage } from "../storage";

export interface BlogPostContent {
  title: string;
  slug: string;
  summary: string;
  content: string;
  tags: string[];
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
  authorName: string;
}

export class BlogService {
  private gemini: GoogleGenerativeAI | null = null;

  constructor() {
    // Initialize Gemini
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (apiKey) {
      this.gemini = new GoogleGenerativeAI(apiKey);
    }
  }
  
  /**
   * Create a blog post with pre-written content
   */
  public async createPredefinedBlogPost(content: BlogPostContent): Promise<boolean> {
    try {
      const post = await storage.createBlogPost({
        ...content,
        publishedAt: new Date().toISOString()
      });
      
      return !!post;
    } catch (error) {
      console.error("Error creating predefined blog post:", error);
      return false;
    }
  }

  /**
   * Generate a blog post about Instagram marketing best practices
   */
  public async generateBlogPost(topic?: string): Promise<BlogPostContent | null> {
    if (!this.gemini) {
      console.error("Gemini API not initialized. Missing API key.");
      return null;
    }

    try {
      // Using Gemini 1.5 Pro model which was released after your knowledge cutoff date
      const model = this.gemini.getGenerativeModel({ model: "gemini-1.5-pro" });
      
      const defaultTopic = topic || "instagram marketing strategy";
      
      const prompt = `
        Generate a professional, SEO-optimized blog post about "${defaultTopic}" for an Instagram AI automation platform.
        The post should be informative, focus on best practices, and subtly promote our Instagram AI Agent platform as a solution.
        
        Format the response as a JSON object with the following structure:
        {
          "title": "An engaging, SEO-optimized title",
          "slug": "url-friendly-version-of-title",
          "summary": "A 2-3 sentence summary of the post",
          "content": "Full blog post content in markdown format with proper headings (H2, H3), paragraphs, bullet points where appropriate, and at least 800 words",
          "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
          "seoTitle": "SEO-optimized title (may be different from main title)",
          "seoDescription": "Meta description for SEO purposes (150-160 characters)",
          "seoKeywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
          "authorName": "AI Content Team"
        }
        
        Make sure the content:
        - Contains practical, actionable advice for Instagram marketers
        - References current best practices for Instagram
        - Includes relevant statistics when possible
        - Has sections with clear headings
        - Includes a call to action mentioning our Instagram AI Agent platform
        - Is engaging and valuable to readers
        - Contains no placeholder text
      `;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      // Extract the JSON from the text (in case it contains any additional text)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Failed to parse JSON from response");
      }
      
      const jsonString = jsonMatch[0];
      const blogPost = JSON.parse(jsonString) as BlogPostContent;
      
      // Validate that all fields are present
      const requiredFields: (keyof BlogPostContent)[] = [
        "title", "slug", "summary", "content", "tags", 
        "seoTitle", "seoDescription", "seoKeywords", "authorName"
      ];
      
      for (const field of requiredFields) {
        if (!blogPost[field]) {
          throw new Error(`Missing required field: ${field}`);
        }
      }
      
      return blogPost;
    } catch (error) {
      console.error("Error generating blog post:", error);
      return null;
    }
  }

  /**
   * Generate blog post suggestions
   */
  public async generateBlogTopics(count: number = 5): Promise<string[] | null> {
    if (!this.gemini) {
      console.error("Gemini API not initialized. Missing API key.");
      return null;
    }

    try {
      // Using Gemini 1.5 Pro model which was released after your knowledge cutoff date
      const model = this.gemini.getGenerativeModel({ model: "gemini-1.5-pro" });
      
      const prompt = `
        Generate ${count} blog topic ideas for an Instagram AI automation platform.
        The topics should focus on Instagram marketing best practices, automation benefits, 
        and content strategies that would be valuable for social media managers and businesses.
        
        Return just the list of topics, one per line.
      `;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      // Split by newlines and filter empty lines
      const topics = text.split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.match(/^[0-9]+\./)) // Remove numbered list markers
        .slice(0, count);
      
      return topics;
    } catch (error) {
      console.error("Error generating blog topics:", error);
      return null;
    }
  }
}

export const blogService = new BlogService();