import { HfInference } from '@huggingface/inference';

export interface HuggingFaceTextGenerationOptions {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  repetitionPenalty?: number;
}

export interface HuggingFaceImageCaptionOptions {
  imageUrl: string;
  model?: string;
}

export interface HuggingFaceSentimentAnalysisOptions {
  text: string;
  model?: string;
}

export interface HuggingFaceDatasetSearchOptions {
  query: string;
  limit?: number;
}

export interface HuggingFaceDatasetSampleOptions {
  datasetId: string;
  split?: string;
  sampleCount?: number;
}

export interface HuggingFaceImageGenerationOptions {
  prompt: string;
  style?: string;
  width?: number;
  height?: number;
  negativePrompt?: string;
}

export interface ImageGenerationResult {
  url: string;
  error?: string;
}

// Dataset information
export interface DatasetInfo {
  id: string;
  name: string;
  description: string;
  tags: string[];
  downloads: number;
  likes: number;
}

/**
 * Service wrapper for Hugging Face Inference API
 * Provides methods for text generation, image captioning, and sentiment analysis
 */
export class HuggingFaceService {
  private hf: HfInference | null = null;

  constructor() {
    this.init();
  }

  /**
   * Initialize Hugging Face client with API key
   */
  private init() {
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    if (!apiKey) {
      console.error("Missing Hugging Face API key");
      return;
    }

    try {
      this.hf = new HfInference(apiKey);
      console.log("Hugging Face client initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Hugging Face client:", error);
    }
  }

  /**
   * Generate text using a specified model
   * 
   * @param options Text generation parameters
   * @param modelId Optional model ID, defaults to meta-llama/Llama-2-7b-chat-hf
   * @returns Generated text or error message
   */
  public async generateText(options: HuggingFaceTextGenerationOptions, modelId: string = "meta-llama/Llama-2-7b-chat-hf"): Promise<string> {
    if (!this.hf) {
      throw new Error("Hugging Face client not initialized");
    }

    try {
      const result = await this.hf.textGeneration({
        model: modelId,
        inputs: options.prompt,
        parameters: {
          max_new_tokens: options.maxTokens || 100,
          temperature: options.temperature || 0.7,
          top_p: options.topP || 0.95,
          repetition_penalty: options.repetitionPenalty || 1.1,
        }
      });

      return result.generated_text || "";
    } catch (error) {
      console.error("Error generating text with Hugging Face:", error);
      throw new Error(`Text generation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Generate captions for images
   * 
   * @param options Image captioning parameters
   * @returns Caption text or error message
   */
  public async captionImage(options: HuggingFaceImageCaptionOptions): Promise<string> {
    if (!this.hf) {
      throw new Error("Hugging Face client not initialized");
    }

    const modelId = options.model || "Salesforce/blip-image-captioning-large";

    try {
      // For image captioning, we need to fetch the image first
      const imageResponse = await fetch(options.imageUrl);
      
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
      }
      
      const imageBlob = await imageResponse.blob();
      
      const result = await this.hf.imageToText({
        model: modelId,
        data: imageBlob,
      });

      return result.text || "No caption available";
    } catch (error) {
      console.error("Error captioning image with Hugging Face:", error);
      throw new Error(`Image captioning failed: ${(error as Error).message}`);
    }
  }

  /**
   * Analyze sentiment of text
   * 
   * @param options Sentiment analysis parameters
   * @returns Sentiment analysis result or error message
   */
  public async analyzeSentiment(options: HuggingFaceSentimentAnalysisOptions): Promise<{ label: string; score: number }> {
    if (!this.hf) {
      throw new Error("Hugging Face client not initialized");
    }

    const modelId = options.model || "distilbert-base-uncased-finetuned-sst-2-english";

    try {
      const result = await this.hf.textClassification({
        model: modelId,
        inputs: options.text,
      });

      return {
        label: result[0].label,
        score: result[0].score,
      };
    } catch (error) {
      console.error("Error analyzing sentiment with Hugging Face:", error);
      throw new Error(`Sentiment analysis failed: ${(error as Error).message}`);
    }
  }

  /**
   * Check if a specific model exists and is available
   * 
   * @param modelId The ID of the model to check
   * @returns Boolean indicating if model is available
   */
  public async isModelAvailable(modelId: string): Promise<boolean> {
    if (!this.hf) {
      throw new Error("Hugging Face client not initialized");
    }

    try {
      // This is a simple way to check if a model exists by trying to fetch its info
      await this.hf.textGeneration({
        model: modelId,
        inputs: "test",
        parameters: {
          max_new_tokens: 1
        }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Search for datasets on Hugging Face
   * 
   * @param options Search options
   * @returns Array of dataset information
   */
  public async searchDatasets(options: HuggingFaceDatasetSearchOptions): Promise<DatasetInfo[]> {
    if (!process.env.HUGGINGFACE_API_KEY) {
      throw new Error("Missing Hugging Face API key");
    }
    
    try {
      const limit = options.limit || 10;
      const response = await fetch(
        `https://huggingface.co/api/datasets?search=${encodeURIComponent(options.query)}&limit=${limit}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to search datasets: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Map the response to our DatasetInfo type
      return data.map((item: any) => ({
        id: item.id,
        name: item.name || item.id,
        description: item.description || "",
        tags: item.tags || [],
        downloads: item.downloads || 0,
        likes: item.likes || 0
      }));
    } catch (error) {
      console.error("Error searching Hugging Face datasets:", error);
      throw new Error(`Dataset search failed: ${(error as Error).message}`);
    }
  }
  
  /**
   * Get EasyNegative dataset information
   * 
   * @returns Dataset information about EasyNegative
   */
  public async getEasyNegativeDataset(): Promise<DatasetInfo> {
    try {
      // Fetch the specific dataset information for EasyNegative
      const response = await fetch(
        "https://huggingface.co/api/datasets/gsdf/EasyNegative",
        {
          headers: {
            Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to get EasyNegative dataset: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      return {
        id: data.id,
        name: data.name || "EasyNegative",
        description: data.description || "A dataset of negative prompts for image generation",
        tags: data.tags || [],
        downloads: data.downloads || 0,
        likes: data.likes || 0
      };
    } catch (error) {
      console.error("Error fetching EasyNegative dataset:", error);
      throw new Error(`Failed to fetch EasyNegative dataset: ${(error as Error).message}`);
    }
  }
  
  /**
   * Get samples from a dataset
   * 
   * @param options Dataset sample options
   * @returns Array of dataset samples
   */
  public async getDatasetSamples(options: HuggingFaceDatasetSampleOptions): Promise<any[]> {
    if (!process.env.HUGGINGFACE_API_KEY) {
      throw new Error("Missing Hugging Face API key");
    }
    
    try {
      const split = options.split || "train";
      const count = options.sampleCount || 5;
      
      // Construct the URL for the dataset samples API
      const response = await fetch(
        `https://huggingface.co/api/datasets/${options.datasetId}/sample?split=${split}&limit=${count}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to get dataset samples: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error fetching samples from dataset ${options.datasetId}:`, error);
      throw new Error(`Dataset sample fetch failed: ${(error as Error).message}`);
    }
  }
  
  /**
   * Get EasyNegative dataset samples for content filtering
   * 
   * @param count Number of samples to return
   * @returns Array of negative prompts
   */
  public async getEasyNegativeSamples(count: number = 10): Promise<string[]> {
    try {
      const samples = await this.getDatasetSamples({
        datasetId: "gsdf/EasyNegative",
        sampleCount: count
      });
      
      // Extract the negative prompts from the samples
      // The structure depends on the dataset format
      return samples.map(sample => {
        // Adapt this based on the actual structure of the EasyNegative dataset
        if (typeof sample === 'string') {
          return sample;
        } else if (sample.prompt) {
          return sample.prompt;
        } else if (sample.text) {
          return sample.text;
        } else {
          // Fallback if the structure is different
          return JSON.stringify(sample);
        }
      });
    } catch (error) {
      console.error("Error fetching EasyNegative samples:", error);
      // Return an empty array on error
      return [];
    }
  }
  
  /**
   * Generate an image based on a text prompt
   * 
   * @param options Image generation parameters
   * @returns Object containing the image URL or error message
   */
  public async generateImage(options: HuggingFaceImageGenerationOptions): Promise<ImageGenerationResult> {
    if (!process.env.HUGGINGFACE_API_KEY) {
      return { url: "", error: "Missing Hugging Face API key" };
    }
    
    if (!this.hf) {
      return { url: "", error: "Hugging Face client not initialized" };
    }
    
    // Select appropriate model based on style
    let modelId = "stabilityai/stable-diffusion-xl-base-1.0";
    if (options.style === "anime") {
      modelId = "Linaqruf/anything-v3.0";
    } else if (options.style === "artistic") {
      modelId = "prompthero/openjourney-v4";
    } else if (options.style === "realistic") {
      modelId = "stabilityai/stable-diffusion-xl-base-1.0";
    }
    
    try {
      // Get negative prompt for better results
      let negativePrompt = options.negativePrompt || "";
      if (!negativePrompt) {
        try {
          const negatives = await this.getEasyNegativeSamples(1);
          if (negatives.length > 0) {
            negativePrompt = negatives[0];
          }
        } catch (e) {
          // If we can't get a negative prompt, just continue without it
          console.warn("Could not fetch negative prompt:", e);
        }
      }
      
      const width = options.width || 512;
      const height = options.height || 512;
      
      // Format the prompt with style guidance
      let enhancedPrompt = options.prompt;
      if (options.style === "anime") {
        enhancedPrompt = `${options.prompt}, anime style, detailed, vibrant colors`;
      } else if (options.style === "artistic") {
        enhancedPrompt = `${options.prompt}, mdjrny-v4 style, artistic, detailed, trending on artstation`;
      } else if (options.style === "realistic") {
        enhancedPrompt = `${options.prompt}, realistic, detailed, photorealistic, 8k, high quality`;
      }
      
      // Text to image generation
      const result = await this.hf.textToImage({
        model: modelId,
        inputs: enhancedPrompt,
        parameters: {
          negative_prompt: negativePrompt,
          width,
          height,
          guidance_scale: 7.5, // Controls how closely the image follows the prompt
          num_inference_steps: 30 // More steps = better quality but slower
        }
      });
      
      // Convert blob to base64 string
      const buffer = Buffer.from(await result.arrayBuffer());
      const base64Image = buffer.toString('base64');
      
      // Simulate a URL - in a real app you'd upload this to cloud storage
      // and return the URL
      const url = `data:image/jpeg;base64,${base64Image}`;
      
      return { url };
    } catch (error) {
      console.error("Error generating image with Hugging Face:", error);
      return { 
        url: "", 
        error: `Image generation failed: ${(error as Error).message}`
      };
    }
  }
}

// Create singleton instance
export const huggingFaceService = new HuggingFaceService();