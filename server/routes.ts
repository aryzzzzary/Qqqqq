import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { InstagramAPI, requireInstagramAuth } from "./instagram";
import { z } from "zod";
import { 
  insertPostSchema, 
  insertEngagementSettingsSchema,
  insertBlogPostSchema
} from "@shared/schema";
import { aiService } from "./services/ai-service";
import { paymentService } from "./services/payment-service";
import { blogService } from "./services/blog-service";
import { huggingFaceService } from "./services/huggingface-service";
import { seoService } from "./services/seo-service";

// Utility to check authentication in routes
// This helps remove TypeScript errors about req.user being possibly undefined
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  // TypeScript will understand req.user is defined after this point
  req.user = req.user!;
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  // Instagram API connection routes
  app.get("/api/instagram/status", requireAuth, async (req, res, next) => {
    try {
      // Using non-null assertion because requireAuth middleware ensures user exists
      const status = await InstagramAPI.getApiStatus(req.user!.id);
      res.json(status);
    } catch (error) {
      next(error);
    }
  });
  
  app.post("/api/instagram/connect", requireAuth, async (req, res, next) => {
    try {
      const { code } = req.body;
      if (!code) {
        return res.status(400).json({ message: "Authorization code required" });
      }
      
      // Using non-null assertion because requireAuth middleware ensures user exists
      const result = await InstagramAPI.authenticateWithInstagram(code, req.user!.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  });
  
  // Analytics routes
  app.get("/api/analytics", requireInstagramAuth, async (req, res, next) => {
    try {
      const days = req.query.days ? parseInt(req.query.days as string) : 7;
      // req.user is guaranteed to exist after requireInstagramAuth middleware
      const analytics = await InstagramAPI.getAnalytics(req.user!.id, days);
      res.json(analytics);
    } catch (error) {
      next(error);
    }
  });
  
  // Post management routes
  app.get("/api/posts", requireInstagramAuth, async (req, res, next) => {
    try {
      const posts = await storage.getPostsByUserId(req.user!.id);
      res.json(posts);
    } catch (error) {
      next(error);
    }
  });
  
  app.get("/api/posts/scheduled", requireInstagramAuth, async (req, res, next) => {
    try {
      const posts = await storage.getScheduledPosts(req.user!.id);
      res.json(posts);
    } catch (error) {
      next(error);
    }
  });
  
  app.post("/api/posts", requireInstagramAuth, async (req, res, next) => {
    try {
      const validatedData = insertPostSchema.parse({
        ...req.body,
        userId: req.user!.id
      });
      
      const post = await InstagramAPI.schedulePost(req.user!.id, validatedData);
      res.status(201).json(post);
    } catch (error) {
      next(error);
    }
  });
  
  app.put("/api/posts/:id", requireInstagramAuth, async (req, res, next) => {
    try {
      const postId = parseInt(req.params.id);
      const post = await storage.getPostById(postId);
      
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      
      if (post.userId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const updatedPost = await storage.updatePost(postId, req.body);
      res.json(updatedPost);
    } catch (error) {
      next(error);
    }
  });
  
  app.delete("/api/posts/:id", requireInstagramAuth, async (req, res, next) => {
    try {
      const postId = parseInt(req.params.id);
      const post = await storage.getPostById(postId);
      
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      
      if (post.userId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      await storage.deletePost(postId);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });
  
  app.post("/api/posts/:id/publish", requireInstagramAuth, async (req, res, next) => {
    try {
      const postId = parseInt(req.params.id);
      const post = await storage.getPostById(postId);
      
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      
      if (post.userId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const publishedPost = await InstagramAPI.publishPost(postId);
      res.json(publishedPost);
    } catch (error) {
      next(error);
    }
  });
  
  // AI Content Generation
  app.post("/api/generate-content", requireInstagramAuth, async (req, res, next) => {
    try {
      const { contentType, brandVoice, keyMessage, visualStyle, prompt } = req.body;
      
      if (!contentType || !brandVoice || !keyMessage) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // Get the actual AI-generated content using our service
      const generatedContent = await aiService.generateContent(
        prompt || keyMessage,
        brandVoice,
        contentType,
        keyMessage
      );
      
      if (generatedContent.error) {
        return res.status(500).json({ message: generatedContent.error });
      }
      
      res.json({
        caption: generatedContent.caption,
        mediaUrl: generatedContent.mediaUrl, 
        contentType,
        status: "ai_generated",
        aiGenerated: true,
        metadata: {
          brandVoice,
          visualStyle,
          hashtags: generatedContent.hashtags || []
        }
      });
    } catch (error) {
      next(error);
    }
  });
  
  // AI Provider Selection
  app.post("/api/ai-provider", requireAuth, async (req, res, next) => {
    try {
      const { provider } = req.body;
      
      if (!provider || (provider !== 'openai' && provider !== 'gemini')) {
        return res.status(400).json({ message: "Invalid AI provider. Must be 'openai' or 'gemini'" });
      }
      
      // Set the provider
      const success = aiService.setProvider(provider);
      
      if (!success) {
        return res.status(400).json({ 
          message: `Failed to set AI provider to ${provider}. Provider may not be configured.` 
        });
      }
      
      // Update user preference
      await storage.updateUser(req.user!.id, { aiProvider: provider } as any);
      
      res.json({ success: true, provider });
    } catch (error) {
      next(error);
    }
  });
  
  // AI Engagement Generation
  app.post("/api/generate-response", requireInstagramAuth, async (req, res, next) => {
    try {
      const { comment, brandVoice } = req.body;
      
      if (!comment || !brandVoice) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // Generate the response using our AI service
      const response = await aiService.generateEngagementResponse(comment, brandVoice);
      
      if (response.error) {
        return res.status(500).json({ message: response.error });
      }
      
      res.json(response);
    } catch (error) {
      next(error);
    }
  });
  
  // AI Content Suggestions
  app.post("/api/generate-suggestions", requireInstagramAuth, async (req, res, next) => {
    try {
      const { context, contentType, count } = req.body;
      
      if (!context) {
        return res.status(400).json({ message: "Missing content context" });
      }
      
      // Generate the suggestions using our AI service
      const response = await aiService.generateSuggestions(
        context,
        contentType || "general",
        count || 3
      );
      
      if (response.error) {
        return res.status(500).json({ message: response.error });
      }
      
      res.json(response);
    } catch (error) {
      next(error);
    }
  });
  
  // New endpoint for AI suggestions that doesn't require Instagram auth
  app.post("/api/ai/suggestions", requireAuth, async (req, res, next) => {
    try {
      const { context, contentType, count } = req.body;
      
      if (!context) {
        return res.status(400).json({ message: "Missing content context" });
      }
      
      // Generate the suggestions using our AI service
      const response = await aiService.generateSuggestions(
        context,
        contentType || "general",
        count || 3
      );
      
      if (response.error) {
        return res.status(500).json({ message: response.error });
      }
      
      res.json(response);
    } catch (error) {
      next(error);
    }
  });
  
  // Engagement settings routes
  app.get("/api/engagement-settings", requireInstagramAuth, async (req, res, next) => {
    try {
      let settings = await storage.getEngagementSettings(req.user!.id);
      
      if (!settings) {
        // Create default settings if none exist
        settings = await storage.createEngagementSettings({
          userId: req.user!.id,
          autoComments: false,
          autoLikes: false,
          commentPositiveMentions: false,
          commentQuestions: false,
          commentNegativeFeedback: false,
          likeFollowerPosts: false,
          likeHashtags: false,
          likeBrandMentions: false,
          dailyCommentLimit: 25,
          dailyLikeLimit: 100,
          dailyFollowLimit: 30
        });
      }
      
      res.json(settings);
    } catch (error) {
      next(error);
    }
  });
  
  app.put("/api/engagement-settings", requireInstagramAuth, async (req, res, next) => {
    try {
      const validatedData = insertEngagementSettingsSchema.partial().parse(req.body);
      
      let settings = await storage.getEngagementSettings(req.user!.id);
      
      if (!settings) {
        // Create new settings
        settings = await storage.createEngagementSettings({
          ...validatedData,
          userId: req.user!.id
        });
      } else {
        // Update existing settings
        settings = await storage.updateEngagementSettings(req.user!.id, validatedData);
      }
      
      res.json(settings);
    } catch (error) {
      next(error);
    }
  });

  // Subscription plan routes
  app.get("/api/subscription-plans", async (req, res, next) => {
    try {
      const plans = await storage.getActiveSubscriptionPlans();
      res.json(plans);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/subscription/status", requireInstagramAuth, async (req, res, next) => {
    try {
      const status = await storage.checkUserSubscriptionStatus(req.user!.id);
      res.json(status);
    } catch (error) {
      next(error);
    }
  });

  // Create payment intent for subscription purchase
  app.post("/api/subscription/create-payment-intent", requireInstagramAuth, async (req, res, next) => {
    try {
      const { planId } = req.body;
      
      if (!planId) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      const plan = await storage.getSubscriptionPlan(parseInt(planId));
      
      if (!plan) {
        return res.status(404).json({ message: "Subscription plan not found" });
      }
      
      // Create a payment intent with Stripe
      const paymentIntent = await paymentService.createPaymentIntent(
        req.user!.id,
        plan.id,
        parseFloat(plan.price), // Convert from string to float
        "usd"
      );
      
      res.json({
        clientSecret: paymentIntent.clientSecret,
        planId: plan.id,
        amount: paymentIntent.amount
      });
    } catch (error: any) {
      console.error("Payment intent error:", error);
      res.status(500).json({ message: error.message });
    }
  });
  
  // Create subscription with Stripe
  app.post("/api/subscription/create", requireInstagramAuth, async (req, res, next) => {
    try {
      const { planId } = req.body;
      
      if (!planId) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      const plan = await storage.getSubscriptionPlan(parseInt(planId));
      
      if (!plan) {
        return res.status(404).json({ message: "Subscription plan not found" });
      }
      
      // Create a subscription with Stripe
      const subscription = await paymentService.createOrRetrieveSubscription(
        req.user!.id,
        plan.id,
        req.user!.email,
        req.user!.username
      );
      
      res.json({
        subscription,
        planId: plan.id,
        planName: plan.name
      });
    } catch (error: any) {
      console.error("Subscription creation error:", error);
      res.status(500).json({ message: error.message });
    }
  });
  
  // Cancel a subscription
  app.post("/api/subscription/cancel", requireInstagramAuth, async (req, res, next) => {
    try {
      const user = await storage.getUser(req.user!.id);
      
      if (!user?.stripeSubscriptionId) {
        return res.status(400).json({ message: "No active subscription found" });
      }
      
      // Cancel the subscription with Stripe
      const subscription = await paymentService.cancelSubscription(user.stripeSubscriptionId);
      
      // Update the user's subscription status in our database
      await storage.updateUser(req.user!.id, {
        subscriptionStatus: "canceled"
      } as any);
      
      res.json({
        success: true,
        subscription
      });
    } catch (error: any) {
      console.error("Subscription cancellation error:", error);
      res.status(500).json({ message: error.message });
    }
  });
  
  // Stripe webhook endpoint
  app.post("/api/webhooks/stripe", async (req, res, next) => {
    try {
      const result = await paymentService.handleWebhookEvent(req.body);
      
      if (result.success) {
        res.status(200).json({ received: true });
      } else {
        console.error("Webhook processing error:", result.message);
        res.status(400).json({ received: false, error: result.message });
      }
    } catch (error: any) {
      console.error("Webhook error:", error);
      res.status(500).json({ received: false, error: error.message });
    }
  });

  app.get("/api/payments", requireInstagramAuth, async (req, res, next) => {
    try {
      const payments = await storage.getPaymentsByUserId(req.user!.id);
      res.json(payments);
    } catch (error) {
      next(error);
    }
  });
  
  // Blog routes - publicly accessible without auth
  app.get("/api/blog", async (req, res, next) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const posts = await storage.getRecentBlogPosts(limit);
      res.json(posts);
    } catch (error) {
      next(error);
    }
  });
  
  // Make sure specific routes come before generic ones with params
  app.get("/api/blog/slug/:slug", async (req, res, next) => {
    try {
      const { slug } = req.params;
      const post = await storage.getBlogPostBySlug(slug);
      
      if (!post) {
        return res.status(404).json({ message: "Blog post not found" });
      }
      
      res.json(post);
    } catch (error) {
      next(error);
    }
  });
  
  // These admin routes require auth
  // Make sure the specific routes come before generic ones with params
  app.get("/api/blog/suggestions", requireAuth, async (req, res, next) => {
    try {
      // In a real application, we'd check if user has admin permissions here
      
      const count = req.query.count ? parseInt(req.query.count as string) : 5;
      const suggestions = await blogService.generateBlogTopics(count);
      
      if (!suggestions) {
        return res.status(500).json({ message: "Failed to generate blog topic suggestions" });
      }
      
      res.json({ suggestions });
    } catch (error) {
      next(error);
    }
  });
  

  
  app.post("/api/blog", requireAuth, async (req, res, next) => {
    try {
      // In a real application, we'd check if user has admin permissions here
      
      const blogPostContent = await blogService.generateBlogPost(req.body.topic);
      
      if (!blogPostContent) {
        return res.status(500).json({ message: "Failed to generate blog post" });
      }
      
      const post = await storage.createBlogPost(blogPostContent);
      res.status(201).json(post);
    } catch (error) {
      next(error);
    }
  });
  
  // Route to create a predefined blog post
  app.post("/api/blog/predefined", requireAuth, async (req, res, next) => {
    try {
      // In a real application, we'd check if user has admin permissions here
      
      const { title, slug, summary, content, tags, seoTitle, seoDescription, seoKeywords, authorName } = req.body;
      
      // Validate all required fields
      if (!title || !slug || !summary || !content || !seoTitle || !seoDescription) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      const blogPostContent = {
        title,
        slug,
        summary,
        content,
        tags: tags || [],
        seoTitle,
        seoDescription,
        seoKeywords: seoKeywords || [],
        authorName: authorName || "AI Content Team"
      };
      
      const success = await blogService.createPredefinedBlogPost(blogPostContent);
      
      if (!success) {
        return res.status(500).json({ message: "Failed to create blog post" });
      }
      
      res.status(201).json({
        success: true,
        message: "Blog post created successfully"
      });
    } catch (error) {
      next(error);
    }
  });
  
  // Route to trigger the blog generator manually
  app.post("/api/blog/generate", requireAuth, async (req, res, next) => {
    try {
      // In a real application, we'd check if user has admin permissions here
      
      // Import the BlogGenerator
      const { BlogGenerator } = await import("./blog-generator");
      
      // Get the number of posts to generate (default to 1)
      const count = req.body.count ? parseInt(req.body.count) : 1;
      
      // Generate the posts
      const successCount = await BlogGenerator.generateMultiplePosts(count);
      
      res.json({
        success: true,
        requested: count,
        generated: successCount,
        message: `Successfully generated ${successCount} of ${count} requested blog posts`
      });
    } catch (error) {
      next(error);
    }
  });
  
  // Generic parameter route should come last
  app.get("/api/blog/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const post = await storage.getBlogPostById(id);
      
      if (!post) {
        return res.status(404).json({ message: "Blog post not found" });
      }
      
      res.json(post);
    } catch (error) {
      next(error);
    }
  });
  
  app.put("/api/blog/:id", requireAuth, async (req, res, next) => {
    try {
      // In a real application, we'd check if user has admin permissions here
      
      const id = parseInt(req.params.id);
      const post = await storage.getBlogPostById(id);
      
      if (!post) {
        return res.status(404).json({ message: "Blog post not found" });
      }
      
      const updatedPost = await storage.updateBlogPost(id, req.body);
      res.json(updatedPost);
    } catch (error) {
      next(error);
    }
  });
  
  app.delete("/api/blog/:id", requireAuth, async (req, res, next) => {
    try {
      // In a real application, we'd check if user has admin permissions here
      
      const id = parseInt(req.params.id);
      const post = await storage.getBlogPostById(id);
      
      if (!post) {
        return res.status(404).json({ message: "Blog post not found" });
      }
      
      await storage.deleteBlogPost(id);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  // Hugging Face Dataset routes
  app.get("/api/huggingface/datasets/search", requireAuth, async (req, res, next) => {
    try {
      const query = req.query.query as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      
      if (!query) {
        return res.status(400).json({ message: "Search query is required" });
      }
      
      const datasets = await huggingFaceService.searchDatasets({
        query,
        limit
      });
      
      res.json(datasets);
    } catch (error: any) {
      console.error("HuggingFace dataset search error:", error);
      res.status(500).json({ message: error.message });
    }
  });
  
  // Important: Specific routes must come before parameterized routes
  app.get("/api/huggingface/datasets/easynegative", requireAuth, async (req, res, next) => {
    try {
      const datasetInfo = await huggingFaceService.getEasyNegativeDataset();
      res.json(datasetInfo);
    } catch (error: any) {
      console.error("HuggingFace EasyNegative dataset error:", error);
      res.status(500).json({ message: error.message });
    }
  });
  
  app.get("/api/huggingface/datasets/easynegative/samples", requireAuth, async (req, res, next) => {
    try {
      const count = req.query.count ? parseInt(req.query.count as string) : 10;
      const samples = await huggingFaceService.getEasyNegativeSamples(count);
      res.json(samples);
    } catch (error: any) {
      console.error("HuggingFace EasyNegative samples error:", error);
      res.status(500).json({ message: error.message });
    }
  });
  
  app.get("/api/huggingface/datasets/:datasetId/samples", requireAuth, async (req, res, next) => {
    try {
      const { datasetId } = req.params;
      const split = req.query.split as string || "train";
      const count = req.query.count ? parseInt(req.query.count as string) : 5;
      
      if (!datasetId) {
        return res.status(400).json({ message: "Dataset ID is required" });
      }
      
      const samples = await huggingFaceService.getDatasetSamples({
        datasetId,
        split,
        sampleCount: count
      });
      
      res.json(samples);
    } catch (error: any) {
      console.error("HuggingFace dataset samples error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // SEO Optimization Routes
  // Analyze SEO for a blog post
  app.get("/api/seo/analyze/:blogId", requireAuth, async (req, res, next) => {
    try {
      const blogId = parseInt(req.params.blogId);
      
      if (isNaN(blogId)) {
        return res.status(400).json({ message: "Valid blog post ID is required" });
      }
      
      const analysis = await seoService.analyzeBlogPost(blogId);
      res.json(analysis);
    } catch (error: any) {
      console.error("SEO analysis error:", error);
      res.status(500).json({ message: error.message });
    }
  });
  
  // Generate keyword suggestions
  app.post("/api/seo/keywords", requireAuth, async (req, res, next) => {
    try {
      const { topic, count } = req.body;
      
      if (!topic) {
        return res.status(400).json({ message: "Topic is required" });
      }
      
      const suggestions = await seoService.suggestKeywords(topic, count || 10);
      res.json(suggestions);
    } catch (error: any) {
      console.error("Keyword suggestion error:", error);
      res.status(500).json({ message: error.message });
    }
  });
  
  // Generate meta tag suggestions
  app.post("/api/seo/meta-tags", requireAuth, async (req, res, next) => {
    try {
      const { title, content } = req.body;
      
      if (!title || !content) {
        return res.status(400).json({ message: "Title and content are required" });
      }
      
      const metaTags = await seoService.suggestMetaTags(title, content);
      res.json(metaTags);
    } catch (error: any) {
      console.error("Meta tag suggestion error:", error);
      res.status(500).json({ message: error.message });
    }
  });
  
  // Optimize a blog post
  app.post("/api/seo/optimize/:blogId", requireAuth, async (req, res, next) => {
    try {
      const blogId = parseInt(req.params.blogId);
      
      if (isNaN(blogId)) {
        return res.status(400).json({ message: "Valid blog post ID is required" });
      }
      
      const optimizedPost = await seoService.optimizeBlogPost(blogId);
      res.json(optimizedPost);
    } catch (error: any) {
      console.error("SEO optimization error:", error);
      res.status(500).json({ message: error.message });
    }
  });
  
  // Generate sitemap
  app.get("/sitemap.xml", async (req, res, next) => {
    try {
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const sitemap = await seoService.generateSitemap(baseUrl);
      
      res.header('Content-Type', 'application/xml');
      res.send(sitemap);
    } catch (error: any) {
      console.error("Sitemap generation error:", error);
      next(error);
    }
  });
  
  // Generate robots.txt
  app.get("/robots.txt", async (req, res, next) => {
    try {
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const robotsTxt = seoService.generateRobotsTxt(baseUrl);
      
      res.header('Content-Type', 'text/plain');
      res.send(robotsTxt);
    } catch (error: any) {
      console.error("Robots.txt generation error:", error);
      next(error);
    }
  });
  
  // Generate structured data (JSON-LD) for a blog post
  app.get("/api/seo/structured-data/:blogId", async (req, res, next) => {
    try {
      const blogId = parseInt(req.params.blogId);
      
      if (isNaN(blogId)) {
        return res.status(400).json({ message: "Valid blog post ID is required" });
      }
      
      const post = await storage.getBlogPostById(blogId);
      
      if (!post) {
        return res.status(404).json({ message: "Blog post not found" });
      }
      
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const structuredData = seoService.generateStructuredData(post, post.authorName, baseUrl);
      
      res.json(JSON.parse(structuredData));
    } catch (error: any) {
      console.error("Structured data generation error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Enhanced blog creation with SEO optimization
  app.post("/api/blog", requireAuth, async (req, res, next) => {
    try {
      const validatedData = insertBlogPostSchema.parse(req.body);
      
      // Generate SEO metadata if not provided
      if (!validatedData.seoTitle || !validatedData.seoDescription || !validatedData.seoKeywords) {
        const metaTags = await seoService.suggestMetaTags(validatedData.title, validatedData.content);
        
        if (!validatedData.seoTitle) {
          validatedData.seoTitle = metaTags.title;
        }
        
        if (!validatedData.seoDescription) {
          validatedData.seoDescription = metaTags.description;
        }
        
        if (!validatedData.seoKeywords || !Array.isArray(validatedData.seoKeywords) || validatedData.seoKeywords.length === 0) {
          validatedData.seoKeywords = metaTags.keywords;
        }
      }
      
      // Create the blog post
      const blogPost = await storage.createBlogPost(validatedData);
      res.status(201).json(blogPost);
    } catch (error) {
      next(error);
    }
  });

  // Inspiration Gallery routes
  app.get("/api/inspiration", async (req, res, next) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const items = await storage.getAllInspirationItems(limit);
      res.json(items);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/inspiration/popular", async (req, res, next) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const items = await storage.getPopularInspirationItems(limit);
      res.json(items);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/inspiration/category/:category", async (req, res, next) => {
    try {
      const { category } = req.params;
      const items = await storage.getInspirationByCategory(category);
      res.json(items);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/inspiration/tags", async (req, res, next) => {
    try {
      const { tags } = req.body;
      if (!tags || !Array.isArray(tags) || tags.length === 0) {
        return res.status(400).json({ message: "Valid tags array required" });
      }
      const items = await storage.getInspirationByTags(tags);
      res.json(items);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/inspiration/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const item = await storage.getInspirationById(id);
      
      if (!item) {
        return res.status(404).json({ message: "Inspiration item not found" });
      }
      
      res.json(item);
    } catch (error) {
      next(error);
    }
  });

  // Admin routes for managing inspiration gallery - require authentication
  app.post("/api/inspiration", requireAuth, async (req, res, next) => {
    try {
      // In a real app, check admin permissions here
      const item = await storage.createInspirationItem({
        ...req.body,
        createdBy: req.user!.id
      });
      res.status(201).json(item);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/inspiration/:id", requireAuth, async (req, res, next) => {
    try {
      // In a real app, check admin permissions here
      const id = parseInt(req.params.id);
      const item = await storage.getInspirationById(id);
      
      if (!item) {
        return res.status(404).json({ message: "Inspiration item not found" });
      }
      
      const updatedItem = await storage.updateInspirationItem(id, req.body);
      res.json(updatedItem);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/inspiration/:id", requireAuth, async (req, res, next) => {
    try {
      // In a real app, check admin permissions here
      const id = parseInt(req.params.id);
      const item = await storage.getInspirationById(id);
      
      if (!item) {
        return res.status(404).json({ message: "Inspiration item not found" });
      }
      
      await storage.deleteInspirationItem(id);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  // Generate AI previews for inspiration gallery
  app.post("/api/inspiration/generate", requireAuth, async (req, res, next) => {
    try {
      const { prompt, style, category } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ message: "Prompt is required" });
      }
      
      // Generate an image or caption using AI
      const result = await huggingFaceService.generateImage({
        prompt,
        style: style || "realistic",
        width: 512,
        height: 512
      });
      
      if (result.error) {
        return res.status(500).json({ error: result.error });
      }
      
      // Create a new inspiration item with the generated content
      const item = await storage.createInspirationItem({
        title: prompt,
        description: `AI-generated preview based on "${prompt}"`,
        imageUrl: result.url,
        imagePrompt: prompt, // Add the prompt as the imagePrompt
        category: category || "ai-generated",
        tags: style ? [style] : [],
        createdBy: req.user!.id,
        aiGenerated: true,
        settings: { prompt, style },
        metadata: { generation: "huggingface" }
      });
      
      res.status(201).json(item);
    } catch (error: any) {
      console.error("AI generation error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
