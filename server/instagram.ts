import { Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { 
  InsertPost, 
  InstagramApiStatus, 
  InstagramAnalytics,
  InstagramMediaType 
} from "@shared/schema";

// This is a simulated implementation of Instagram Graph API integration
// In a real application, this would use the actual Instagram API
export class InstagramAPI {
  // Check if a user is connected to Instagram
  static async isConnected(userId: number) {
    const user = await storage.getUser(userId);
    return Boolean(user?.accessToken && user?.instagramBusinessId);
  }
  
  // Get Instagram API status
  static async getApiStatus(userId: number): Promise<InstagramApiStatus> {
    const user = await storage.getUser(userId);
    
    if (!user?.accessToken || !user?.instagramBusinessId) {
      return {
        connected: false,
        businessAccount: "",
        rateLimit: { used: 0, total: 0, resetsIn: "" },
        contentQuota: { used: 0, total: 0, period: "" },
        lastSync: ""
      };
    }
    
    // Simulate API status
    return {
      connected: true,
      businessAccount: user.instagramUsername || "@business_account",
      rateLimit: {
        used: 35,
        total: 100,
        resetsIn: "45 min"
      },
      contentQuota: {
        used: 36,
        total: 50,
        period: "24h period"
      },
      lastSync: new Date().toLocaleString()
    };
  }
  
  // Get analytics data
  static async getAnalytics(userId: number, days = 7): Promise<InstagramAnalytics> {
    const user = await storage.getUser(userId);
    
    if (!user?.accessToken) {
      throw new Error("User not connected to Instagram");
    }
    
    // Simulate analytics data
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    return {
      followers: {
        count: 3482,
        change: 2.4
      },
      engagement: {
        rate: 8.3,
        change: 1.7
      },
      postReach: {
        count: 12500,
        change: -0.8
      },
      profileVisits: {
        count: 1283,
        change: 5.1
      },
      periodStart: startDate.toISOString(),
      periodEnd: endDate.toISOString()
    };
  }
  
  // Schedule a post
  static async schedulePost(userId: number, postData: InsertPost) {
    const user = await storage.getUser(userId);
    
    if (!user?.accessToken) {
      throw new Error("User not connected to Instagram");
    }
    
    // Save post to storage
    return await storage.createPost(postData);
  }
  
  // Publish a post immediately
  static async publishPost(postId: number) {
    const post = await storage.getPostById(postId);
    
    if (!post) {
      throw new Error("Post not found");
    }
    
    const user = await storage.getUser(post.userId);
    
    if (!user?.accessToken) {
      throw new Error("User not connected to Instagram");
    }
    
    // In a real implementation, this would call the Instagram Graph API
    // For now, just update the post status
    const updatedPost = await storage.updatePost(postId, {
      status: "posted"
    });
    
    // When a post is published, set the Instagram post ID and posted date
    // We need to handle this separately from the updatePost call above
    // since these fields aren't part of the insertPostSchema
    if (updatedPost) {
      // Since we're modifying the post directly, we can set any fields
      // The memory storage implementation accepts all fields
      updatedPost.instagramPostId = `IG_${Date.now()}`;
      updatedPost.postedAt = new Date();
      
      // Save the updated post
      await storage.updatePost(postId, updatedPost as any);
    }
    
    return updatedPost;
  }
  
  // Authenticate with Instagram
  static async authenticateWithInstagram(code: string, userId: number) {
    // In a real implementation, this would exchange the code for an access token
    // and retrieve the user's Instagram Business ID
    
    // For now, just update the user with mock data
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 60); // 60 days from now
    
    await storage.updateUser(userId, {
      accessToken: `MOCK_ACCESS_TOKEN_${Date.now()}`,
      instagramBusinessId: `MOCK_BUSINESS_ID_${Date.now()}`,
      instagramUsername: "your_business_handle",
      tokenExpiry: expiryDate
    });
    
    return { success: true };
  }
}

// Middleware to ensure a user is connected to Instagram
export function requireInstagramAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  // Explicitly non-null assert to make TypeScript happy
  req.user = req.user!;
  const userId = req.user.id;
  
  InstagramAPI.isConnected(userId)
    .then(connected => {
      if (!connected) {
        return res.status(403).json({ message: "Instagram connection required" });
      }
      next();
    })
    .catch(next);
}
