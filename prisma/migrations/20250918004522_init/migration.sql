-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('USER', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "public"."Provider" AS ENUM ('LOCAL', 'GOOGLE', 'GITHUB');

-- CreateEnum
CREATE TYPE "public"."ItemStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "public"."ItemPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "public"."AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "first_name" VARCHAR(100),
    "last_name" VARCHAR(100),
    "email" VARCHAR(255) NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'USER',
    "password" VARCHAR(255) NOT NULL,
    "provider" "public"."Provider" NOT NULL DEFAULT 'LOCAL',
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "email_verified_at" TIMESTAMP(3),
    "profile_completed" BOOLEAN NOT NULL DEFAULT false,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "picture_id" INTEGER,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."reset_passwords" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reset_passwords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."files" (
    "id" SERIAL NOT NULL,
    "asset_id" VARCHAR(255) NOT NULL,
    "public_id" VARCHAR(255) NOT NULL,
    "format" VARCHAR(20),
    "version" INTEGER NOT NULL,
    "resource_type" VARCHAR(50),
    "type" VARCHAR(50),
    "bytes" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "folder" VARCHAR(255),
    "access_mode" VARCHAR(50),
    "url" TEXT NOT NULL,
    "secure_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."audit_logs" (
    "id" SERIAL NOT NULL,
    "table_name" VARCHAR(100) NOT NULL,
    "record_id" INTEGER NOT NULL,
    "action" "public"."AuditAction" NOT NULL,
    "values" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" INTEGER,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "public"."users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "users_first_name_last_name_idx" ON "public"."users"("first_name", "last_name");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "public"."users"("role");

-- CreateIndex
CREATE INDEX "users_provider_idx" ON "public"."users"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "reset_passwords_user_id_key" ON "public"."reset_passwords"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "reset_passwords_token_key" ON "public"."reset_passwords"("token");

-- CreateIndex
CREATE UNIQUE INDEX "files_asset_id_key" ON "public"."files"("asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "files_public_id_key" ON "public"."files"("public_id");

-- CreateIndex
CREATE INDEX "files_resource_type_idx" ON "public"."files"("resource_type");

-- CreateIndex
CREATE INDEX "files_folder_idx" ON "public"."files"("folder");

-- CreateIndex
CREATE INDEX "audit_logs_table_name_record_id_idx" ON "public"."audit_logs"("table_name", "record_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "public"."audit_logs"("user_id");

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_picture_id_fkey" FOREIGN KEY ("picture_id") REFERENCES "public"."files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reset_passwords" ADD CONSTRAINT "reset_passwords_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
