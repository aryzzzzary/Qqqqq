import { 
  users, posts, engagementSettings, analyticsData, 
  subscriptionPlans, payments, referrals, achievements,
  userAchievements, contentTrends, contentSuggestions,
  userOnboarding, blogPosts, inspirationGallery
} from "@shared/schema";
import { 
  User, InsertUser, Post, InsertPost, EngagementSettings, 
  InsertEngagementSettings, AnalyticsData, InsertAnalyticsData,
  SubscriptionPlan, InsertSubscriptionPlan, Payment, InsertPayment,
  BlogPost, InsertBlogPost, Referral, InsertReferral,
  Achievement, InsertAchievement, UserAchievement, InsertUserAchievement,
  ContentTrend, InsertContentTrend, ContentSuggestion, InsertContentSuggestion,
  UserOnboarding, InsertUserOnboarding, InspirationGallery, InsertInspirationGallery
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// modify the interface with any CRUD methods
// you might need
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined>;
  
  // Post methods
  createPost(post: InsertPost): Promise<Post>;
  getPostById(id: number): Promise<Post | undefined>;
  getPostsByUserId(userId: number): Promise<Post[]>;
  getScheduledPosts(userId: number): Promise<Post[]>;
  updatePost(id: number, data: Partial<InsertPost>): Promise<Post | undefined>;
  deletePost(id: number): Promise<boolean>;
  
  // Engagement settings methods
  getEngagementSettings(userId: number): Promise<EngagementSettings | undefined>;
  createEngagementSettings(settings: InsertEngagementSettings): Promise<EngagementSettings>;
  updateEngagementSettings(userId: number, data: Partial<InsertEngagementSettings>): Promise<EngagementSettings | undefined>;
  
  // Analytics methods
  getAnalyticsData(userId: number, startDate: Date, endDate: Date): Promise<AnalyticsData[]>;
  createAnalyticsData(data: InsertAnalyticsData): Promise<AnalyticsData>;
  
  // Subscription plan methods
  createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan>;
  getSubscriptionPlan(id: number): Promise<SubscriptionPlan | undefined>;
  getAllSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  getActiveSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  updateSubscriptionPlan(id: number, data: Partial<InsertSubscriptionPlan>): Promise<SubscriptionPlan | undefined>;
  
  // Payment methods
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPaymentsByUserId(userId: number): Promise<Payment[]>;
  getPaymentById(id: number): Promise<Payment | undefined>;
  updatePayment(id: number, data: Partial<InsertPayment>): Promise<Payment | undefined>;
  
  // Subscription management
  updateUserSubscription(userId: number, planId: number, status: string, endDate: Date): Promise<User | undefined>;
  checkUserSubscriptionStatus(userId: number): Promise<{
    isActive: boolean;
    plan?: SubscriptionPlan;
    daysRemaining: number;
  }>;
  getUsersWithExpiringSubscriptions(daysThreshold: number): Promise<User[]>;
  
  // Blog post methods
  createBlogPost(blogPost: InsertBlogPost): Promise<BlogPost>;
  getBlogPostById(id: number): Promise<BlogPost | undefined>;
  getBlogPostBySlug(slug: string): Promise<BlogPost | undefined>;  
  getAllBlogPosts(): Promise<BlogPost[]>;
  getRecentBlogPosts(limit?: number): Promise<BlogPost[]>;
  updateBlogPost(id: number, data: Partial<InsertBlogPost>): Promise<BlogPost | undefined>;
  deleteBlogPost(id: number): Promise<boolean>;
  
  // Referral methods (Referral & Incentivization Engine)
  createReferral(referral: InsertReferral): Promise<Referral>;
  getReferralsByReferrerId(referrerId: number): Promise<Referral[]>;
  getReferralByCode(referralCode: string): Promise<Referral | undefined>;
  updateReferral(id: number, data: Partial<InsertReferral>): Promise<Referral | undefined>;
  getSuccessfulReferrals(referrerId: number): Promise<Referral[]>;
  getReferralPerformance(referrerId: number): Promise<{
    totalReferrals: number;
    pendingReferrals: number;
    completedReferrals: number;
    conversionRate: number;
  }>;
  
  // Achievement methods (Gamified Onboarding & Engagement)
  createAchievement(achievement: InsertAchievement): Promise<Achievement>;
  getAchievementById(id: number): Promise<Achievement | undefined>;
  getAllAchievements(): Promise<Achievement[]>;
  getActiveAchievements(): Promise<Achievement[]>;
  getAchievementsByType(type: string): Promise<Achievement[]>;
  updateAchievement(id: number, data: Partial<InsertAchievement>): Promise<Achievement | undefined>;
  
  // User Achievement methods
  createUserAchievement(userAchievement: InsertUserAchievement): Promise<UserAchievement>;
  getUserAchievements(userId: number): Promise<UserAchievement[]>;
  getUserAchievementProgress(userId: number, achievementId: number): Promise<UserAchievement | undefined>;
  updateUserAchievement(userId: number, achievementId: number, data: Partial<InsertUserAchievement>): Promise<UserAchievement | undefined>;
  completeUserAchievement(userId: number, achievementId: number): Promise<UserAchievement | undefined>;
  getUserPoints(userId: number): Promise<number>;
  
  // Content Trends methods (AI-Powered Viral Content Generator)
  createContentTrend(trend: InsertContentTrend): Promise<ContentTrend>;
  getContentTrendById(id: number): Promise<ContentTrend | undefined>;
  getActiveContentTrends(): Promise<ContentTrend[]>;
  getTrendsByCategory(category: string): Promise<ContentTrend[]>;
  updateContentTrend(id: number, data: Partial<InsertContentTrend>): Promise<ContentTrend | undefined>;
  
  // Content Suggestion methods
  createContentSuggestion(suggestion: InsertContentSuggestion): Promise<ContentSuggestion>;
  getContentSuggestionById(id: number): Promise<ContentSuggestion | undefined>;
  getUserContentSuggestions(userId: number): Promise<ContentSuggestion[]>;
  getUnusedContentSuggestions(userId: number): Promise<ContentSuggestion[]>;
  updateContentSuggestion(id: number, data: Partial<InsertContentSuggestion>): Promise<ContentSuggestion | undefined>;
  markContentSuggestionAsUsed(id: number): Promise<ContentSuggestion | undefined>;
  
  // User Onboarding methods
  createUserOnboarding(onboarding: InsertUserOnboarding): Promise<UserOnboarding>;
  getUserOnboarding(userId: number): Promise<UserOnboarding | undefined>;
  updateUserOnboarding(userId: number, data: Partial<InsertUserOnboarding>): Promise<UserOnboarding | undefined>;
  completeOnboardingStep(userId: number, step: string): Promise<UserOnboarding | undefined>;
  getOnboardingProgress(userId: number): Promise<number>;
  
  // Inspiration Gallery methods
  createInspirationItem(item: InsertInspirationGallery): Promise<InspirationGallery>;
  getInspirationById(id: number): Promise<InspirationGallery | undefined>;
  getAllInspirationItems(limit?: number): Promise<InspirationGallery[]>;
  getInspirationByCategory(category: string): Promise<InspirationGallery[]>;
  getInspirationByTags(tags: string[]): Promise<InspirationGallery[]>;
  getPopularInspirationItems(limit?: number): Promise<InspirationGallery[]>;
  updateInspirationItem(id: number, data: Partial<InsertInspirationGallery>): Promise<InspirationGallery | undefined>;
  deleteInspirationItem(id: number): Promise<boolean>;
  recordInspirationItemView(id: number): Promise<void>;
  recordInspirationItemLike(id: number): Promise<void>;
  recordInspirationItemShare(id: number): Promise<void>;
  
  // Session store
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private posts: Map<number, Post>;
  private engagementSettings: Map<number, EngagementSettings>;
  private analyticsData: Map<number, AnalyticsData>;
  private subscriptionPlans: Map<number, SubscriptionPlan>;
  private payments: Map<number, Payment>;
  private blogPosts: Map<number, BlogPost>;
  
  // Maps for new growth marketing features
  private referrals: Map<number, Referral>;
  private achievements: Map<number, Achievement>;
  private userAchievements: Map<string, UserAchievement>; // Composite key: userId-achievementId
  private contentTrends: Map<number, ContentTrend>;
  private contentSuggestions: Map<number, ContentSuggestion>;
  private userOnboardings: Map<number, UserOnboarding>; // userId as key
  private inspirationGalleryItems: Map<number, InspirationGallery>; // For the inspiration gallery
  
  currentId: number;
  currentPostId: number;
  currentEngagementId: number;
  currentAnalyticsId: number;
  currentSubscriptionPlanId: number;
  currentPaymentId: number;
  currentBlogPostId: number;
  currentReferralId: number;
  currentAchievementId: number;
  currentContentTrendId: number;
  currentContentSuggestionId: number;
  currentUserOnboardingId: number;
  currentInspirationGalleryId: number;
  sessionStore: session.Store;

  constructor() {
    // Initialize base maps
    this.users = new Map();
    this.posts = new Map();
    this.engagementSettings = new Map();
    this.analyticsData = new Map();
    this.subscriptionPlans = new Map();
    this.payments = new Map();
    this.blogPosts = new Map();
    
    // Initialize growth marketing feature maps
    this.referrals = new Map();
    this.achievements = new Map();
    this.userAchievements = new Map();
    this.contentTrends = new Map();
    this.contentSuggestions = new Map();
    this.userOnboardings = new Map();
    this.inspirationGalleryItems = new Map();
    
    // Initialize counters for base tables
    this.currentId = 1;
    this.currentPostId = 1;
    this.currentEngagementId = 1;
    this.currentAnalyticsId = 1;
    this.currentSubscriptionPlanId = 1;
    this.currentPaymentId = 1;
    this.currentBlogPostId = 1;
    
    // Initialize counters for growth marketing features
    this.currentReferralId = 1;
    this.currentAchievementId = 1;
    this.currentContentTrendId = 1;
    this.currentContentSuggestionId = 1;
    this.currentUserOnboardingId = 1;
    this.currentInspirationGalleryId = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
    
    // Create default data
    this.initializeSubscriptionPlans();
    this.initializeAchievements();
  }
  
  // Initialize default achievements
  private async initializeAchievements() {
    // Onboarding Achievements
    await this.createAchievement({
      name: "Welcome Aboard!",
      description: "Complete your profile setup",
      type: "onboarding",
      points: 10,
      icon: "user-check",
      requirements: { completeProfile: true },
      reward: { type: "feature_unlock", feature: "basic_analytics" },
      active: true
    });
    
    await this.createAchievement({
      name: "Instagram Pro",
      description: "Connect your Instagram account",
      type: "onboarding",
      points: 20,
      icon: "instagram",
      requirements: { connectInstagram: true },
      reward: { type: "feature_unlock", feature: "post_scheduling" },
      active: true
    });
    
    await this.createAchievement({
      name: "Content Creator",
      description: "Create your first post",
      type: "onboarding",
      points: 15,
      icon: "file-plus",
      requirements: { createPost: true },
      reward: { type: "template_unlock", templateId: "viral_post_template" },
      active: true
    });
    
    // Engagement Achievements
    await this.createAchievement({
      name: "Scheduler Master",
      description: "Schedule 5 posts",
      type: "engagement",
      points: 25,
      icon: "calendar",
      requirements: { scheduledPosts: 5 },
      reward: { type: "discount", amount: 10, duration: "1-month" },
      active: true
    });
    
    // Referral Achievements
    await this.createAchievement({
      name: "Social Influencer",
      description: "Refer 3 friends who sign up",
      type: "referral",
      points: 50,
      icon: "users",
      requirements: { referrals: 3 },
      reward: { type: "subscription_extension", days: 7 },
      active: true
    });
    
    // Content Achievements
    await this.createAchievement({
      name: "Viral Creator",
      description: "Get 1000+ likes on a post",
      type: "content",
      points: 100,
      icon: "trending-up",
      requirements: { postLikes: 1000 },
      reward: { type: "feature_unlock", feature: "advanced_analytics" },
      active: true
    });
  }
  
  // Initialize default subscription plans
  private async initializeSubscriptionPlans() {
    // Free Plan
    this.createSubscriptionPlan({
      name: "Free",
      price: "0",
      billingCycle: "monthly",
      features: ["1 Instagram account", "Basic scheduling", "Limited analytics"],
      postLimit: 10,
      accountLimit: 1,
      aiContentGeneration: false,
      analyticsAccess: true,
      automatedEngagement: false,
      priority: 0,
      active: true
    });
    
    // Pro Plan
    this.createSubscriptionPlan({
      name: "Pro",
      price: "19.99",
      billingCycle: "monthly",
      features: [
        "3 Instagram accounts", 
        "Advanced scheduling", 
        "Full analytics", 
        "Basic AI content generation"
      ],
      postLimit: 100,
      accountLimit: 3,
      aiContentGeneration: true,
      analyticsAccess: true,
      automatedEngagement: false,
      priority: 1,
      active: true
    });
    
    // Business Plan
    this.createSubscriptionPlan({
      name: "Business",
      price: "49.99",
      billingCycle: "monthly",
      features: [
        "10 Instagram accounts", 
        "Advanced scheduling", 
        "Full analytics", 
        "Advanced AI content generation",
        "Automated engagement",
        "Priority support"
      ],
      postLimit: 500,
      accountLimit: 10,
      aiContentGeneration: true,
      analyticsAccess: true,
      automatedEngagement: true,
      priority: 2,
      active: true
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = {
      ...insertUser,
      id,
      fullName: insertUser.fullName || null,
      instagramUsername: insertUser.instagramUsername || null,
      instagramBusinessId: insertUser.instagramBusinessId || null,
      accessToken: insertUser.accessToken || null,
      tokenExpiry: insertUser.tokenExpiry || null,
      subscriptionPlanId: insertUser.subscriptionPlanId || null,
      stripeCustomerId: insertUser.stripeCustomerId || null,
      stripeSubscriptionId: insertUser.stripeSubscriptionId || null,
      aiProvider: insertUser.aiProvider || "openai",
      subscriptionStatus: "trial",
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days trial
      subscriptionEndsAt: null,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...data };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  // Post methods
  async createPost(insertPost: InsertPost): Promise<Post> {
    const id = this.currentPostId++;
    const post: Post = {
      ...insertPost,
      id,
      mediaUrl: insertPost.mediaUrl || null,
      thumbnailUrl: insertPost.thumbnailUrl || null,
      scheduledAt: insertPost.scheduledAt || null,
      postedAt: null,
      instagramPostId: null,
      aiGenerated: insertPost.aiGenerated || false,
      metadata: insertPost.metadata || {}
    };
    this.posts.set(id, post);
    return post;
  }
  
  async getPostById(id: number): Promise<Post | undefined> {
    return this.posts.get(id);
  }
  
  async getPostsByUserId(userId: number): Promise<Post[]> {
    return Array.from(this.posts.values()).filter(post => post.userId === userId);
  }
  
  async getScheduledPosts(userId: number): Promise<Post[]> {
    return Array.from(this.posts.values())
      .filter(post => post.userId === userId && post.scheduledAt !== null && post.postedAt === null)
      .sort((a, b) => {
        if (!a.scheduledAt || !b.scheduledAt) return 0;
        return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
      });
  }
  
  async updatePost(id: number, data: Partial<InsertPost>): Promise<Post | undefined> {
    const post = await this.getPostById(id);
    if (!post) return undefined;
    
    const updatedPost = { ...post, ...data };
    this.posts.set(id, updatedPost);
    return updatedPost;
  }
  
  async deletePost(id: number): Promise<boolean> {
    return this.posts.delete(id);
  }
  
  // Engagement settings methods
  async getEngagementSettings(userId: number): Promise<EngagementSettings | undefined> {
    return Array.from(this.engagementSettings.values()).find(
      (settings) => settings.userId === userId,
    );
  }
  
  async createEngagementSettings(insertSettings: InsertEngagementSettings): Promise<EngagementSettings> {
    const id = this.currentEngagementId++;
    const settings: EngagementSettings = { 
      ...insertSettings, 
      id,
      autoComments: insertSettings.autoComments ?? false,
      autoLikes: insertSettings.autoLikes ?? false,
      commentPositiveMentions: insertSettings.commentPositiveMentions ?? false,
      commentQuestions: insertSettings.commentQuestions ?? false,
      commentNegativeFeedback: insertSettings.commentNegativeFeedback ?? false,
      likeFollowerPosts: insertSettings.likeFollowerPosts ?? false,
      likeHashtags: insertSettings.likeHashtags ?? false,
      likeBrandMentions: insertSettings.likeBrandMentions ?? false,
      dailyCommentLimit: insertSettings.dailyCommentLimit ?? 25,
      dailyLikeLimit: insertSettings.dailyLikeLimit ?? 100,
      dailyFollowLimit: insertSettings.dailyFollowLimit ?? 30
    };
    this.engagementSettings.set(id, settings);
    return settings;
  }
  
  async updateEngagementSettings(userId: number, data: Partial<InsertEngagementSettings>): Promise<EngagementSettings | undefined> {
    const settings = await this.getEngagementSettings(userId);
    if (!settings) return undefined;
    
    const updatedSettings = { ...settings, ...data };
    this.engagementSettings.set(settings.id, updatedSettings);
    return updatedSettings;
  }
  
  // Analytics methods
  async getAnalyticsData(userId: number, startDate: Date, endDate: Date): Promise<AnalyticsData[]> {
    return Array.from(this.analyticsData.values())
      .filter(data => 
        data.userId === userId && 
        new Date(data.date) >= startDate && 
        new Date(data.date) <= endDate
      )
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }
  
  async createAnalyticsData(insertData: InsertAnalyticsData): Promise<AnalyticsData> {
    const id = this.currentAnalyticsId++;
    const data: AnalyticsData = { 
      ...insertData, 
      id,
      data: insertData.data || {},
      followers: insertData.followers || null,
      engagement: insertData.engagement || null,
      postReach: insertData.postReach || null,
      profileVisits: insertData.profileVisits || null
    };
    this.analyticsData.set(id, data);
    return data;
  }
  
  // User by email
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }
  
  // Subscription plan methods
  async createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan> {
    const id = this.currentSubscriptionPlanId++;
    const subscriptionPlan: SubscriptionPlan = {
      ...plan,
      id,
      aiContentGeneration: plan.aiContentGeneration ?? false,
      analyticsAccess: plan.analyticsAccess ?? true,
      automatedEngagement: plan.automatedEngagement ?? false,
      priority: plan.priority ?? 0,
      active: plan.active ?? true,
      stripePriceId: plan.stripePriceId || null
    };
    this.subscriptionPlans.set(id, subscriptionPlan);
    return subscriptionPlan;
  }
  
  async getSubscriptionPlan(id: number): Promise<SubscriptionPlan | undefined> {
    return this.subscriptionPlans.get(id);
  }
  
  async getAllSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return Array.from(this.subscriptionPlans.values())
      .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
  }
  
  async getActiveSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return Array.from(this.subscriptionPlans.values())
      .filter(plan => plan.active)
      .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
  }
  
  async updateSubscriptionPlan(id: number, data: Partial<InsertSubscriptionPlan>): Promise<SubscriptionPlan | undefined> {
    const plan = await this.getSubscriptionPlan(id);
    if (!plan) return undefined;
    
    const updatedPlan = { ...plan, ...data };
    this.subscriptionPlans.set(id, updatedPlan);
    return updatedPlan;
  }
  
  // Payment methods
  async createPayment(payment: InsertPayment): Promise<Payment> {
    const id = this.currentPaymentId++;
    const newPayment: Payment = { 
      ...payment, 
      id, 
      createdAt: new Date(),
      subscriptionPlanId: payment.subscriptionPlanId || null,
      currency: payment.currency || 'USD',
      paymentIntentId: payment.paymentIntentId || null,
      invoiceUrl: payment.invoiceUrl || null,
      billingPeriodStart: payment.billingPeriodStart || null,
      billingPeriodEnd: payment.billingPeriodEnd || null
    };
    this.payments.set(id, newPayment);
    return newPayment;
  }
  
  async getPaymentsByUserId(userId: number): Promise<Payment[]> {
    return Array.from(this.payments.values())
      .filter(payment => payment.userId === userId)
      .sort((a, b) => {
        const aDate = a.createdAt ? new Date(a.createdAt) : new Date();
        const bDate = b.createdAt ? new Date(b.createdAt) : new Date();
        return bDate.getTime() - aDate.getTime();
      });
  }
  
  async getPaymentById(id: number): Promise<Payment | undefined> {
    return this.payments.get(id);
  }
  
  async updatePayment(id: number, data: Partial<InsertPayment>): Promise<Payment | undefined> {
    const payment = await this.getPaymentById(id);
    if (!payment) return undefined;
    
    const updatedPayment = { ...payment, ...data };
    this.payments.set(id, updatedPayment);
    return updatedPayment;
  }
  
  // Subscription management
  async updateUserSubscription(userId: number, planId: number, status: string, endDate: Date): Promise<User | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;
    
    const updatedUser = { 
      ...user, 
      subscriptionPlanId: planId,
      subscriptionStatus: status,
      subscriptionEndsAt: endDate,
    };
    
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
  
  async checkUserSubscriptionStatus(userId: number): Promise<{
    isActive: boolean;
    plan?: SubscriptionPlan;
    daysRemaining: number;
  }> {
    const user = await this.getUser(userId);
    if (!user) return { isActive: false, daysRemaining: 0 };
    
    // Free accounts are always active
    if (!user.subscriptionPlanId) {
      const freePlan = Array.from(this.subscriptionPlans.values())
        .find(plan => plan.name.toLowerCase() === "free");
        
      return { 
        isActive: true, 
        plan: freePlan, 
        daysRemaining: 365 // Just a large number for "unlimited"
      };
    }
    
    const plan = await this.getSubscriptionPlan(user.subscriptionPlanId);
    
    // Check if subscription is active
    const isActive = user.subscriptionStatus === "active" || user.subscriptionStatus === "trial";
    
    // Calculate days remaining
    const now = new Date();
    const endDate = user.subscriptionEndsAt ? new Date(user.subscriptionEndsAt) : new Date();
    const diffTime = Math.abs(endDate.getTime() - now.getTime());
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return {
      isActive,
      plan,
      daysRemaining: isActive ? daysRemaining : 0
    };
  }
  
  async getUsersWithExpiringSubscriptions(daysThreshold: number): Promise<User[]> {
    const now = new Date();
    const thresholdDate = new Date();
    thresholdDate.setDate(now.getDate() + daysThreshold);
    
    return Array.from(this.users.values()).filter(user => {
      if (!user.subscriptionEndsAt) return false;
      
      const endDate = new Date(user.subscriptionEndsAt);
      return (
        user.subscriptionStatus === "active" && 
        endDate <= thresholdDate &&
        endDate >= now
      );
    });
  }
  
  // Blog post methods
  async createBlogPost(blogPost: InsertBlogPost): Promise<BlogPost> {
    const id = this.currentBlogPostId++;
    const now = new Date();
    
    const post: BlogPost = {
      ...blogPost,
      id,
      publishedAt: blogPost.publishedAt || now.toISOString(),
      featuredImage: blogPost.featuredImage || null
    };
    
    this.blogPosts.set(id, post);
    return post;
  }
  
  async getBlogPostById(id: number): Promise<BlogPost | undefined> {
    return this.blogPosts.get(id);
  }
  
  async getBlogPostBySlug(slug: string): Promise<BlogPost | undefined> {
    return Array.from(this.blogPosts.values()).find(
      (post) => post.slug === slug
    );
  }
  
  async getAllBlogPosts(): Promise<BlogPost[]> {
    return Array.from(this.blogPosts.values())
      .sort((a, b) => {
        const dateA = new Date(a.publishedAt);
        const dateB = new Date(b.publishedAt);
        return dateB.getTime() - dateA.getTime(); // Sort by date, newest first
      });
  }
  
  async getRecentBlogPosts(limit: number = 10): Promise<BlogPost[]> {
    return (await this.getAllBlogPosts()).slice(0, limit);
  }
  
  async updateBlogPost(id: number, data: Partial<InsertBlogPost>): Promise<BlogPost | undefined> {
    const post = await this.getBlogPostById(id);
    if (!post) return undefined;
    
    const updatedPost = { ...post, ...data };
    this.blogPosts.set(id, updatedPost);
    return updatedPost;
  }
  
  async deleteBlogPost(id: number): Promise<boolean> {
    return this.blogPosts.delete(id);
  }
  
  // Referral methods (Referral & Incentivization Engine)
  async createReferral(referral: InsertReferral): Promise<Referral> {
    const id = this.currentReferralId++;
    const newReferral: Referral = {
      ...referral,
      id,
      referredUserId: referral.referredUserId || null,
      createdAt: new Date(),
      convertedAt: null,
      reward: referral.reward || null
    };
    this.referrals.set(id, newReferral);
    return newReferral;
  }
  
  async getReferralsByReferrerId(referrerId: number): Promise<Referral[]> {
    return Array.from(this.referrals.values())
      .filter(referral => referral.referrerId === referrerId)
      .sort((a, b) => {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime(); // Most recent first
      });
  }
  
  async getReferralByCode(referralCode: string): Promise<Referral | undefined> {
    return Array.from(this.referrals.values())
      .find(referral => referral.referralCode === referralCode);
  }
  
  async updateReferral(id: number, data: Partial<InsertReferral>): Promise<Referral | undefined> {
    const referral = this.referrals.get(id);
    if (!referral) return undefined;
    
    const updatedReferral = { ...referral, ...data };
    this.referrals.set(id, updatedReferral);
    return updatedReferral;
  }
  
  async getSuccessfulReferrals(referrerId: number): Promise<Referral[]> {
    return Array.from(this.referrals.values())
      .filter(referral => 
        referral.referrerId === referrerId && 
        referral.status === "subscribed" &&
        referral.referredUserId !== null
      );
  }
  
  async getReferralPerformance(referrerId: number): Promise<{
    totalReferrals: number;
    pendingReferrals: number;
    completedReferrals: number;
    conversionRate: number;
  }> {
    const allReferrals = await this.getReferralsByReferrerId(referrerId);
    const pendingReferrals = allReferrals.filter(ref => ref.status === "pending").length;
    const registeredReferrals = allReferrals.filter(ref => ref.status === "registered").length;
    const subscribedReferrals = allReferrals.filter(ref => ref.status === "subscribed").length;
    
    const totalReferrals = allReferrals.length;
    const completedReferrals = subscribedReferrals;
    const conversionRate = totalReferrals > 0 
      ? (completedReferrals / totalReferrals) * 100 
      : 0;
    
    return {
      totalReferrals,
      pendingReferrals,
      completedReferrals,
      conversionRate
    };
  }
  
  // Achievement methods (Gamified Onboarding & Engagement)
  async createAchievement(achievement: InsertAchievement): Promise<Achievement> {
    const id = this.currentAchievementId++;
    const newAchievement: Achievement = {
      ...achievement,
      id,
      points: achievement.points || 0,
      icon: achievement.icon || null,
      active: achievement.active ?? true
    };
    this.achievements.set(id, newAchievement);
    return newAchievement;
  }
  
  async getAchievementById(id: number): Promise<Achievement | undefined> {
    return this.achievements.get(id);
  }
  
  async getAllAchievements(): Promise<Achievement[]> {
    return Array.from(this.achievements.values());
  }
  
  async getActiveAchievements(): Promise<Achievement[]> {
    return Array.from(this.achievements.values())
      .filter(achievement => achievement.active);
  }
  
  async getAchievementsByType(type: string): Promise<Achievement[]> {
    return Array.from(this.achievements.values())
      .filter(achievement => achievement.type === type && achievement.active);
  }
  
  async updateAchievement(id: number, data: Partial<InsertAchievement>): Promise<Achievement | undefined> {
    const achievement = this.achievements.get(id);
    if (!achievement) return undefined;
    
    const updatedAchievement = { ...achievement, ...data };
    this.achievements.set(id, updatedAchievement);
    return updatedAchievement;
  }
  
  // User Achievement methods
  async createUserAchievement(userAchievement: InsertUserAchievement): Promise<UserAchievement> {
    const key = `${userAchievement.userId}-${userAchievement.achievementId}`;
    const newUserAchievement: UserAchievement = {
      ...userAchievement,
      id: this.currentId++,
      earnedAt: new Date(),
      progress: userAchievement.progress || 0,
      completed: userAchievement.completed || false,
      rewardClaimed: userAchievement.rewardClaimed || false
    };
    this.userAchievements.set(key, newUserAchievement);
    return newUserAchievement;
  }
  
  async getUserAchievements(userId: number): Promise<UserAchievement[]> {
    return Array.from(this.userAchievements.values())
      .filter(ua => ua.userId === userId);
  }
  
  async getUserAchievementProgress(userId: number, achievementId: number): Promise<UserAchievement | undefined> {
    const key = `${userId}-${achievementId}`;
    return this.userAchievements.get(key);
  }
  
  async updateUserAchievement(userId: number, achievementId: number, data: Partial<InsertUserAchievement>): Promise<UserAchievement | undefined> {
    const key = `${userId}-${achievementId}`;
    const userAchievement = this.userAchievements.get(key);
    if (!userAchievement) return undefined;
    
    const updatedUserAchievement = { ...userAchievement, ...data };
    this.userAchievements.set(key, updatedUserAchievement);
    return updatedUserAchievement;
  }
  
  async completeUserAchievement(userId: number, achievementId: number): Promise<UserAchievement | undefined> {
    const key = `${userId}-${achievementId}`;
    const userAchievement = this.userAchievements.get(key);
    if (!userAchievement) {
      // Create a new completed achievement
      const achievement = await this.getAchievementById(achievementId);
      if (!achievement) return undefined;
      
      return this.createUserAchievement({
        userId,
        achievementId,
        progress: 100,
        completed: true
      });
    }
    
    // Update existing achievement to completed
    const updatedUserAchievement = { 
      ...userAchievement, 
      progress: 100,
      completed: true,
      earnedAt: new Date()
    };
    this.userAchievements.set(key, updatedUserAchievement);
    return updatedUserAchievement;
  }
  
  async getUserPoints(userId: number): Promise<number> {
    const userAchievements = await this.getUserAchievements(userId);
    
    // Only count completed achievements
    const completedAchievements = userAchievements.filter(ua => ua.completed);
    
    // Sum up points from all completed achievements
    let totalPoints = 0;
    for (const ua of completedAchievements) {
      const achievement = await this.getAchievementById(ua.achievementId);
      if (achievement) {
        totalPoints += achievement.points;
      }
    }
    
    return totalPoints;
  }
  
  // Content Trends methods (AI-Powered Viral Content Generator)
  async createContentTrend(trend: InsertContentTrend): Promise<ContentTrend> {
    const id = this.currentContentTrendId++;
    const now = new Date();
    
    const newTrend: ContentTrend = {
      ...trend,
      id,
      description: trend.description || null,
      popularity: trend.popularity || 0,
      category: trend.category || null,
      startedAt: trend.startedAt || now,
      expiresAt: trend.expiresAt || null,
      data: trend.data || {},
      active: trend.active ?? true,
      createdAt: now,
      updatedAt: now
    };
    
    this.contentTrends.set(id, newTrend);
    return newTrend;
  }
  
  async getContentTrendById(id: number): Promise<ContentTrend | undefined> {
    return this.contentTrends.get(id);
  }
  
  async getActiveContentTrends(): Promise<ContentTrend[]> {
    const now = new Date();
    return Array.from(this.contentTrends.values())
      .filter(trend => 
        trend.active && 
        (!trend.expiresAt || new Date(trend.expiresAt) > now)
      )
      .sort((a, b) => {
        // Sort by popularity (highest first)
        const popA = a.popularity || 0;
        const popB = b.popularity || 0;
        return popB - popA;
      });
  }
  
  async getTrendsByCategory(category: string): Promise<ContentTrend[]> {
    return (await this.getActiveContentTrends())
      .filter(trend => trend.category === category);
  }
  
  async updateContentTrend(id: number, data: Partial<InsertContentTrend>): Promise<ContentTrend | undefined> {
    const trend = this.contentTrends.get(id);
    if (!trend) return undefined;
    
    const updatedTrend = { 
      ...trend, 
      ...data,
      updatedAt: new Date()
    };
    this.contentTrends.set(id, updatedTrend);
    return updatedTrend;
  }
  
  // Content Suggestion methods
  async createContentSuggestion(suggestion: InsertContentSuggestion): Promise<ContentSuggestion> {
    const id = this.currentContentSuggestionId++;
    
    const newSuggestion: ContentSuggestion = {
      ...suggestion,
      id,
      description: suggestion.description || null,
      caption: suggestion.caption || null,
      hashtags: suggestion.hashtags || [],
      mediaPrompt: suggestion.mediaPrompt || null,
      trendId: suggestion.trendId || null,
      used: suggestion.used || false,
      engagementScore: suggestion.engagementScore || 0,
      createdAt: new Date()
    };
    
    this.contentSuggestions.set(id, newSuggestion);
    return newSuggestion;
  }
  
  async getContentSuggestionById(id: number): Promise<ContentSuggestion | undefined> {
    return this.contentSuggestions.get(id);
  }
  
  async getUserContentSuggestions(userId: number): Promise<ContentSuggestion[]> {
    return Array.from(this.contentSuggestions.values())
      .filter(suggestion => suggestion.userId === userId)
      .sort((a, b) => {
        // Sort by creation date (newest first)
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });
  }
  
  async getUnusedContentSuggestions(userId: number): Promise<ContentSuggestion[]> {
    return (await this.getUserContentSuggestions(userId))
      .filter(suggestion => !suggestion.used)
      .sort((a, b) => {
        // Sort by engagement score (highest first)
        const scoreA = a.engagementScore || 0;
        const scoreB = b.engagementScore || 0;
        return scoreB - scoreA;
      });
  }
  
  async updateContentSuggestion(id: number, data: Partial<InsertContentSuggestion>): Promise<ContentSuggestion | undefined> {
    const suggestion = this.contentSuggestions.get(id);
    if (!suggestion) return undefined;
    
    const updatedSuggestion = { ...suggestion, ...data };
    this.contentSuggestions.set(id, updatedSuggestion);
    return updatedSuggestion;
  }
  
  async markContentSuggestionAsUsed(id: number): Promise<ContentSuggestion | undefined> {
    const suggestion = this.contentSuggestions.get(id);
    if (!suggestion) return undefined;
    
    const updatedSuggestion = { ...suggestion, used: true };
    this.contentSuggestions.set(id, updatedSuggestion);
    return updatedSuggestion;
  }
  
  // User Onboarding methods
  async createUserOnboarding(onboarding: InsertUserOnboarding): Promise<UserOnboarding> {
    const id = this.currentUserOnboardingId++;
    
    const newOnboarding: UserOnboarding = {
      ...onboarding,
      id,
      profileCompleted: onboarding.profileCompleted || false,
      instagramConnected: onboarding.instagramConnected || false,
      firstPostCreated: onboarding.firstPostCreated || false,
      firstPostScheduled: onboarding.firstPostScheduled || false,
      viewedAnalytics: onboarding.viewedAnalytics || false,
      invitedFriend: onboarding.invitedFriend || false,
      completedTutorial: onboarding.completedTutorial || false,
      currentStep: onboarding.currentStep || 1,
      progress: onboarding.progress || 0,
      startedAt: new Date(),
      completedAt: null
    };
    
    this.userOnboardings.set(newOnboarding.userId, newOnboarding);
    return newOnboarding;
  }
  
  async getUserOnboarding(userId: number): Promise<UserOnboarding | undefined> {
    return this.userOnboardings.get(userId);
  }
  
  async updateUserOnboarding(userId: number, data: Partial<InsertUserOnboarding>): Promise<UserOnboarding | undefined> {
    const onboarding = this.userOnboardings.get(userId);
    if (!onboarding) return undefined;
    
    const updatedOnboarding = { ...onboarding, ...data };
    
    // Check if all steps are complete
    const allComplete = 
      updatedOnboarding.profileCompleted &&
      updatedOnboarding.instagramConnected &&
      updatedOnboarding.firstPostCreated &&
      updatedOnboarding.firstPostScheduled &&
      updatedOnboarding.viewedAnalytics &&
      updatedOnboarding.invitedFriend &&
      updatedOnboarding.completedTutorial;
    
    // Update completed timestamp if all steps are complete and it wasn't completed before
    if (allComplete && !onboarding.completedAt) {
      updatedOnboarding.completedAt = new Date();
      updatedOnboarding.progress = 100;
    }
    
    this.userOnboardings.set(userId, updatedOnboarding);
    return updatedOnboarding;
  }
  
  async completeOnboardingStep(userId: number, step: string): Promise<UserOnboarding | undefined> {
    // Get current onboarding state or create a new one
    let onboarding = await this.getUserOnboarding(userId);
    if (!onboarding) {
      onboarding = await this.createUserOnboarding({ userId });
    }
    
    // Map of steps to their property names
    const stepMap: Record<string, keyof InsertUserOnboarding> = {
      'profile': 'profileCompleted',
      'instagram': 'instagramConnected',
      'create_post': 'firstPostCreated',
      'schedule_post': 'firstPostScheduled',
      'analytics': 'viewedAnalytics',
      'invite_friend': 'invitedFriend',
      'tutorial': 'completedTutorial'
    };
    
    // Update the specific step
    if (stepMap[step]) {
      const updateData: Partial<InsertUserOnboarding> = {
        [stepMap[step]]: true
      };
      
      // Count completed steps to update progress
      let completedSteps = 0;
      for (const key of Object.values(stepMap)) {
        if (onboarding[key as keyof UserOnboarding]) {
          completedSteps++;
        }
      }
      
      // Update if the current step is being completed
      if (!onboarding[stepMap[step] as keyof UserOnboarding]) {
        completedSteps++;
      }
      
      // Calculate progress percentage
      const totalSteps = Object.keys(stepMap).length;
      const progress = Math.round((completedSteps / totalSteps) * 100);
      
      // Update current step (move to the next uncompleted step)
      updateData.progress = progress;
      updateData.currentStep = onboarding.currentStep;
      
      // Find the next uncompleted step
      for (let i = onboarding.currentStep; i <= totalSteps; i++) {
        const nextStep = Object.values(stepMap)[i];
        if (nextStep && !onboarding[nextStep as keyof UserOnboarding] && nextStep !== stepMap[step]) {
          updateData.currentStep = i + 1;
          break;
        }
      }
      
      return this.updateUserOnboarding(userId, updateData);
    }
    
    return onboarding;
  }
  
  async getOnboardingProgress(userId: number): Promise<number> {
    const onboarding = await this.getUserOnboarding(userId);
    if (!onboarding) return 0;
    
    return onboarding.progress;
  }

  // Inspiration Gallery methods
  async createInspirationItem(item: InsertInspirationGallery): Promise<InspirationGallery> {
    const id = this.currentInspirationGalleryId++;
    const newItem: InspirationGallery = {
      ...item,
      id,
      createdAt: new Date(),
      views: 0,
      likes: 0,
      shares: 0,
      tags: item.tags || [],
      aiGenerated: item.aiGenerated || false,
      settings: item.settings || {},
      metadata: item.metadata || {}
    };

    this.inspirationGalleryItems.set(id, newItem);
    return newItem;
  }

  async getInspirationById(id: number): Promise<InspirationGallery | undefined> {
    return this.inspirationGalleryItems.get(id);
  }

  async getAllInspirationItems(limit?: number): Promise<InspirationGallery[]> {
    const items = Array.from(this.inspirationGalleryItems.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return limit ? items.slice(0, limit) : items;
  }

  async getInspirationByCategory(category: string): Promise<InspirationGallery[]> {
    return Array.from(this.inspirationGalleryItems.values())
      .filter(item => item.category === category)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getInspirationByTags(tags: string[]): Promise<InspirationGallery[]> {
    return Array.from(this.inspirationGalleryItems.values())
      .filter(item => {
        if (!item.tags || !Array.isArray(item.tags)) return false;
        return tags.some(tag => item.tags.includes(tag));
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getPopularInspirationItems(limit?: number): Promise<InspirationGallery[]> {
    const items = Array.from(this.inspirationGalleryItems.values())
      .sort((a, b) => {
        // Calculate engagement score based on views, likes, and shares
        const scoreA = (a.views || 0) + (a.likes || 0) * 3 + (a.shares || 0) * 5;
        const scoreB = (b.views || 0) + (b.likes || 0) * 3 + (b.shares || 0) * 5;
        return scoreB - scoreA;
      });
    
    return limit ? items.slice(0, limit) : items;
  }

  async updateInspirationItem(id: number, data: Partial<InsertInspirationGallery>): Promise<InspirationGallery | undefined> {
    const item = await this.getInspirationById(id);
    if (!item) return undefined;
    
    const updatedItem = { ...item, ...data };
    this.inspirationGalleryItems.set(id, updatedItem);
    return updatedItem;
  }

  async deleteInspirationItem(id: number): Promise<boolean> {
    return this.inspirationGalleryItems.delete(id);
  }
  
  async recordInspirationItemView(id: number): Promise<void> {
    const item = await this.getInspirationById(id);
    if (!item) return;
    
    const views = (item.views || 0) + 1;
    const updatedItem = { 
      ...item, 
      views,
      // Update popularity score based on engagement metrics
      popularity: String((views + (item.likes || 0) * 3 + (item.shares || 0) * 5) / 10)
    };
    
    this.inspirationGalleryItems.set(id, updatedItem);
  }
  
  async recordInspirationItemLike(id: number): Promise<void> {
    const item = await this.getInspirationById(id);
    if (!item) return;
    
    const likes = (item.likes || 0) + 1;
    const updatedItem = { 
      ...item, 
      likes,
      // Update popularity score based on engagement metrics
      popularity: String(((item.views || 0) + likes * 3 + (item.shares || 0) * 5) / 10) 
    };
    
    this.inspirationGalleryItems.set(id, updatedItem);
  }
  
  async recordInspirationItemShare(id: number): Promise<void> {
    const item = await this.getInspirationById(id);
    if (!item) return;
    
    const shares = (item.shares || 0) + 1;
    const updatedItem = { 
      ...item, 
      shares,
      // Update popularity score based on engagement metrics
      popularity: String(((item.views || 0) + (item.likes || 0) * 3 + shares * 5) / 10)
    };
    
    this.inspirationGalleryItems.set(id, updatedItem);
  }
}

export const storage = new MemStorage();
