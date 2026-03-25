import express from 'express';
import prisma from '../lib/prisma.js';

const router = express.Router();

router.get('/active', async (req, res) => {
  try {
    // For now, return the seeded branch. 
    // In the future you could look this up via a hardware token/IP
    const branch = await prisma.branch.findUnique({
      where: { id: 'branch-seminyak' }
    });
    if (!branch) return res.status(404).json({ error: "Active branch not found" });
    res.json(branch);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
