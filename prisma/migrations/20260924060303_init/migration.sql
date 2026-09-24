-- CreateTable
CREATE TABLE "yauctions_references" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "external_reference" VARCHAR(255) NOT NULL,
    "yauctions_status" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "yauctions_references_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "yauctions_references_order_id_idx" ON "yauctions_references"("order_id");
