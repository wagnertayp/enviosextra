import { 
  users, type User, type InsertUser,
  candidates, type Candidate, type InsertCandidate,
  states, type State, type InsertState,
  benefits, type Benefit, type InsertBenefit,
  bannedIps, type BannedIp, type InsertBannedIp,
  allowedDomains, type AllowedDomain, type InsertAllowedDomain,
  bannedDevices, type BannedDevice, type InsertBannedDevice
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, sql, desc } from "drizzle-orm";

// Helper function to handle database operations with error handling
async function withDbErrorHandling<T>(
  operation: () => Promise<T>,
  operationName: string,
  fallbackValue?: T
): Promise<T | undefined> {
  try {
    return await operation();
  } catch (error) {
    console.error(`[DB] Error in ${operationName}:`, error);
    if (fallbackValue !== undefined) {
      return fallbackValue;
    }
    return undefined;
  }
}

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Candidate operations
  getCandidate(id: number): Promise<Candidate | undefined>;
  getCandidateByEmail(email: string): Promise<Candidate | undefined>;
  createCandidate(candidate: InsertCandidate): Promise<Candidate>;
  getAllCandidates(): Promise<Candidate[]>;
  
  // State operations
  getState(code: string): Promise<State | undefined>;
  getAllStates(): Promise<State[]>;
  getStatesWithVacancies(): Promise<State[]>;
  createState(state: InsertState): Promise<State>;
  
  // Benefit operations
  getBenefit(id: number): Promise<Benefit | undefined>;
  getAllBenefits(): Promise<Benefit[]>;
  createBenefit(benefit: InsertBenefit): Promise<Benefit>;
  
  // Banned IP operations
  getBannedIp(ip: string): Promise<BannedIp | undefined>;
  getAllBannedIps(): Promise<BannedIp[]>;
  createBannedIp(bannedIp: InsertBannedIp): Promise<BannedIp>;
  updateBannedIpStatus(ip: string, isBanned: boolean): Promise<BannedIp | undefined>;
  updateLastAccess(ip: string): Promise<void>;
  
  // Banned Device operations
  getBannedDevice(deviceId: string): Promise<BannedDevice | undefined>;
  getAllBannedDevices(): Promise<BannedDevice[]>;
  createBannedDevice(device: InsertBannedDevice): Promise<BannedDevice>;
  isBannedByDeviceId(deviceId: string): Promise<boolean>;
  
  // Allowed Domain operations
  getAllowedDomain(domain: string): Promise<AllowedDomain | undefined>;
  getAllAllowedDomains(): Promise<AllowedDomain[]>;
  createAllowedDomain(allowedDomain: InsertAllowedDomain): Promise<AllowedDomain>;
  updateAllowedDomainStatus(domain: string, isActive: boolean): Promise<AllowedDomain | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }
  
  // Candidate operations
  async getCandidate(id: number): Promise<Candidate | undefined> {
    const [candidate] = await db.select().from(candidates).where(eq(candidates.id, id));
    return candidate || undefined;
  }
  
  async getCandidateByEmail(email: string): Promise<Candidate | undefined> {
    const [candidate] = await db.select().from(candidates).where(eq(candidates.email, email));
    return candidate || undefined;
  }
  
  async createCandidate(insertCandidate: InsertCandidate): Promise<Candidate> {
    const [candidate] = await db
      .insert(candidates)
      .values(insertCandidate)
      .returning();
    return candidate;
  }
  
  async getAllCandidates(): Promise<Candidate[]> {
    return await db.select().from(candidates);
  }
  
  // State operations
  async getState(code: string): Promise<State | undefined> {
    const [state] = await db.select().from(states).where(eq(states.code, code));
    return state || undefined;
  }
  
  async getAllStates(): Promise<State[]> {
    return await db.select().from(states);
  }
  
  async getStatesWithVacancies(): Promise<State[]> {
    return await db.select().from(states).where(eq(states.hasVacancies, true));
  }
  
  async createState(insertState: InsertState): Promise<State> {
    const [state] = await db
      .insert(states)
      .values(insertState)
      .returning();
    return state;
  }
  
  // Benefit operations
  async getBenefit(id: number): Promise<Benefit | undefined> {
    const [benefit] = await db.select().from(benefits).where(eq(benefits.id, id));
    return benefit || undefined;
  }
  
  async getAllBenefits(): Promise<Benefit[]> {
    return await db.select().from(benefits);
  }
  
  async createBenefit(insertBenefit: InsertBenefit): Promise<Benefit> {
    const [benefit] = await db
      .insert(benefits)
      .values(insertBenefit)
      .returning();
    return benefit;
  }
  
  // Banned IP operations
  async getBannedIp(ip: string): Promise<BannedIp | undefined> {
    return withDbErrorHandling(async () => {
      const [bannedIp] = await db.select().from(bannedIps).where(eq(bannedIps.ip, ip));
      return bannedIp || undefined;
    }, 'getBannedIp');
  }
  
  async getAllBannedIps(): Promise<BannedIp[]> {
    return withDbErrorHandling(async () => {
      return await db.select().from(bannedIps);
    }, 'getAllBannedIps', []) as Promise<BannedIp[]>;
  }
  
  async createBannedIp(insertBannedIp: InsertBannedIp): Promise<BannedIp> {
    return withDbErrorHandling(async () => {
      const [bannedIp] = await db
        .insert(bannedIps)
        .values(insertBannedIp)
        .returning();
      return bannedIp;
    }, 'createBannedIp') as Promise<BannedIp>;
  }
  
  async updateBannedIpStatus(ip: string, isBanned: boolean): Promise<BannedIp | undefined> {
    try {
      const [updatedIp] = await db
        .update(bannedIps)
        .set({ 
          isBanned, 
          updatedAt: new Date() 
        })
        .where(eq(bannedIps.ip, ip))
        .returning();
      return updatedIp || undefined;
    } catch (error) {
      console.error('Erro ao atualizar status do IP banido:', error);
      return undefined;
    }
  }
  
  async updateLastAccess(ip: string): Promise<void> {
    try {
      await db
        .update(bannedIps)
        .set({
          lastAccessAttempt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(bannedIps.ip, ip));
    } catch (error) {
      console.error('Erro ao atualizar último acesso do IP:', error);
    }
  }
  
  // Banned Device operations
  async getBannedDevice(deviceId: string): Promise<BannedDevice | undefined> {
    const [bannedDevice] = await db.select().from(bannedDevices).where(eq(bannedDevices.deviceId, deviceId));
    return bannedDevice || undefined;
  }
  
  async getAllBannedDevices(): Promise<BannedDevice[]> {
    return await db.select().from(bannedDevices);
  }
  
  async createBannedDevice(insertBannedDevice: InsertBannedDevice): Promise<BannedDevice> {
    const [bannedDevice] = await db
      .insert(bannedDevices)
      .values(insertBannedDevice)
      .returning();
    return bannedDevice;
  }
  
  async isBannedByDeviceId(deviceId: string): Promise<boolean> {
    const device = await this.getBannedDevice(deviceId);
    return !!device && device.isBanned;
  }
  
  // Allowed Domain operations
  async getAllowedDomain(domain: string): Promise<AllowedDomain | undefined> {
    const [allowedDomain] = await db.select().from(allowedDomains).where(eq(allowedDomains.domain, domain));
    return allowedDomain || undefined;
  }
  
  async getAllAllowedDomains(): Promise<AllowedDomain[]> {
    return await db.select().from(allowedDomains);
  }
  
  async createAllowedDomain(insertAllowedDomain: InsertAllowedDomain): Promise<AllowedDomain> {
    const [allowedDomain] = await db
      .insert(allowedDomains)
      .values(insertAllowedDomain)
      .returning();
    return allowedDomain;
  }
  
  async updateAllowedDomainStatus(domain: string, isActive: boolean): Promise<AllowedDomain | undefined> {
    try {
      const [updatedDomain] = await db
        .update(allowedDomains)
        .set({ 
          isActive, 
          updatedAt: new Date() 
        })
        .where(eq(allowedDomains.domain, domain))
        .returning();
      return updatedDomain || undefined;
    } catch (error) {
      console.error('Erro ao atualizar status do domínio permitido:', error);
      return undefined;
    }
  }
}

export const storage = new DatabaseStorage();
