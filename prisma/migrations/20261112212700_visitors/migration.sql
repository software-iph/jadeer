-- CreateTable
CREATE TABLE "PageView" (
    "id" SERIAL NOT NULL,
    "day" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "visitor" TEXT NOT NULL,
    "device" TEXT NOT NULL,
    "lang" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatSalt" (
    "day" TEXT NOT NULL,
    "salt" TEXT NOT NULL,

    CONSTRAINT "StatSalt_pkey" PRIMARY KEY ("day")
);

-- CreateIndex
CREATE INDEX "PageView_day_idx" ON "PageView"("day");
