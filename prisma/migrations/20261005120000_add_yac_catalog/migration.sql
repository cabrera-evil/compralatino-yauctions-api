-- CreateEnum
CREATE TYPE "yac_lot_status" AS ENUM ('open', 'ended');

-- CreateTable
CREATE TABLE "yac_categories" (
    "id" SERIAL NOT NULL,
    "source_category_id" VARCHAR(64) NOT NULL,
    "code" VARCHAR(96) NOT NULL,
    "label" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "yac_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "yac_auctions" (
    "id" SERIAL NOT NULL,
    "source_auction_id" VARCHAR(64) NOT NULL,
    "reference" VARCHAR(128),
    "title" VARCHAR(255) NOT NULL,
    "type" VARCHAR(32),
    "location" VARCHAR(255) NOT NULL,
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "last_seen_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "yac_auctions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "yac_lots" (
    "id" SERIAL NOT NULL,
    "source_lot_id" VARCHAR(64) NOT NULL,
    "code" VARCHAR(96) NOT NULL,
    "auction_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,
    "lot_number" VARCHAR(64),
    "title" VARCHAR(512) NOT NULL,
    "status" "yac_lot_status" NOT NULL DEFAULT 'open',
    "source_currency" VARCHAR(3) NOT NULL,
    "source_current_bid" DECIMAL(14,2) NOT NULL,
    "source_min_increment" DECIMAL(14,2) NOT NULL,
    "price_usd" DECIMAL(14,2) NOT NULL,
    "current_bid_jpy" DECIMAL(16,0) NOT NULL,
    "min_increment_usd" DECIMAL(14,2) NOT NULL,
    "min_increment_jpy" DECIMAL(16,0) NOT NULL,
    "exchanged_at" TIMESTAMP(3) NOT NULL,
    "bids" INTEGER NOT NULL DEFAULT 0,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "location" VARCHAR(255) NOT NULL,
    "seller_name" VARCHAR(255) NOT NULL,
    "image_url" TEXT,
    "search_text" TEXT NOT NULL,
    "photos" JSONB NOT NULL,
    "description_paragraphs" JSONB NOT NULL,
    "specs" JSONB NOT NULL,
    "shipping" JSONB NOT NULL,
    "last_seen_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "yac_lots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "yac_categories_source_category_id_key" ON "yac_categories"("source_category_id");

-- CreateIndex
CREATE UNIQUE INDEX "yac_categories_code_key" ON "yac_categories"("code");

-- CreateIndex
CREATE UNIQUE INDEX "yac_auctions_source_auction_id_key" ON "yac_auctions"("source_auction_id");

-- CreateIndex
CREATE UNIQUE INDEX "yac_lots_source_lot_id_key" ON "yac_lots"("source_lot_id");

-- CreateIndex
CREATE UNIQUE INDEX "yac_lots_code_key" ON "yac_lots"("code");

-- CreateIndex
CREATE INDEX "yac_lots_auction_id_idx" ON "yac_lots"("auction_id");

-- CreateIndex
CREATE INDEX "yac_lots_category_id_idx" ON "yac_lots"("category_id");

-- CreateIndex
CREATE INDEX "yac_lots_status_idx" ON "yac_lots"("status");

-- CreateIndex
CREATE INDEX "yac_lots_ends_at_idx" ON "yac_lots"("ends_at");

-- CreateIndex
CREATE INDEX "yac_lots_starts_at_idx" ON "yac_lots"("starts_at");

-- CreateIndex
CREATE INDEX "yac_lots_price_usd_idx" ON "yac_lots"("price_usd");

-- CreateIndex
CREATE INDEX "yac_lots_status_last_seen_at_idx" ON "yac_lots"("status", "last_seen_at");

-- AddForeignKey
ALTER TABLE "yac_lots" ADD CONSTRAINT "yac_lots_auction_id_fkey" FOREIGN KEY ("auction_id") REFERENCES "yac_auctions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "yac_lots" ADD CONSTRAINT "yac_lots_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "yac_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

