#!/usr/bin/env tsx

/**
 * This script generates blog posts using the BlogGenerator
 * Usage: tsx generate-blog-posts.ts [number_of_posts]
 * 
 * Example: tsx generate-blog-posts.ts 5
 */

import { BlogGenerator } from "../server/blog-generator";

// Environment variables are loaded automatically in Replit environments

// Default to 1 post if no argument is provided
const count = process.argv[2] ? parseInt(process.argv[2]) : 1;

if (isNaN(count) || count < 1) {
  console.error("Please provide a valid number of posts to generate");
  process.exit(1);
}

console.log(`Generating ${count} blog post(s)...`);

(async () => {
  try {
    // Generate the specified number of blog posts
    const successCount = await BlogGenerator.generateMultiplePosts(count);
    
    console.log(`Successfully generated ${successCount} of ${count} requested blog posts`);
    
    if (successCount < count) {
      console.warn("Some posts failed to generate. Check logs for details.");
      process.exit(1);
    }
    
    process.exit(0);
  } catch (error) {
    console.error("Error generating blog posts:", error);
    process.exit(1);
  }
})();