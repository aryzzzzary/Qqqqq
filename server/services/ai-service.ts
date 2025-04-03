import OpenAI from 'openai';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { huggingFaceService } from './huggingface-service';

// Define interfaces for service responses
export interface AIContentResponse {
  caption: string;
  hashtags?: string[];
  mediaUrl?: string | null;
  error?: string;
}

export interface AIEngagementResponse {
  response: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  error?: string;
}

export interface AISuggestionResponse {
  suggestions: string[];
  error?: string;
}

// Available AI providers type
export type AIProvider = 'openai' | 'gemini' | 'huggingface';

// Abstraction for AI service - allows switching between providers
export class AIService {
  private openai: OpenAI | null = null;
  private gemini: GoogleGenerativeAI | null = null;
  private activeProvider: AIProvider = 'openai';

  constructor() {
    // Initialize OpenAI if key is available
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }

    // Initialize Gemini if key is available
    if (process.env.GOOGLE_GEMINI_API_KEY) {
      this.gemini = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
    }

    // Default to whichever service is available
    if (!this.openai && this.gemini) {
      this.activeProvider = 'gemini';
    } else if (!this.openai && !this.gemini && process.env.HUGGINGFACE_API_KEY) {
      this.activeProvider = 'huggingface';
    }
  }

  // Method to switch AI providers
  public setProvider(provider: AIProvider): boolean {
    if (provider === 'openai' && this.openai) {
      this.activeProvider = 'openai';
      return true;
    } else if (provider === 'gemini' && this.gemini) {
      this.activeProvider = 'gemini';
      return true;
    } else if (provider === 'huggingface' && process.env.HUGGINGFACE_API_KEY) {
      this.activeProvider = 'huggingface';
      return true;
    }
    return false;
  }

  // Generate content for a post
  public async generateContent(
    prompt: string,
    brandVoice: string,
    contentType: string,
    keyMessage: string
  ): Promise<AIContentResponse> {
    try {
      if (this.activeProvider === 'openai' && this.openai) {
        return await this.generateContentWithOpenAI(prompt, brandVoice, contentType, keyMessage);
      } else if (this.activeProvider === 'gemini' && this.gemini) {
        return await this.generateContentWithGemini(prompt, brandVoice, contentType, keyMessage);
      } else if (this.activeProvider === 'huggingface') {
        return await this.generateContentWithHuggingFace(prompt, brandVoice, contentType, keyMessage);
      } else {
        throw new Error('No AI provider available');
      }
    } catch (error: any) {
      console.error('AI content generation error:', error);
      return {
        caption: '',
        hashtags: [],
        mediaUrl: null,
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  // Generate engagement responses (comments, replies)
  public async generateEngagementResponse(
    comment: string,
    brandVoice: string
  ): Promise<AIEngagementResponse> {
    try {
      if (this.activeProvider === 'openai' && this.openai) {
        return await this.generateEngagementWithOpenAI(comment, brandVoice);
      } else if (this.activeProvider === 'gemini' && this.gemini) {
        return await this.generateEngagementWithGemini(comment, brandVoice);
      } else if (this.activeProvider === 'huggingface') {
        return await this.generateEngagementWithHuggingFace(comment, brandVoice);
      } else {
        throw new Error('No AI provider available');
      }
    } catch (error: any) {
      console.error('AI engagement generation error:', error);
      return {
        response: '',
        sentiment: 'neutral',
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  // Analyze sentiment of user comments
  public async analyzeSentiment(text: string): Promise<'positive' | 'neutral' | 'negative'> {
    try {
      if (this.activeProvider === 'openai' && this.openai) {
        return await this.analyzeSentimentWithOpenAI(text);
      } else if (this.activeProvider === 'gemini' && this.gemini) {
        return await this.analyzeSentimentWithGemini(text);
      } else if (this.activeProvider === 'huggingface') {
        return await this.analyzeSentimentWithHuggingFace(text);
      } else {
        throw new Error('No AI provider available');
      }
    } catch (error) {
      console.error('Sentiment analysis error:', error);
      return 'neutral'; // Default to neutral on error
    }
  }
  
  // Generate content suggestions based on context
  public async generateSuggestions(
    context: string,
    contentType: string,
    count: number = 3
  ): Promise<AISuggestionResponse> {
    try {
      if (this.activeProvider === 'openai' && this.openai) {
        return await this.generateSuggestionsWithOpenAI(context, contentType, count);
      } else if (this.activeProvider === 'gemini' && this.gemini) {
        return await this.generateSuggestionsWithGemini(context, contentType, count);
      } else if (this.activeProvider === 'huggingface') {
        return await this.generateSuggestionsWithHuggingFace(context, contentType, count);
      } else {
        throw new Error('No AI provider available');
      }
    } catch (error: any) {
      console.error('AI suggestion generation error:', error);
      return {
        suggestions: [],
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  // OpenAI implementations
  private async generateContentWithOpenAI(
    prompt: string,
    brandVoice: string,
    contentType: string,
    keyMessage: string
  ): Promise<AIContentResponse> {
    if (!this.openai) {
      throw new Error('OpenAI not initialized');
    }

    const completion = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an Instagram content creator with expertise in ${contentType} content. 
                   You write in a ${brandVoice} tone. Generate engaging Instagram content.`
        },
        {
          role: "user", 
          content: `Create an Instagram caption for a ${contentType} post about ${keyMessage}. 
                   Include 5-7 relevant hashtags. Keep the caption under 250 characters.`
        }
      ],
      temperature: 0.7,
    });

    const content = completion.choices[0]?.message?.content || '';
    
    // Parse caption and hashtags from the AI response
    const parts = content.split(/(\#[^\s#]+)/g);
    const caption = parts[0].trim();
    const hashtags = parts.slice(1).filter(p => p.startsWith('#')).map(tag => tag.substring(1));

    return {
      caption,
      hashtags,
      mediaUrl: null // OpenAI doesn't generate images through this method
    };
  }

  private async generateEngagementWithOpenAI(
    comment: string,
    brandVoice: string
  ): Promise<AIEngagementResponse> {
    if (!this.openai) {
      throw new Error('OpenAI not initialized');
    }

    const completion = await this.openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a social media manager with a ${brandVoice} tone. 
                   Your job is to respond to Instagram comments in an engaging and authentic way.`
        },
        {
          role: "user", 
          content: `Create a short response (max 100 characters) to this Instagram comment: "${comment}".
                   Also analyze if the comment is positive, neutral, or negative.`
        }
      ],
      temperature: 0.7,
    });

    const content = completion.choices[0]?.message?.content || '';
    
    // Parse response and sentiment
    const response = content.split('\n')[0]?.replace(/^Response: /i, '') || '';
    let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
    
    if (content.toLowerCase().includes('positive')) {
      sentiment = 'positive';
    } else if (content.toLowerCase().includes('negative')) {
      sentiment = 'negative';
    }

    return {
      response,
      sentiment
    };
  }

  private async analyzeSentimentWithOpenAI(text: string): Promise<'positive' | 'neutral' | 'negative'> {
    if (!this.openai) {
      throw new Error('OpenAI not initialized');
    }

    const completion = await this.openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a sentiment analysis AI. Classify text as positive, neutral, or negative.
                   Respond with only one word: positive, neutral, or negative.`
        },
        {
          role: "user", 
          content: `Analyze the sentiment of this text: "${text}"`
        }
      ],
      temperature: 0.1,
    });

    const sentiment = completion.choices[0]?.message?.content?.toLowerCase().trim() || 'neutral';
    
    if (sentiment.includes('positive')) {
      return 'positive';
    } else if (sentiment.includes('negative')) {
      return 'negative';
    } else {
      return 'neutral';
    }
  }
  
  private async generateSuggestionsWithOpenAI(
    context: string,
    contentType: string,
    count: number
  ): Promise<AISuggestionResponse> {
    if (!this.openai) {
      throw new Error('OpenAI not initialized');
    }

    const completion = await this.openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are an Instagram content expert specializing in ${contentType} content.
                   Your task is to provide concise, creative suggestions to improve the user's content.
                   Each suggestion should be specific, actionable, and under 100 characters.`
        },
        {
          role: "user", 
          content: `Based on this Instagram content: "${context}"
                   Give me exactly ${count} quick suggestions to improve this content.
                   Format each suggestion as a separate line with no numbering or bullets.
                   Keep each suggestion concise and specific.`
        }
      ],
      temperature: 0.7,
    });

    const content = completion.choices[0]?.message?.content || '';
    
    // Parse suggestions - one per line
    const suggestions = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .slice(0, count); // Ensure we only return the requested number

    return { suggestions };
  }

  // Gemini implementations
  private async generateContentWithGemini(
    prompt: string,
    brandVoice: string,
    contentType: string,
    keyMessage: string
  ): Promise<AIContentResponse> {
    if (!this.gemini) {
      throw new Error('Gemini not initialized');
    }

    const model = this.gemini.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    const result = await model.generateContent(
      `You are an Instagram content creator with expertise in ${contentType} content. 
       You write in a ${brandVoice} tone. Generate an engaging Instagram caption for a ${contentType} 
       post about ${keyMessage}. Include 5-7 relevant hashtags. Keep the caption under 250 characters.`
    );
    
    const text = result.response.text();
    
    // Parse caption and hashtags from the AI response
    const parts = text.split(/(\#[^\s#]+)/g);
    const caption = parts[0].trim();
    const hashtags = parts.slice(1).filter(p => p.startsWith('#')).map(tag => tag.substring(1));

    return {
      caption,
      hashtags,
      mediaUrl: null // Gemini doesn't generate images through this method
    };
  }

  private async generateEngagementWithGemini(
    comment: string,
    brandVoice: string
  ): Promise<AIEngagementResponse> {
    if (!this.gemini) {
      throw new Error('Gemini not initialized');
    }

    const model = this.gemini.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    const result = await model.generateContent(
      `You are a social media manager with a ${brandVoice} tone. 
       Create a short response (max 100 characters) to this Instagram comment: "${comment}".
       Also analyze if the comment is positive, neutral, or negative.`
    );
    
    const text = result.response.text();
    
    // Parse response and sentiment
    const response = text.split('\n')[0]?.replace(/^Response: /i, '') || '';
    let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
    
    if (text.toLowerCase().includes('positive')) {
      sentiment = 'positive';
    } else if (text.toLowerCase().includes('negative')) {
      sentiment = 'negative';
    }

    return {
      response,
      sentiment
    };
  }

  private async analyzeSentimentWithGemini(text: string): Promise<'positive' | 'neutral' | 'negative'> {
    if (!this.gemini) {
      throw new Error('Gemini not initialized');
    }

    const model = this.gemini.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    const result = await model.generateContent(
      `Analyze the sentiment of this text: "${text}". 
       Respond with only one word: positive, neutral, or negative.`
    );
    
    const sentiment = result.response.text().toLowerCase().trim();
    
    if (sentiment.includes('positive')) {
      return 'positive';
    } else if (sentiment.includes('negative')) {
      return 'negative';
    } else {
      return 'neutral';
    }
  }
  
  private async generateSuggestionsWithGemini(
    context: string,
    contentType: string,
    count: number
  ): Promise<AISuggestionResponse> {
    if (!this.gemini) {
      throw new Error('Gemini not initialized');
    }

    const model = this.gemini.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    const result = await model.generateContent(
      `You are an Instagram content expert specializing in ${contentType} content.
       Based on this Instagram content: "${context}"
       Give me exactly ${count} quick suggestions to improve this content.
       Format each suggestion as a separate line with no numbering or bullets.
       Keep each suggestion concise (under 100 characters) and specific.`
    );
    
    const text = result.response.text();
    
    // Parse suggestions - one per line
    const suggestions = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .slice(0, count); // Ensure we only return the requested number

    return { suggestions };
  }

  // HuggingFace implementations
  private async generateContentWithHuggingFace(
    prompt: string,
    brandVoice: string,
    contentType: string,
    keyMessage: string
  ): Promise<AIContentResponse> {
    const promptText = `You are an Instagram content creator with expertise in ${contentType} content. 
      You write in a ${brandVoice} tone. Generate an engaging Instagram caption for a ${contentType} 
      post about ${keyMessage}. Include 5-7 relevant hashtags. Keep the caption under 250 characters.`;
    
    try {
      const text = await huggingFaceService.generateText({
        prompt: promptText,
        maxTokens: 200,
        temperature: 0.7
      });
      
      // Parse caption and hashtags from the AI response
      const parts = text.split(/(\#[^\s#]+)/g);
      const caption = parts[0].trim();
      const hashtags = parts.slice(1).filter(p => p.startsWith('#')).map(tag => tag.substring(1));
      
      return {
        caption,
        hashtags,
        mediaUrl: null
      };
    } catch (error: any) {
      throw new Error(`HuggingFace content generation failed: ${error.message}`);
    }
  }

  private async generateEngagementWithHuggingFace(
    comment: string,
    brandVoice: string
  ): Promise<AIEngagementResponse> {
    const promptText = `You are a social media manager with a ${brandVoice} tone. 
      Create a short response (max 100 characters) to this Instagram comment: "${comment}".
      Also analyze if the comment is positive, neutral, or negative.`;
    
    try {
      const text = await huggingFaceService.generateText({
        prompt: promptText,
        maxTokens: 150,
        temperature: 0.7
      });
      
      // Parse response and sentiment
      const response = text.split('\n')[0]?.replace(/^Response: /i, '') || '';
      let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
      
      if (text.toLowerCase().includes('positive')) {
        sentiment = 'positive';
      } else if (text.toLowerCase().includes('negative')) {
        sentiment = 'negative';
      }
      
      return {
        response,
        sentiment
      };
    } catch (error: any) {
      throw new Error(`HuggingFace engagement generation failed: ${error.message}`);
    }
  }

  private async analyzeSentimentWithHuggingFace(text: string): Promise<'positive' | 'neutral' | 'negative'> {
    try {
      const result = await huggingFaceService.analyzeSentiment({
        text: text
      });
      
      // Map the sentiment label to our standardized format
      if (result.label.toLowerCase().includes('positive')) {
        return 'positive';
      } else if (result.label.toLowerCase().includes('negative')) {
        return 'negative';
      } else {
        return 'neutral';
      }
    } catch (error) {
      console.error('HuggingFace sentiment analysis error:', error);
      return 'neutral'; // Default to neutral on error
    }
  }
  
  private async generateSuggestionsWithHuggingFace(
    context: string,
    contentType: string,
    count: number
  ): Promise<AISuggestionResponse> {
    const promptText = `You are an Instagram content expert specializing in ${contentType} content.
      Based on this Instagram content: "${context}"
      Give me exactly ${count} quick suggestions to improve this content.
      Format each suggestion as a separate line with no numbering or bullets.
      Keep each suggestion concise (under 100 characters) and specific.`;
    
    try {
      const text = await huggingFaceService.generateText({
        prompt: promptText,
        maxTokens: 250,
        temperature: 0.7
      });
      
      // Parse suggestions - one per line
      const suggestions = text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .slice(0, count); // Ensure we only return the requested number
      
      return { suggestions };
    } catch (error: any) {
      throw new Error(`HuggingFace suggestion generation failed: ${error.message}`);
    }
  }
}

// Export a singleton instance
export const aiService = new AIService();