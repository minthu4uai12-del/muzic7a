import { GenerationOptions, KieAIResponse } from '../types/music';

class SunoAPI {
  private apiKeys: string[] = [];
  private currentKeyIndex: number = 0;
  private baseUrl: string = 'https://api.kie.ai/api/v1';
  private keyUsage: Map<string, { count: number; resetTime: number; lastUsed: number }> = new Map();
  private maxRequestsPerKey: number = 100; // Requests per hour per key
  private resetInterval: number = 60 * 60 * 1000; // 1 hour
  private keyRotationDelay: number = 2000; // 2 seconds between key switches

  constructor(apiKeys?: string | string[]) {
    // Initialize with provided keys or load from environment
    if (apiKeys) {
      this.apiKeys = Array.isArray(apiKeys) ? apiKeys : [apiKeys];
    } else {
      this.loadApiKeysFromEnvironment();
    }
    
    this.initializeKeyUsageTracking();
    console.log(`🔑 Initialized SunoAPI with ${this.apiKeys.length} API keys`);
  }

  private loadApiKeysFromEnvironment(): void {
    // Try to load multiple keys from environment variables
    const keys: string[] = [];
    
    // Check for multiple key format: MUSIC_AI_API_KEY_1, MUSIC_AI_API_KEY_2, etc.
    for (let i = 1; i <= 20; i++) {
      const key = import.meta.env[`VITE_MUSIC_AI_API_KEY_${i}`];
      if (key && key.trim()) {
        keys.push(key.trim());
      }
    }
    
    // Fallback to single key
    if (keys.length === 0) {
      const singleKey = import.meta.env.VITE_MUSIC_AI_API_KEY;
      if (singleKey && singleKey.trim()) {
        keys.push(singleKey.trim());
      }
    }
    
    // Default fallback key if no environment variables
    if (keys.length === 0) {
      keys.push('4f52e3f37a67bb5aed649a471e9989b9'); // Fallback key
    }
    
    this.apiKeys = keys;
    console.log(`🔑 Loaded ${this.apiKeys.length} API keys from environment variables`);
  }

  private initializeKeyUsageTracking(): void {
    this.apiKeys.forEach((key, index) => {
      this.keyUsage.set(key, { 
        count: 0, 
        resetTime: Date.now() + this.resetInterval,
        lastUsed: 0
      });
    });
  }

  private getNextAvailableKey(): { key: string; index: number } {
    const now = Date.now();
    
    // Reset usage counters for keys whose reset time has passed
    this.keyUsage.forEach((usage, key) => {
      if (now >= usage.resetTime) {
        this.keyUsage.set(key, { 
          count: 0, 
          resetTime: now + this.resetInterval,
          lastUsed: usage.lastUsed
        });
      }
    });
    
    // Strategy 1: Find a key that hasn't hit the rate limit and hasn't been used recently
    for (let i = 0; i < this.apiKeys.length; i++) {
      const keyIndex = (this.currentKeyIndex + i) % this.apiKeys.length;
      const key = this.apiKeys[keyIndex];
      const usage = this.keyUsage.get(key)!;
      
      // Check if key is available (under rate limit and not used recently)
      const isUnderRateLimit = usage.count < this.maxRequestsPerKey;
      const hasDelayPassed = (now - usage.lastUsed) >= this.keyRotationDelay;
      
      if (isUnderRateLimit && hasDelayPassed) {
        this.currentKeyIndex = keyIndex;
        console.log(`🔄 Using API key ${keyIndex + 1}/${this.apiKeys.length} (Usage: ${usage.count}/${this.maxRequestsPerKey})`);
        return { key, index: keyIndex };
      }
    }
    
    // Strategy 2: If all keys are recently used, find the one with lowest usage
    let bestKey = this.apiKeys[0];
    let bestIndex = 0;
    let lowestUsage = this.keyUsage.get(bestKey)!.count;
    
    this.apiKeys.forEach((key, index) => {
      const usage = this.keyUsage.get(key)!;
      if (usage.count < lowestUsage) {
        bestKey = key;
        bestIndex = index;
        lowestUsage = usage.count;
      }
    });
    
    this.currentKeyIndex = bestIndex;
    console.log(`⚠️ All keys recently used, selecting key ${bestIndex + 1} with lowest usage: ${lowestUsage}`);
    return { key: bestKey, index: bestIndex };
  }

  private incrementKeyUsage(apiKey: string): void {
    const usage = this.keyUsage.get(apiKey);
    if (usage) {
      usage.count++;
      usage.lastUsed = Date.now();
      console.log(`📊 API key usage updated: ${usage.count}/${this.maxRequestsPerKey}`);
    }
  }

  private async makeRequestWithRetry(url: string, options: RequestInit, maxRetries: number = 3): Promise<Response> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const { key, index } = this.getNextAvailableKey();
        
        const headers = {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
          'User-Agent': 'MuzAI-Client/1.0',
          ...options.headers
        };
        
        const response = await fetch(url, { ...options, headers });
        
        // Increment usage on successful request
        this.incrementKeyUsage(key);
        
        // Check for rate limiting
        if (response.status === 429) {
          console.warn(`⚠️ Rate limited on key ${index + 1}, trying next key...`);
          // Mark this key as temporarily exhausted
          const usage = this.keyUsage.get(key)!;
          usage.count = this.maxRequestsPerKey;
          continue;
        }
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return response;
        
      } catch (error) {
        lastError = error as Error;
        console.error(`❌ Request failed on attempt ${attempt + 1}:`, error);
        
        // If this is the last attempt, throw the error
        if (attempt === maxRetries - 1) {
          break;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
    
    throw lastError || new Error('All retry attempts failed');
  }

  private async makeRequest(url: string, options: RequestInit): Promise<Response> {
    return this.makeRequestWithRetry(url, options);
  }

  // Add method to manually add API keys
  addApiKey(apiKey: string): void {
    if (!this.apiKeys.includes(apiKey)) {
      this.apiKeys.push(apiKey);
      this.keyUsage.set(apiKey, { 
        count: 0, 
        resetTime: Date.now() + this.resetInterval,
        lastUsed: 0
      });
      console.log(`✅ Added new API key. Total keys: ${this.apiKeys.length}`);
    }
  }

  // Add method to remove API keys
  removeApiKey(apiKey: string): void {
    const index = this.apiKeys.indexOf(apiKey);
    if (index > -1) {
      this.apiKeys.splice(index, 1);
      this.keyUsage.delete(apiKey);
      console.log(`🗑️ Removed API key. Total keys: ${this.apiKeys.length}`);
    }
  }

  // Get current API key statistics
  getApiKeyStats(): Array<{ 
    index: number; 
    usage: number; 
    maxUsage: number; 
    resetTime: Date; 
    isActive: boolean;
    lastUsed: Date | null;
  }> {
    return this.apiKeys.map((key, index) => {
      const usage = this.keyUsage.get(key)!;
      return {
        index: index + 1,
        usage: usage.count,
        maxUsage: this.maxRequestsPerKey,
        resetTime: new Date(usage.resetTime),
        isActive: usage.count < this.maxRequestsPerKey,
        lastUsed: usage.lastUsed > 0 ? new Date(usage.lastUsed) : null
      };
    });
  }

  // Get total available generations across all keys
  getTotalAvailableGenerations(): number {
    const now = Date.now();
    let total = 0;
    
    this.keyUsage.forEach((usage) => {
      // Reset if time has passed
      if (now >= usage.resetTime) {
        total += this.maxRequestsPerKey;
      } else {
        total += Math.max(0, this.maxRequestsPerKey - usage.count);
      }
    });
    
    return total;
  }
  
  async generateMusic(prompt: string, options: GenerationOptions = {}): Promise<string> {
    console.log(`🎵 Starting music generation with prompt: "${prompt.substring(0, 50)}..."`);
    
    const response = await this.makeRequest(`${this.baseUrl}/generate`, {
      method: 'POST',
      body: JSON.stringify({
        prompt,
        customMode: options.customMode || false,
        instrumental: options.instrumental || false,
        model: options.model || 'V3_5',
        style: options.style,
        title: options.title,
        negativeTags: options.negativeTags,
        callBackUrl: 'https://muzai-callback.netlify.app/callback'
      })
    });
    
    const result: KieAIResponse = await response.json();
    if (result.code !== 200) {
      throw new Error(`Generation failed: ${result.msg}`);
    }
    
    console.log(`✅ Generation started successfully. Task ID: ${result.data.taskId}`);
    return result.data.taskId!;
  }
  
  async extendMusic(audioId: string, options: any = {}): Promise<string> {
    const response = await this.makeRequest(`${this.baseUrl}/generate/extend`, {
      method: 'POST',
      body: JSON.stringify({
        audioId,
        defaultParamFlag: options.defaultParamFlag || false,
        model: options.model || 'V3_5',
        prompt: options.prompt,
        style: options.style,
        title: options.title,
        continueAt: options.continueAt,
        callBackUrl: 'https://muzai-callback.netlify.app/callback'
      })
    });
    
    const result: KieAIResponse = await response.json();
    if (result.code !== 200) {
      throw new Error(`Extension failed: ${result.msg}`);
    }
    
    return result.data.taskId!;
  }
  
  async generateLyrics(prompt: string, callBackUrl: string): Promise<string> {
    const response = await this.makeRequest(`${this.baseUrl}/lyrics`, {
      method: 'POST',
      body: JSON.stringify({
        prompt,
        callBackUrl: callBackUrl || 'https://muzai-callback.netlify.app/callback'
      })
    });
    
    const result: KieAIResponse = await response.json();
    if (result.code !== 200) {
      throw new Error(`Lyrics generation failed: ${result.msg}`);
    }
    
    return result.data.taskId!;
  }
  
  async waitForCompletion(taskId: string, maxWaitTime: number = 600000): Promise<any> {
    const startTime = Date.now();
    console.log(`⏳ Waiting for completion of task: ${taskId}`);
    
    while (Date.now() - startTime < maxWaitTime) {
      const status = await this.getTaskStatus(taskId);
      
      if (status.status === 'SUCCESS') {
        return status.response;
      } else if (status.status?.includes('FAILED') || status.status === 'SENSITIVE_WORD_ERROR') {
        throw new Error(`Generation failed: ${status.errorMessage || status.status}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 8000)); // Check every 8 seconds
    }
    
    throw new Error('Generation timeout');
  }
  
  async getTaskStatus(taskId: string): Promise<any> {
    const response = await this.makeRequest(`${this.baseUrl}/generate/record-info?taskId=${taskId}`, {
      method: 'GET'
    });
    
    const result: KieAIResponse = await response.json();
    return result.data;
  }
}

export default SunoAPI;