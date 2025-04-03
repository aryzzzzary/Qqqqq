// Augmenting types to fix "req.user possibly undefined" errors in routes
import { User } from '@shared/schema';

// Tell TypeScript that req.user is always defined when using the middleware
declare global {
  namespace Express {
    // This ensures req.user is of type User when isAuthenticated() is true
    interface Request {
      user: User;
      isAuthenticated(): boolean;
    }
    
    // This ensures passport.js knows about our User type
    interface User {
      id: number;
      username: string;
      email: string;
      password: string;
      // All other User properties from schema
    }
  }
}