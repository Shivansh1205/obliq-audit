-- CreateTable
CREATE TABLE "_assignment" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_assignment_A_fkey" FOREIGN KEY ("A") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_assignment_B_fkey" FOREIGN KEY ("B") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "_assignment_AB_unique" ON "_assignment"("A", "B");

-- CreateIndex
CREATE INDEX "_assignment_B_index" ON "_assignment"("B");
