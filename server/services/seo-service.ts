import { aiService } from './ai-service';
import { storage } from '../storage';
import { BlogPost } from '@shared/schema';

// Add generateText method to our aiService
declare module './ai-service' {
  interface AIService {
    generateText(prompt: string): Promise<{ text: string; error?: string }>;
  }
}

// Implement the generateText method using existing methods
aiService.generateText = async function(prompt: string) {
  try {
    const response = await this.generateContent(prompt, "professional", "text", "");
    return { text: response.caption || "" };
  } catch (error) {
    return { text: "", error: error.message };
  }
};

interface SeoAnalysisResult {
  score: number;
  recommendations: string[];
  keywordDensity: { [keyword: string]: number };
  metaTags: {
    title: { value: string; score: number; recommendation?: string };
    description: { value: string; score: number; recommendation?: string };
    keywords: { value: string[]; score: number; recommendation?: string };
  };
  contentAnalysis: {
    headings: { count: number; score: number; recommendation?: string };
    paragraphs: { count: number; score: number; recommendation?: string };
    wordCount: { count: number; score: number; recommendation?: string };
    readabilityScore: number;
  };
  technicalSeo: {
    slugOptimization: { score: number; recommendation?: string };
    imageAlt: { score: number; recommendation?: string };
    internalLinks: { count: number; score: number; recommendation?: string };
  };
}

interface KeywordSuggestion {
  keyword: string;
  searchVolume: string;
  difficulty: string;
  relevance: number;
}

interface MetaTagSuggestion {
  title: string;
  description: string;
  keywords: string[];
}

export class SeoService {
  private contentGuidelines = {
    minWordCount: 300,
    maxWordCount: 2500,
    idealWordCount: 1200,
    minHeadings: 3,
    idealTitleLength: { min: 50, max: 60 },
    idealDescriptionLength: { min: 140, max: 160 },
    keywordDensity: { min: 0.5, max: 2.5 },
  };

  // Analyzes SEO aspects of a blog post
  async analyzeBlogPost(blogPostId: number): Promise<SeoAnalysisResult> {
    const post = await storage.getBlogPostById(blogPostId);
    
    if (!post) {
      throw new Error('Blog post not found');
    }
    
    // Parse content to analyze it
    const wordCount = this.countWords(post.content);
    const headings = this.countHeadings(post.content);
    const paragraphs = this.countParagraphs(post.content);
    const readabilityScore = this.calculateReadabilityScore(post.content);
    
    // Calculate keyword density for SEO keywords
    const keywordDensity = this.calculateKeywordDensity(
      post.content, 
      Array.isArray(post.seoKeywords) ? post.seoKeywords : []
    );
    
    // Analyze meta tags
    const titleScore = this.analyzeTitle(post.seoTitle);
    const descriptionScore = this.analyzeDescription(post.seoDescription);
    const keywordsScore = this.analyzeKeywords(
      Array.isArray(post.seoKeywords) ? post.seoKeywords : []
    );
    
    // Technical SEO aspects
    const slugScore = this.analyzeSlug(post.slug);
    const imageAltScore = this.analyzeImageAlt(post.content);
    const internalLinksAnalysis = this.analyzeInternalLinks(post.content);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations({
      title: titleScore,
      description: descriptionScore,
      keywords: keywordsScore,
      wordCount,
      headings,
      paragraphs,
      readabilityScore,
      slug: post.slug,
      keywordDensity,
      internalLinks: internalLinksAnalysis.count
    });
    
    // Calculate overall score (0-100)
    const score = this.calculateOverallScore({
      titleScore: titleScore.score,
      descriptionScore: descriptionScore.score,
      keywordsScore: keywordsScore.score,
      contentScore: this.calculateContentScore(wordCount, headings, paragraphs, readabilityScore),
      technicalScore: (slugScore.score + imageAltScore.score + internalLinksAnalysis.score) / 3
    });
    
    return {
      score,
      recommendations,
      keywordDensity,
      metaTags: {
        title: titleScore,
        description: descriptionScore,
        keywords: keywordsScore
      },
      contentAnalysis: {
        headings: { 
          count: headings, 
          score: this.calculateHeadingsScore(headings),
          recommendation: headings < this.contentGuidelines.minHeadings 
            ? `Add more headings to structure your content. Aim for at least ${this.contentGuidelines.minHeadings}.` 
            : undefined
        },
        paragraphs: { 
          count: paragraphs, 
          score: this.calculateParagraphsScore(paragraphs, wordCount),
          recommendation: paragraphs < 5 
            ? 'Consider breaking your content into more paragraphs for better readability.' 
            : undefined
        },
        wordCount: { 
          count: wordCount, 
          score: this.calculateWordCountScore(wordCount),
          recommendation: wordCount < this.contentGuidelines.minWordCount 
            ? `Increase your content length to at least ${this.contentGuidelines.minWordCount} words for better SEO.` 
            : (wordCount > this.contentGuidelines.maxWordCount 
              ? `Consider breaking this content into multiple posts as it exceeds ${this.contentGuidelines.maxWordCount} words.` 
              : undefined)
        },
        readabilityScore
      },
      technicalSeo: {
        slugOptimization: slugScore,
        imageAlt: imageAltScore,
        internalLinks: internalLinksAnalysis
      }
    };
  }
  
  // Generate keyword suggestions based on a topic
  async suggestKeywords(topic: string, count: number = 10): Promise<KeywordSuggestion[]> {
    // This is where we'd integrate with a keyword research API 
    // For now, we'll use AI to generate realistic suggestions
    const prompt = `Generate ${count} SEO keyword suggestions for a blog about "${topic}". Include long-tail keywords. Format each as a JSON object with properties: keyword, searchVolume (string like "1K-10K"), difficulty (string like "Easy", "Medium", "Hard"), and relevance (number 1-10).`;
    
    try {
      const response = await aiService.generateText(prompt);
      
      // Parse the response to extract keywords
      // This assumes the AI will return formatted JSON
      if (response && !response.error) {
        try {
          // The AI might format it as JSON directly or as a code block
          const jsonMatch = response.text.match(/```json\n([\s\S]*?)\n```/) || 
                           response.text.match(/```\n([\s\S]*?)\n```/) ||
                           [null, response.text];
          
          const jsonContent = jsonMatch ? jsonMatch[1] : response.text;
          const suggestions = JSON.parse(jsonContent);
          
          if (Array.isArray(suggestions)) {
            return suggestions.slice(0, count) as KeywordSuggestion[];
          }
        } catch (error) {
          console.error('Error parsing keyword suggestions:', error);
        }
      }
      
      // Fallback if AI response isn't formatted correctly
      return this.generateFallbackKeywordSuggestions(topic, count);
    } catch (error) {
      console.error('Error generating keyword suggestions:', error);
      return this.generateFallbackKeywordSuggestions(topic, count);
    }
  }
  
  // Generate meta tag suggestions for a blog post
  async suggestMetaTags(title: string, content: string): Promise<MetaTagSuggestion> {
    const prompt = `Based on the following blog title and content, generate optimized SEO meta tags:
    
Title: ${title}

${content.substring(0, 1000)}... (content truncated for brevity)

Generate these as a JSON object with:
1. title: An SEO-optimized title (50-60 characters)
2. description: An engaging meta description (140-160 characters)
3. keywords: An array of 5-8 relevant keywords/phrases

Format as valid JSON only.`;
    
    try {
      const response = await aiService.generateText(prompt);
      
      if (response && !response.error) {
        try {
          // Extract JSON from the response
          const jsonMatch = response.text.match(/```json\n([\s\S]*?)\n```/) || 
                           response.text.match(/```\n([\s\S]*?)\n```/) ||
                           [null, response.text];
          
          const jsonContent = jsonMatch ? jsonMatch[1] : response.text;
          const metaTags = JSON.parse(jsonContent) as MetaTagSuggestion;
          
          return {
            title: metaTags.title || this.generateDefaultTitle(title),
            description: metaTags.description || this.generateDefaultDescription(content),
            keywords: Array.isArray(metaTags.keywords) ? metaTags.keywords : this.extractKeywords(title, content)
          };
        } catch (error) {
          console.error('Error parsing meta tag suggestions:', error);
        }
      }
      
      // Fallback
      return {
        title: this.generateDefaultTitle(title),
        description: this.generateDefaultDescription(content),
        keywords: this.extractKeywords(title, content)
      };
    } catch (error) {
      console.error('Error generating meta tag suggestions:', error);
      return {
        title: this.generateDefaultTitle(title),
        description: this.generateDefaultDescription(content),
        keywords: this.extractKeywords(title, content)
      };
    }
  }
  
  // Generate a sitemap based on all blog posts
  async generateSitemap(baseUrl: string): Promise<string> {
    const blogPosts = await storage.getAllBlogPosts();
    
    // XML sitemap format
    let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
    sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    
    // Add homepage
    sitemap += '  <url>\n';
    sitemap += `    <loc>${baseUrl}</loc>\n`;
    sitemap += '    <changefreq>daily</changefreq>\n';
    sitemap += '    <priority>1.0</priority>\n';
    sitemap += '  </url>\n';
    
    // Add blog index page
    sitemap += '  <url>\n';
    sitemap += `    <loc>${baseUrl}/blog</loc>\n`;
    sitemap += '    <changefreq>daily</changefreq>\n';
    sitemap += '    <priority>0.9</priority>\n';
    sitemap += '  </url>\n';
    
    // Add other important pages
    const importantPages = [
      '/features', 
      '/pricing', 
      '/about', 
      '/contact'
    ];
    
    for (const page of importantPages) {
      sitemap += '  <url>\n';
      sitemap += `    <loc>${baseUrl}${page}</loc>\n`;
      sitemap += '    <changefreq>weekly</changefreq>\n';
      sitemap += '    <priority>0.8</priority>\n';
      sitemap += '  </url>\n';
    }
    
    // Add blog posts
    for (const post of blogPosts) {
      const postUrl = `${baseUrl}/blog/${post.slug}`;
      const lastMod = post.updatedAt || post.publishedAt || new Date().toISOString().split('T')[0];
      
      sitemap += '  <url>\n';
      sitemap += `    <loc>${postUrl}</loc>\n`;
      sitemap += `    <lastmod>${lastMod}</lastmod>\n`;
      sitemap += '    <changefreq>monthly</changefreq>\n';
      sitemap += '    <priority>0.7</priority>\n';
      sitemap += '  </url>\n';
    }
    
    sitemap += '</urlset>';
    return sitemap;
  }

  // Generate a robots.txt file
  generateRobotsTxt(baseUrl: string): string {
    return `User-agent: *
Allow: /
Sitemap: ${baseUrl}/sitemap.xml

# Disallow admin and private areas
Disallow: /admin/
Disallow: /api/
Disallow: /private/
Disallow: /account/

# Allow search crawlers to access key content
Allow: /blog/
Allow: /features/
Allow: /pricing/
`;
  }
  
  // Generate JSON-LD structured data for a blog post
  generateStructuredData(post: BlogPost, authorName: string, baseUrl: string): string {
    const postUrl = `${baseUrl}/blog/${post.slug}`;
    const datePublished = post.publishedAt || new Date().toISOString();
    const dateModified = post.updatedAt || datePublished;
    
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": postUrl
      },
      "headline": post.title,
      "description": post.summary,
      "image": post.featuredImage ? [post.featuredImage] : [],
      "author": {
        "@type": "Person",
        "name": authorName || post.authorName
      },
      "publisher": {
        "@type": "Organization",
        "name": "Jarvis AI Instagram Agent",
        "logo": {
          "@type": "ImageObject",
          "url": `${baseUrl}/logo.png`
        }
      },
      "datePublished": datePublished,
      "dateModified": dateModified,
      "keywords": Array.isArray(post.seoKeywords) ? post.seoKeywords.join(", ") : ""
    };
    
    return JSON.stringify(structuredData, null, 2);
  }
  
  // Optimize an existing blog post for SEO
  async optimizeBlogPost(blogPostId: number): Promise<BlogPost> {
    const post = await storage.getBlogPostById(blogPostId);
    
    if (!post) {
      throw new Error('Blog post not found');
    }
    
    // Analyze current SEO status
    const analysis = await this.analyzeBlogPost(blogPostId);
    
    // Generate optimization suggestions
    const metaTags = await this.suggestMetaTags(post.title, post.content);
    
    // Only update if the current score is below threshold
    if (analysis.score < 70) {
      // Create a properly typed update object that matches the expected schema
      const updates: Record<string, any> = {};
      
      // Update meta tags if they need improvement
      if (analysis.metaTags.title.score < 7) {
        updates.seoTitle = metaTags.title;
      }
      
      if (analysis.metaTags.description.score < 7) {
        updates.seoDescription = metaTags.description;
      }
      
      if (analysis.metaTags.keywords.score < 7) {
        updates.seoKeywords = metaTags.keywords;
      }
      
      // Apply updates if needed
      if (Object.keys(updates).length > 0) {
        const updatedPost = await storage.updateBlogPost(blogPostId, updates);
        return updatedPost || post;
      }
    }
    
    return post;
  }
  
  // Helper methods
  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }
  
  private countHeadings(content: string): number {
    const headingMatches = content.match(/<h[1-6][^>]*>.*?<\/h[1-6]>|^#{1,6}\s+.+$/gm);
    return headingMatches ? headingMatches.length : 0;
  }
  
  private countParagraphs(content: string): number {
    const paragraphMatches = content.match(/<p[^>]*>.*?<\/p>|^[^#<>\n].+$/gm);
    return paragraphMatches ? paragraphMatches.length : 0;
  }
  
  private calculateReadabilityScore(text: string): number {
    // Simple implementation of Flesch-Kincaid readability test
    // In a real implementation, we would use a more sophisticated algorithm
    
    // Remove HTML tags
    const cleanText = text.replace(/<[^>]*>/g, '');
    
    // Count sentences, words, and syllables
    const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = cleanText.split(/\s+/).filter(w => w.match(/[a-zA-Z]/));
    
    if (sentences.length === 0 || words.length === 0) {
      return 0;
    }
    
    // Calculate average sentence length
    const asl = words.length / sentences.length;
    
    // Very rough syllable estimation
    const syllableCount = words.reduce((count, word) => {
      return count + this.estimateSyllables(word);
    }, 0);
    
    // Calculate average syllables per word
    const asw = syllableCount / words.length;
    
    // Flesch-Kincaid formula: 206.835 - (1.015 * ASL) - (84.6 * ASW)
    const score = 206.835 - (1.015 * asl) - (84.6 * asw);
    
    // Normalize to 0-10 scale
    return Math.min(10, Math.max(0, score / 10));
  }
  
  private estimateSyllables(word: string): number {
    // Very simplistic syllable counter
    word = word.toLowerCase();
    
    // Exception for words ending in silent e
    if (word.length > 2 && word.endsWith('e') && !word.endsWith('le')) {
      word = word.substring(0, word.length - 1);
    }
    
    // Count vowel groups
    const matches = word.match(/[aeiouy]+/g);
    return matches ? matches.length : 1;
  }
  
  private calculateKeywordDensity(
    content: string, 
    keywords: string[]
  ): { [keyword: string]: number } {
    const result: { [keyword: string]: number } = {};
    
    // Remove HTML tags and lowercase
    const cleanText = content.replace(/<[^>]*>/g, '').toLowerCase();
    const totalWords = this.countWords(cleanText);
    
    if (totalWords === 0) {
      return result;
    }
    
    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'g');
      const matches = cleanText.match(regex);
      const count = matches ? matches.length : 0;
      
      // Calculate density as percentage
      result[keyword] = parseFloat(((count / totalWords) * 100).toFixed(2));
    }
    
    return result;
  }
  
  private analyzeTitle(title: string): { value: string; score: number; recommendation?: string } {
    const length = title.length;
    const idealMin = this.contentGuidelines.idealTitleLength.min;
    const idealMax = this.contentGuidelines.idealTitleLength.max;
    
    let score = 10;
    let recommendation;
    
    // Check title length
    if (length < idealMin) {
      score -= 3;
      recommendation = `Title is too short (${length} chars). Aim for ${idealMin}-${idealMax} characters.`;
    } else if (length > idealMax) {
      score -= 2;
      recommendation = `Title is too long (${length} chars). Aim for ${idealMin}-${idealMax} characters.`;
    }
    
    // Check if title is capitalized properly
    if (!/^[A-Z]/.test(title)) {
      score -= 1;
      recommendation = (recommendation || '') + ' Capitalize the first letter of your title.';
    }
    
    return { value: title, score, recommendation };
  }
  
  private analyzeDescription(description: string): { value: string; score: number; recommendation?: string } {
    const length = description.length;
    const idealMin = this.contentGuidelines.idealDescriptionLength.min;
    const idealMax = this.contentGuidelines.idealDescriptionLength.max;
    
    let score = 10;
    let recommendation;
    
    // Check description length
    if (length < idealMin) {
      score -= 3;
      recommendation = `Description is too short (${length} chars). Aim for ${idealMin}-${idealMax} characters.`;
    } else if (length > idealMax) {
      score -= 2;
      recommendation = `Description is too long (${length} chars). Aim for ${idealMin}-${idealMax} characters.`;
    }
    
    // Check if description is a complete sentence
    if (!/^[A-Z].*[.!?]$/.test(description)) {
      score -= 1;
      recommendation = (recommendation || '') + ' Format your description as a complete sentence.';
    }
    
    return { value: description, score, recommendation };
  }
  
  private analyzeKeywords(keywords: string[]): { value: string[]; score: number; recommendation?: string } {
    let score = 10;
    let recommendation;
    
    // Check number of keywords
    if (keywords.length === 0) {
      score = 0;
      recommendation = 'No keywords defined. Add relevant keywords for better SEO.';
    } else if (keywords.length < 3) {
      score -= 3;
      recommendation = `Only ${keywords.length} keywords defined. Add more relevant keywords (aim for 5-8).`;
    } else if (keywords.length > 10) {
      score -= 2;
      recommendation = `Too many keywords (${keywords.length}). Focus on 5-8 most relevant ones.`;
    }
    
    // Check keyword quality
    const shortKeywords = keywords.filter(k => k.split(' ').length === 1);
    if (shortKeywords.length === keywords.length && keywords.length > 2) {
      score -= 2;
      recommendation = (recommendation || '') + ' Include some long-tail keywords (phrases) for better targeting.';
    }
    
    return { value: keywords, score, recommendation };
  }
  
  private analyzeSlug(slug: string): { score: number; recommendation?: string } {
    let score = 10;
    let recommendation;
    
    // Check slug length
    if (slug.length > 75) {
      score -= 2;
      recommendation = 'URL slug is too long. Keep it under 75 characters.';
    }
    
    // Check slug format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      score -= 3;
      recommendation = 'URL slug contains invalid characters. Use only lowercase letters, numbers, and hyphens.';
    }
    
    // Check for consecutive hyphens
    if (slug.includes('--')) {
      score -= 1;
      recommendation = (recommendation || '') + ' Avoid consecutive hyphens in the URL slug.';
    }
    
    return { score, recommendation };
  }
  
  private analyzeImageAlt(content: string): { score: number; recommendation?: string } {
    // Find all img tags
    const imgRegex = /<img[^>]+>/g;
    const imgTags = content.match(imgRegex) || [];
    
    if (imgTags.length === 0) {
      return { score: 10 }; // No images to analyze
    }
    
    // Count images with alt attributes
    const altRegex = /<img[^>]+alt=["'][^"']*["'][^>]*>/g;
    const imgsWithAlt = content.match(altRegex) || [];
    
    const ratio = imgsWithAlt.length / imgTags.length;
    const score = Math.round(ratio * 10);
    
    let recommendation;
    if (score < 10) {
      const missing = imgTags.length - imgsWithAlt.length;
      recommendation = `${missing} image(s) missing alt text. Add descriptive alt attributes to all images.`;
    }
    
    return { score, recommendation };
  }
  
  private analyzeInternalLinks(content: string): { count: number; score: number; recommendation?: string } {
    // Find all internal links (approximation)
    const linkRegex = /<a[^>]+href=["'][^"']*["'][^>]*>.*?<\/a>/g;
    const links = content.match(linkRegex) || [];
    
    const count = links.length;
    let score = 10;
    let recommendation;
    
    if (count === 0) {
      score = 5;
      recommendation = 'No internal links found. Add links to related content for better SEO.';
    } else if (count < 2) {
      score = 7;
      recommendation = 'Only one internal link found. Consider adding more links to related content.';
    }
    
    return { count, score, recommendation };
  }
  
  private calculateContentScore(
    wordCount: number, 
    headingsCount: number, 
    paragraphsCount: number, 
    readabilityScore: number
  ): number {
    let score = 0;
    
    // Word count score (0-10)
    const wordCountScore = this.calculateWordCountScore(wordCount);
    
    // Headings score (0-10)
    const headingsScore = this.calculateHeadingsScore(headingsCount);
    
    // Paragraphs score (0-10)
    const paragraphsScore = this.calculateParagraphsScore(paragraphsCount, wordCount);
    
    // Weighted average
    score = (wordCountScore * 0.3) + (headingsScore * 0.3) + (paragraphsScore * 0.2) + (readabilityScore * 0.2);
    
    return Math.min(10, Math.max(0, score));
  }
  
  private calculateWordCountScore(wordCount: number): number {
    const min = this.contentGuidelines.minWordCount;
    const max = this.contentGuidelines.maxWordCount;
    const ideal = this.contentGuidelines.idealWordCount;
    
    if (wordCount < min) {
      // 0-7 based on how close to minimum
      return (wordCount / min) * 7;
    } else if (wordCount > max) {
      // 7-5 based on how far over maximum
      return 7 - Math.min(2, ((wordCount - max) / max) * 3);
    } else {
      // 7-10 based on how close to ideal
      const distance = Math.abs(wordCount - ideal) / (max - min);
      return 10 - (distance * 3);
    }
  }
  
  private calculateHeadingsScore(headingsCount: number): number {
    const min = this.contentGuidelines.minHeadings;
    
    if (headingsCount < min) {
      return (headingsCount / min) * 7;
    } else {
      // Up to 10 based on having more headings
      return Math.min(10, 7 + (headingsCount - min));
    }
  }
  
  private calculateParagraphsScore(paragraphsCount: number, wordCount: number): number {
    const avgWordsPerParagraph = wordCount / (paragraphsCount || 1);
    
    // Ideal is 3-5 sentences per paragraph (roughly 50-100 words)
    if (paragraphsCount < 3) {
      return 5; // Too few paragraphs
    } else if (avgWordsPerParagraph > 150) {
      return 6; // Paragraphs too long
    } else if (avgWordsPerParagraph < 30) {
      return 7; // Paragraphs too short
    } else {
      return 10; // Good paragraph structure
    }
  }
  
  private calculateOverallScore(scores: {
    titleScore: number;
    descriptionScore: number;
    keywordsScore: number;
    contentScore: number;
    technicalScore: number;
  }): number {
    // Weighted average of all scores, normalized to 0-100
    return Math.round(
      (scores.titleScore * 0.15 +
      scores.descriptionScore * 0.15 +
      scores.keywordsScore * 0.1 +
      scores.contentScore * 0.4 +
      scores.technicalScore * 0.2) * 10
    );
  }
  
  private generateRecommendations(data: {
    title: { value: string; score: number; recommendation?: string };
    description: { value: string; score: number; recommendation?: string };
    keywords: { value: string[]; score: number; recommendation?: string };
    wordCount: number;
    headings: number;
    paragraphs: number;
    readabilityScore: number;
    slug: string;
    keywordDensity: { [keyword: string]: number };
    internalLinks: number;
  }): string[] {
    const recommendations: string[] = [];
    
    // Add title recommendation if score is low
    if (data.title.score < 7 && data.title.recommendation) {
      recommendations.push(data.title.recommendation);
    }
    
    // Add description recommendation if score is low
    if (data.description.score < 7 && data.description.recommendation) {
      recommendations.push(data.description.recommendation);
    }
    
    // Add keywords recommendation if score is low
    if (data.keywords.score < 7 && data.keywords.recommendation) {
      recommendations.push(data.keywords.recommendation);
    }
    
    // Word count recommendation
    if (data.wordCount < this.contentGuidelines.minWordCount) {
      recommendations.push(`Increase your content length to at least ${this.contentGuidelines.minWordCount} words for better SEO.`);
    } else if (data.wordCount > this.contentGuidelines.maxWordCount) {
      recommendations.push(`Consider breaking this content into multiple posts as it exceeds ${this.contentGuidelines.maxWordCount} words.`);
    }
    
    // Headings recommendation
    if (data.headings < this.contentGuidelines.minHeadings) {
      recommendations.push(`Add more headings to structure your content. Aim for at least ${this.contentGuidelines.minHeadings}.`);
    }
    
    // Keyword density recommendations
    for (const [keyword, density] of Object.entries(data.keywordDensity)) {
      if (density > this.contentGuidelines.keywordDensity.max) {
        recommendations.push(`Keyword "${keyword}" appears too frequently (${density}%). Reduce usage to avoid keyword stuffing.`);
      } else if (density < this.contentGuidelines.keywordDensity.min && data.keywords.value.includes(keyword)) {
        recommendations.push(`Increase usage of keyword "${keyword}" from ${density}% to at least ${this.contentGuidelines.keywordDensity.min}%.`);
      }
    }
    
    // Internal linking recommendation
    if (data.internalLinks < 2) {
      recommendations.push('Add more internal links to related content to improve SEO and user experience.');
    }
    
    // Readability recommendations
    if (data.readabilityScore < 4) {
      recommendations.push('Content readability is low. Use shorter sentences and simpler words to improve readability.');
    } else if (data.readabilityScore < 6) {
      recommendations.push('Consider improving content readability by using simpler language and shorter paragraphs.');
    }
    
    return recommendations;
  }
  
  private generateFallbackKeywordSuggestions(topic: string, count: number): KeywordSuggestion[] {
    // A simple fallback method if AI generation fails
    const baseSuggestions = [
      { keyword: topic, searchVolume: "10K-100K", difficulty: "High", relevance: 10 },
      { keyword: `best ${topic}`, searchVolume: "1K-10K", difficulty: "Medium", relevance: 9 },
      { keyword: `${topic} guide`, searchVolume: "1K-10K", difficulty: "Medium", relevance: 8 },
      { keyword: `how to use ${topic}`, searchVolume: "1K-10K", difficulty: "Low", relevance: 8 },
      { keyword: `${topic} tutorial`, searchVolume: "1K-10K", difficulty: "Medium", relevance: 7 },
      { keyword: `${topic} for beginners`, searchVolume: "500-1K", difficulty: "Low", relevance: 7 },
      { keyword: `advanced ${topic} techniques`, searchVolume: "100-500", difficulty: "Low", relevance: 6 },
      { keyword: `${topic} vs alternatives`, searchVolume: "500-1K", difficulty: "Medium", relevance: 6 },
      { keyword: `${topic} benefits`, searchVolume: "500-1K", difficulty: "Low", relevance: 5 },
      { keyword: `${topic} examples`, searchVolume: "500-1K", difficulty: "Low", relevance: 5 }
    ];
    
    return baseSuggestions.slice(0, count);
  }
  
  private generateDefaultTitle(title: string): string {
    // Ensure title is SEO-friendly
    return title.length > 60 ? title.substring(0, 57) + '...' : title;
  }
  
  private generateDefaultDescription(content: string): string {
    // Generate a description from the first paragraph
    const firstParagraph = content.replace(/<[^>]*>/g, '').split('\n')[0];
    const description = firstParagraph.substring(0, 155) + (firstParagraph.length > 155 ? '...' : '');
    return description;
  }
  
  private extractKeywords(title: string, content: string): string[] {
    // Simple keyword extraction from title and first paragraph
    const cleanContent = (title + ' ' + content.substring(0, 500)).replace(/<[^>]*>/g, '');
    
    // Remove common stop words and get unique words
    const stopWords = new Set(['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'a', 'an', 'is', 'was', 'be', 'are']);
    const words = cleanContent.toLowerCase().split(/\W+/).filter(word => 
      word.length > 3 && !stopWords.has(word)
    );
    
    // Ranking: Count frequencies and return top words
    const frequencies: {[key: string]: number} = {};
    for (const word of words) {
      frequencies[word] = (frequencies[word] || 0) + 1;
    }
    
    // Sort by frequency and return top 5-8 keywords
    return Object.entries(frequencies)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(entry => entry[0]);
  }
}

export const seoService = new SeoService();