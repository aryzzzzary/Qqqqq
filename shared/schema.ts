import { pgTable, text, serial, integer, boolean, timestamp, jsonb, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define subscription plans table first to avoid circular dependencies
export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  billingCycle: text("billing_cycle").notNull(), // monthly, yearly
  features: jsonb("features").notNull(), // Array of features included
  postLimit: integer("post_limit").notNull(),
  accountLimit: integer("account_limit").notNull(),
  aiContentGeneration: boolean("ai_content_generation").default(false),
  analyticsAccess: boolean("analytics_access").default(true),
  automatedEngagement: boolean("automated_engagement").default(false),
  priority: integer("priority").default(0), // For sorting plans
  active: boolean("active").default(true),
  stripePriceId: text("stripe_price_id"), // Price ID from Stripe for this plan
});

// Define users table 
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  fullName: text("full_name"),
  instagramUsername: text("instagram_username"),
  instagramBusinessId: text("instagram_business_id"),
  accessToken: text("access_token"),
  tokenExpiry: timestamp("token_expiry"),
  subscriptionPlanId: integer("subscription_plan_id").references(() => subscriptionPlans.id),
  subscriptionStatus: text("subscription_status").default("trial"), // trial, active, past_due, canceled
  trialEndsAt: timestamp("trial_ends_at"),
  subscriptionEndsAt: timestamp("subscription_ends_at"),
  stripeCustomerId: text("stripe_customer_id"), // Stripe customer ID
  stripeSubscriptionId: text("stripe_subscription_id"), // Stripe subscription ID
  aiProvider: text("ai_provider").default("openai"), // AI provider preference (openai, gemini)
  createdAt: timestamp("created_at").defaultNow(),
});

// Define posts table
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  contentType: text("content_type").notNull(), // image, video, carousel
  caption: text("caption").notNull(),
  mediaUrl: text("media_url"), // URL to the media file
  thumbnailUrl: text("thumbnail_url"), // URL for preview
  scheduledAt: timestamp("scheduled_at"),
  postedAt: timestamp("posted_at"),
  status: text("status").notNull(), // draft, ready, ai_generated, posted, failed
  instagramPostId: text("instagram_post_id"), // ID returned from Instagram API
  aiGenerated: boolean("ai_generated").default(false),
  metadata: jsonb("metadata"), // Additional data like hashtags, mentions, etc.
});

// Define engagement settings table
export const engagementSettings = pgTable("engagement_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  autoComments: boolean("auto_comments").default(false),
  autoLikes: boolean("auto_likes").default(false),
  commentPositiveMentions: boolean("comment_positive_mentions").default(false),
  commentQuestions: boolean("comment_questions").default(false),
  commentNegativeFeedback: boolean("comment_negative_feedback").default(false),
  likeFollowerPosts: boolean("like_follower_posts").default(false),
  likeHashtags: boolean("like_hashtags").default(false),
  likeBrandMentions: boolean("like_brand_mentions").default(false),
  dailyCommentLimit: integer("daily_comment_limit").default(25),
  dailyLikeLimit: integer("daily_like_limit").default(100),
  dailyFollowLimit: integer("daily_follow_limit").default(30),
});

// Define analytics data table
export const analyticsData = pgTable("analytics_data", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  date: timestamp("date").notNull(),
  followers: integer("followers"),
  engagement: integer("engagement"),
  postReach: integer("post_reach"),
  profileVisits: integer("profile_visits"),
  data: jsonb("data"), // Flexible data storage for various metrics
});

// Define payments table
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  subscriptionPlanId: integer("subscription_plan_id").references(() => subscriptionPlans.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default("USD"),
  status: text("status").notNull(), // succeeded, pending, failed
  paymentMethod: text("payment_method").notNull(), // credit_card, paypal, etc.
  paymentIntentId: text("payment_intent_id"), // ID from the payment processor
  invoiceUrl: text("invoice_url"),
  billingPeriodStart: timestamp("billing_period_start"),
  billingPeriodEnd: timestamp("billing_period_end"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Define achievements table for Gamified Onboarding & Engagement
export const achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(), // onboarding, engagement, referral, content
  points: integer("points").default(0),
  icon: text("icon"),
  requirements: jsonb("requirements").notNull(), // What user needs to do to earn this
  reward: jsonb("reward"), // What user gets for earning this
  active: boolean("active").default(true),
});

// Define referral table for the Referral & Incentivization Engine
export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerId: integer("referrer_id").notNull().references(() => users.id),
  referredUserId: integer("referred_user_id").references(() => users.id),
  referralCode: text("referral_code").notNull().unique(),
  email: text("email"),
  status: text("status").notNull(), // pending, registered, subscribed
  reward: jsonb("reward"), // Details about the reward given to referrer
  createdAt: timestamp("created_at").defaultNow(),
  convertedAt: timestamp("converted_at"),
});

// Define user achievements table to track user progress
export const userAchievements = pgTable("user_achievements", {
  id: serial("id").primaryKey(), 
  userId: integer("user_id").notNull().references(() => users.id),
  achievementId: integer("achievement_id").notNull().references(() => achievements.id),
  earnedAt: timestamp("earned_at").defaultNow(),
  progress: integer("progress").default(0), // For partial completion tracking
  completed: boolean("completed").default(false),
  rewardClaimed: boolean("reward_claimed").default(false),
});

// Define content trends table for AI-Powered Viral Content Generator
export const contentTrends = pgTable("content_trends", {
  id: serial("id").primaryKey(),
  trendType: text("trend_type").notNull(), // hashtag, content_theme, format
  name: text("name").notNull(),
  description: text("description"),
  popularity: decimal("popularity", { precision: 10, scale: 2 }),
  category: text("category"),
  startedAt: timestamp("started_at"),
  expiresAt: timestamp("expires_at"),
  data: jsonb("data"), // Additional data like associated hashtags, etc.
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Define content suggestions table to store AI-generated content ideas for users
export const contentSuggestions = pgTable("content_suggestions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  contentType: text("content_type").notNull(), // image, video, carousel, story
  caption: text("caption"),
  hashtags: jsonb("hashtags"), // Array of recommended hashtags
  mediaPrompt: text("media_prompt"), // Prompt for AI image generation
  trendId: integer("trend_id").references(() => contentTrends.id),
  used: boolean("used").default(false),
  engagementScore: decimal("engagement_score", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Define user onboarding progress table
export const userOnboarding = pgTable("user_onboarding", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id).unique(),
  profileCompleted: boolean("profile_completed").default(false),
  instagramConnected: boolean("instagram_connected").default(false),
  firstPostCreated: boolean("first_post_created").default(false),
  firstPostScheduled: boolean("first_post_scheduled").default(false),
  viewedAnalytics: boolean("viewed_analytics").default(false),
  invitedFriend: boolean("invited_friend").default(false),
  completedTutorial: boolean("completed_tutorial").default(false),
  currentStep: integer("current_step").default(1),
  progress: integer("progress").default(0), // 0-100%
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Define inspiration gallery table for visual content inspiration
export const inspirationGallery = pgTable("inspiration_gallery", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // e.g., product, lifestyle, quote, etc.
  tags: jsonb("tags").notNull(), // Array of tags for filtering
  imageUrl: text("image_url"), // URL to the AI-generated image
  imagePrompt: text("image_prompt").notNull(), // Prompt used to generate the image
  popularity: decimal("popularity", { precision: 10, scale: 2 }).default("0"),
  views: integer("views").default(0), // Count of how many times viewed
  likes: integer("likes").default(0), // Count of likes
  shares: integer("shares").default(0), // Count of shares
  active: boolean("active").default(true),
  aiGenerated: boolean("ai_generated").default(true),
  createdBy: integer("created_by").references(() => users.id), // Who created it
  settings: jsonb("settings").default({}), // Settings for AI generation
  metadata: jsonb("metadata"), // Additional data
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Define blog posts table
export const blogPosts = pgTable("blog_posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  summary: text("summary").notNull(),
  content: text("content").notNull(),
  publishedAt: timestamp("published_at"),
  tags: jsonb("tags").notNull(),
  seoTitle: text("seo_title").notNull(),
  seoDescription: text("seo_description").notNull(),
  seoKeywords: jsonb("seo_keywords").notNull(),
  featuredImage: text("featured_image"),
  authorName: text("author_name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({
  id: true,
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  fullName: true,
  instagramUsername: true,
  instagramBusinessId: true,
  accessToken: true,
  tokenExpiry: true,
  subscriptionPlanId: true,
  stripeCustomerId: true,
  stripeSubscriptionId: true,
  aiProvider: true,
}).partial({
  fullName: true,
  instagramUsername: true,
  instagramBusinessId: true,
  accessToken: true,
  tokenExpiry: true,
  subscriptionPlanId: true,
  stripeCustomerId: true,
  stripeSubscriptionId: true,
  aiProvider: true,
});

export const insertPostSchema = createInsertSchema(posts).omit({
  id: true,
  instagramPostId: true,
  postedAt: true,
});

export const insertEngagementSettingsSchema = createInsertSchema(engagementSettings).omit({
  id: true,
});

export const insertAnalyticsDataSchema = createInsertSchema(analyticsData).omit({
  id: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
});

// Create insert schemas for new tables
export const insertReferralSchema = createInsertSchema(referrals).omit({
  id: true,
  convertedAt: true,
  createdAt: true,
});

export const insertAchievementSchema = createInsertSchema(achievements).omit({
  id: true,
});

export const insertUserAchievementSchema = createInsertSchema(userAchievements).omit({
  id: true,
  earnedAt: true,
});

export const insertContentTrendSchema = createInsertSchema(contentTrends).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContentSuggestionSchema = createInsertSchema(contentSuggestions).omit({
  id: true,
  createdAt: true,
});

export const insertUserOnboardingSchema = createInsertSchema(userOnboarding).omit({
  id: true,
  startedAt: true,
  completedAt: true,
});

export const insertBlogPostSchema = createInsertSchema(blogPosts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInspirationGallerySchema = createInsertSchema(inspirationGallery).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  popularity: true,
  views: true,
  likes: true,
  shares: true,
});

// Types
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type EngagementSettings = typeof engagementSettings.$inferSelect;
export type InsertEngagementSettings = z.infer<typeof insertEngagementSettingsSchema>;
export type AnalyticsData = typeof analyticsData.$inferSelect;
export type InsertAnalyticsData = z.infer<typeof insertAnalyticsDataSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

// Types for new tables
export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type Achievement = typeof achievements.$inferSelect;
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;
export type UserAchievement = typeof userAchievements.$inferSelect;
export type InsertUserAchievement = z.infer<typeof insertUserAchievementSchema>;
export type ContentTrend = typeof contentTrends.$inferSelect;
export type InsertContentTrend = z.infer<typeof insertContentTrendSchema>;
export type ContentSuggestion = typeof contentSuggestions.$inferSelect;
export type InsertContentSuggestion = z.infer<typeof insertContentSuggestionSchema>;
export type UserOnboarding = typeof userOnboarding.$inferSelect;
export type InsertUserOnboarding = z.infer<typeof insertUserOnboardingSchema>;
export type BlogPost = typeof blogPosts.$inferSelect;
export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type InspirationGallery = typeof inspirationGallery.$inferSelect;
export type InsertInspirationGallery = z.infer<typeof insertInspirationGallerySchema>;

// Login type
export type LoginData = Pick<InsertUser, "username" | "password">;

// Instagram Graph API types
export interface InstagramApiStatus {
  connected: boolean;
  businessAccount: string;
  rateLimit: {
    used: number;
    total: number;
    resetsIn: string;
  };
  contentQuota: {
    used: number;
    total: number;
    period: string;
  };
  lastSync: string;
}

export interface InstagramAnalytics {
  followers: {
    count: number;
    change: number;
  };
  engagement: {
    rate: number;
    change: number;
  };
  postReach: {
    count: number;
    change: number;
  };
  profileVisits: {
    count: number;
    change: number;
  };
  periodStart: string;
  periodEnd: string;
}

export interface InstagramMediaType {
  id: string;
  caption: string;
  mediaType: string;
  mediaUrl: string;
  thumbnailUrl?: string;
  timestamp: string;
  children?: {
    data: Array<{
      id: string;
      mediaType: string;
      mediaUrl: string;
    }>;
  };
}