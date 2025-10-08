-- SQL script for creating the database schema for the Monster Dashboard project (PostgreSQL version).

-- Create a custom type for user roles
CREATE TYPE user_role AS ENUM ('member', 'admin');

-- Create the "users" table to store user login information and roles.
CREATE TABLE "users" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "email" VARCHAR(255) NOT NULL UNIQUE,
  "password_hash" VARCHAR(255) NOT NULL,
  "role" user_role NOT NULL DEFAULT 'member',
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create the "players" table to store character sheet information.
CREATE TABLE "players" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INT DEFAULT NULL,
  "name" VARCHAR(255) NOT NULL,
  "level" INT DEFAULT 1,
  "image" TEXT DEFAULT NULL,
  "description" TEXT DEFAULT NULL,
  "stats" TEXT DEFAULT NULL,
  "skills" TEXT DEFAULT NULL,
  "equipment" TEXT DEFAULT NULL,
  "equipmentInventory" TEXT DEFAULT NULL,
  "inventory" TEXT DEFAULT NULL,
  CONSTRAINT "players_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL
);

-- Create the "monsters" table to store monster information.
CREATE TABLE "monsters" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "image" TEXT DEFAULT NULL,
  "stats" TEXT NOT NULL,
  "skills" TEXT DEFAULT NULL,
  "description" TEXT DEFAULT NULL
);

-- Create the "skills" table to store skill definitions.
CREATE TABLE "skills" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "type" VARCHAR(50) DEFAULT NULL,
  "potency" INT DEFAULT NULL,
  "cost" INT DEFAULT NULL,
  "description" TEXT DEFAULT NULL
);
