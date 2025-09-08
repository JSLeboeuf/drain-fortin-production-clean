/**
 * Integration Testing Helpers
 * End-to-end and integration test utilities
 */

import { logger } from '@/lib/logger';

// API testing client
export class APITester {
  private baseURL: string;
  private headers: HeadersInit = {};
  private cookies: Map<string, string> = new Map();

  constructor(baseURL = 'http://localhost:3000') {
    this.baseURL = baseURL;
  }

  setAuth(token: string): void {
    this.headers['Authorization'] = `Bearer ${token}`;
  }

  setCookie(name: string, value: string): void {
    this.cookies.set(name, value);
  }

  private buildHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...this.headers
    };

    if (this.cookies.size > 0) {
      headers['Cookie'] = Array.from(this.cookies)
        .map(([name, value]) => `${name}=${value}`)
        .join('; ');
    }

    return headers;
  }

  async request<T = any>(
    path: string,
    options: RequestInit = {}
  ): Promise<{ data: T; status: number; headers: Headers }> {
    const url = `${this.baseURL}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.buildHeaders(),
        ...options.headers
      }
    });

    const data = await response.json();
    
    return {
      data,
      status: response.status,
      headers: response.headers
    };
  }

  async get<T = any>(path: string): Promise<T> {
    const { data } = await this.request<T>(path, { method: 'GET' });
    return data;
  }

  async post<T = any>(path: string, body: any): Promise<T> {
    const { data } = await this.request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body)
    });
    return data;
  }

  async put<T = any>(path: string, body: any): Promise<T> {
    const { data } = await this.request<T>(path, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
    return data;
  }

  async delete<T = any>(path: string): Promise<T> {
    const { data } = await this.request<T>(path, { method: 'DELETE' });
    return data;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Database test utilities
export class TestDatabase {
  private data = new Map<string, Map<string, any>>();
  private transactions: Array<() => void> = [];

  seed(collection: string, items: any[]): void {
    const collectionData = new Map<string, any>();
    items.forEach(item => {
      collectionData.set(item.id || String(Date.now()), item);
    });
    this.data.set(collection, collectionData);
  }

  async find(collection: string, query: Partial<any> = {}): Promise<any[]> {
    const collectionData = this.data.get(collection);
    if (!collectionData) return [];

    const results = Array.from(collectionData.values()).filter(item => {
      return Object.entries(query).every(([key, value]) => item[key] === value);
    });

    return results;
  }

  async findOne(collection: string, query: Partial<any>): Promise<any | null> {
    const results = await this.find(collection, query);
    return results[0] || null;
  }

  async insert(collection: string, item: any): Promise<void> {
    if (!this.data.has(collection)) {
      this.data.set(collection, new Map());
    }
    
    const id = item.id || String(Date.now());
    this.data.get(collection)!.set(id, { ...item, id });
    
    this.transactions.push(() => {
      this.data.get(collection)?.delete(id);
    });
  }

  async update(collection: string, id: string, updates: Partial<any>): Promise<void> {
    const collectionData = this.data.get(collection);
    if (!collectionData) return;
    
    const existing = collectionData.get(id);
    if (!existing) return;
    
    const oldData = { ...existing };
    collectionData.set(id, { ...existing, ...updates });
    
    this.transactions.push(() => {
      collectionData.set(id, oldData);
    });
  }

  async delete(collection: string, id: string): Promise<void> {
    const collectionData = this.data.get(collection);
    if (!collectionData) return;
    
    const existing = collectionData.get(id);
    if (!existing) return;
    
    collectionData.delete(id);
    
    this.transactions.push(() => {
      collectionData.set(id, existing);
    });
  }

  rollback(): void {
    while (this.transactions.length > 0) {
      const transaction = this.transactions.pop()!;
      transaction();
    }
  }

  clear(): void {
    this.data.clear();
    this.transactions = [];
  }

  getStats(): { collections: number; totalRecords: number } {
    let totalRecords = 0;
    this.data.forEach(collection => {
      totalRecords += collection.size;
    });
    
    return {
      collections: this.data.size,
      totalRecords
    };
  }
}

// WebSocket testing
export class WebSocketTester {
  private ws: WebSocket | null = null;
  private messages: any[] = [];
  private listeners = new Map<string, Set<(data: any) => void>>();

  connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url);
      
      this.ws.onopen = () => resolve();
      this.ws.onerror = (error) => reject(error);
      
      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.messages.push(data);
        
        // Notify listeners
        const eventListeners = this.listeners.get(data.type || 'message');
        eventListeners?.forEach(listener => listener(data));
      };
    });
  }

  send(data: any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }
    
    this.ws.send(JSON.stringify(data));
  }

  on(event: string, handler: (data: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    
    this.listeners.get(event)!.add(handler);
    
    return () => {
      this.listeners.get(event)?.delete(handler);
    };
  }

  async waitForMessage(
    predicate: (msg: any) => boolean,
    timeout = 5000
  ): Promise<any> {
    const existing = this.messages.find(predicate);
    if (existing) return existing;
    
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Timeout waiting for message'));
      }, timeout);
      
      const cleanup = this.on('message', (data) => {
        if (predicate(data)) {
          clearTimeout(timeoutId);
          cleanup();
          resolve(data);
        }
      });
    });
  }

  getMessages(): any[] {
    return [...this.messages];
  }

  clearMessages(): void {
    this.messages = [];
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.clearMessages();
    this.listeners.clear();
  }
}

// User flow testing
export class UserFlowTester {
  private steps: Array<{
    name: string;
    action: () => Promise<void>;
    validate?: () => Promise<void>;
  }> = [];
  private results: Array<{
    step: string;
    success: boolean;
    duration: number;
    error?: Error;
  }> = [];

  addStep(
    name: string,
    action: () => Promise<void>,
    validate?: () => Promise<void>
  ): void {
    this.steps.push({ name, action, validate });
  }

  async run(): Promise<void> {
    for (const step of this.steps) {
      const startTime = performance.now();
      
      try {
        await step.action();
        
        if (step.validate) {
          await step.validate();
        }
        
        this.results.push({
          step: step.name,
          success: true,
          duration: performance.now() - startTime
        });
      } catch (error) {
        this.results.push({
          step: step.name,
          success: false,
          duration: performance.now() - startTime,
          error: error as Error
        });
        
        throw new Error(`Flow failed at step "${step.name}": ${(error as Error).message}`);
      }
    }
  }

  getResults(): typeof this.results {
    return [...this.results];
  }

  getReport(): string {
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
    const successCount = this.results.filter(r => r.success).length;
    
    const lines = [
      `User Flow Test Report`,
      `=====================`,
      `Total Steps: ${this.results.length}`,
      `Successful: ${successCount}`,
      `Failed: ${this.results.length - successCount}`,
      `Total Duration: ${totalDuration.toFixed(2)}ms`,
      ``,
      `Step Details:`,
      ...this.results.map(r => 
        `  ${r.success ? '✓' : '✗'} ${r.step} (${r.duration.toFixed(2)}ms)${
          r.error ? ` - ${r.error.message}` : ''
        }`
      )
    ];
    
    return lines.join('\n');
  }

  reset(): void {
    this.steps = [];
    this.results = [];
  }
}

// Environment manager for tests
export class TestEnvironment {
  private originalEnv: NodeJS.ProcessEnv = {};
  private mocks = new Map<string, any>();
  private timers: { fake: boolean; time: number } = { fake: false, time: 0 };

  setup(): void {
    // Save original environment
    this.originalEnv = { ...process.env };
    
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.CI = 'true';
  }

  setEnv(key: string, value: string): void {
    process.env[key] = value;
  }

  mockGlobal(key: string, value: any): void {
    const original = (global as any)[key];
    this.mocks.set(key, original);
    (global as any)[key] = value;
  }

  useFakeTimers(): void {
    this.timers.fake = true;
    this.timers.time = Date.now();
  }

  advanceTime(ms: number): void {
    if (!this.timers.fake) {
      throw new Error('Fake timers not enabled');
    }
    this.timers.time += ms;
  }

  cleanup(): void {
    // Restore environment
    process.env = { ...this.originalEnv };
    
    // Restore mocked globals
    this.mocks.forEach((original, key) => {
      (global as any)[key] = original;
    });
    this.mocks.clear();
    
    // Reset timers
    this.timers = { fake: false, time: 0 };
  }
}

// Test data factory
export class TestDataFactory {
  private sequences = new Map<string, number>();

  sequence(name: string): number {
    const current = this.sequences.get(name) || 0;
    this.sequences.set(name, current + 1);
    return current + 1;
  }

  uuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  email(prefix = 'user'): string {
    return `${prefix}${this.sequence('email')}@test.com`;
  }

  phoneNumber(): string {
    return `555-${String(this.sequence('phone')).padStart(4, '0')}`;
  }

  date(daysFromNow = 0): Date {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date;
  }

  randomString(length = 10): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    return Array.from({ length }, () => 
      chars[Math.floor(Math.random() * chars.length)]
    ).join('');
  }

  randomNumber(min = 0, max = 100): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  randomBoolean(probability = 0.5): boolean {
    return Math.random() < probability;
  }

  randomChoice<T>(choices: T[]): T {
    return choices[Math.floor(Math.random() * choices.length)];
  }

  reset(): void {
    this.sequences.clear();
  }
}