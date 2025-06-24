import { pgTable, text, serial, integer, boolean, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Tabela de usuários para autenticação
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Tabela de candidatos (delivery partners)
export const candidates = pgTable("candidates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: varchar("phone", { length: 20 }).notNull(),
  state: varchar("state", { length: 2 }).notNull(),
  city: text("city").notNull(),
  vehicleType: text("vehicle_type").notNull(),
  hasExperience: boolean("has_experience").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const candidatesRelations = relations(candidates, ({ one }) => ({
  state: one(states, {
    fields: [candidates.state],
    references: [states.code],
  }),
}));

// Tabela de estados brasileiros
export const states = pgTable("states", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 2 }).notNull().unique(),
  name: text("name").notNull(),
  hasVacancies: boolean("has_vacancies").default(false).notNull(),
  vacancyCount: integer("vacancy_count").default(0).notNull(),
});

export const statesRelations = relations(states, ({ many }) => ({
  candidates: many(candidates),
}));

// Tabela de benefícios
export const benefits = pgTable("benefits", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  iconName: text("icon_name").notNull(),
});

// Definição dos schemas de inserção
export const insertCandidateSchema = createInsertSchema(candidates).pick({
  name: true,
  email: true,
  phone: true,
  state: true,
  city: true,
  vehicleType: true,
  hasExperience: true,
});

export const insertStateSchema = createInsertSchema(states).pick({
  code: true,
  name: true,
  hasVacancies: true,
  vacancyCount: true,
});

export const insertBenefitSchema = createInsertSchema(benefits).pick({
  title: true,
  description: true,
  iconName: true,
});

// Tabela de IPs banidos (nova versão com índices otimizados)
export const bannedIps = pgTable("banned_ips", {
  id: serial("id").primaryKey(),
  ip: text("ip").notNull().unique(),
  isBanned: boolean("is_banned").default(true).notNull(),
  userAgent: text("user_agent"),
  referer: text("referer"),
  origin: text("origin"),
  device: text("device"),
  browserInfo: text("browser_info"),
  screenSize: text("screen_size"),
  platform: text("platform"),
  language: text("language"),
  reason: text("reason"),
  location: text("location"),
  accessUrl: text("access_url"),
  bannedAt: timestamp("banned_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  // Novo campo para facilitar sincronização entre instâncias
  syncStatus: text("sync_status").default("active").notNull(),
  // Novo campo para identificador exclusivo do dispositivo (mantém banimento em IPs dinâmicos)
  deviceId: text("device_id"),
  // Novo campo para data de última tentativa de acesso
  lastAccessAttempt: timestamp("last_access_attempt"),
});

// Tabela de domínios permitidos
export const allowedDomains = pgTable("allowed_domains", {
  id: serial("id").primaryKey(),
  domain: text("domain").notNull().unique(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Schemas de inserção para IPs banidos e domínios permitidos
export const insertBannedIpSchema = createInsertSchema(bannedIps).pick({
  ip: true,
  isBanned: true,
  userAgent: true,
  referer: true,
  origin: true,
  device: true,
  browserInfo: true,
  screenSize: true,
  platform: true,
  language: true,
  reason: true,
  location: true,
  accessUrl: true,
  syncStatus: true,
  deviceId: true,
  lastAccessAttempt: true,
});

export const insertAllowedDomainSchema = createInsertSchema(allowedDomains).pick({
  domain: true,
  isActive: true,
});

// Definição dos tipos
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertCandidate = z.infer<typeof insertCandidateSchema>;
export type Candidate = typeof candidates.$inferSelect;

export type InsertState = z.infer<typeof insertStateSchema>;
export type State = typeof states.$inferSelect;

export type InsertBenefit = z.infer<typeof insertBenefitSchema>;
export type Benefit = typeof benefits.$inferSelect;

export type InsertBannedIp = z.infer<typeof insertBannedIpSchema>;
export type BannedIp = typeof bannedIps.$inferSelect;

export type InsertAllowedDomain = z.infer<typeof insertAllowedDomainSchema>;
export type AllowedDomain = typeof allowedDomains.$inferSelect;

// Nova tabela para armazenar IDs de dispositivos banidos
export const bannedDevices = pgTable("banned_devices", {
  id: serial("id").primaryKey(),
  deviceId: text("device_id").notNull().unique(),
  isBanned: boolean("is_banned").default(true).notNull(),
  originalIp: text("original_ip").notNull(),
  userAgent: text("user_agent"),
  reason: text("reason"),
  bannedAt: timestamp("banned_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBannedDeviceSchema = createInsertSchema(bannedDevices).pick({
  deviceId: true,
  isBanned: true,
  originalIp: true,
  userAgent: true,
  reason: true,
});

export type InsertBannedDevice = z.infer<typeof insertBannedDeviceSchema>;
export type BannedDevice = typeof bannedDevices.$inferSelect;
