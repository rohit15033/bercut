import express from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';

const router = express.Router();

const barberQuerySchema = z.object({
  branch_id: z.string().min(1),
});

router.get('/', async (req, res) => {
  const parse = barberQuerySchema.safeParse(req.query);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  const { branch_id } = parse.data;
  try {

    // Fetch active barbers for this branch
    const barbers = await prisma.barber.findMany({
      where: { branch_id, is_active: true }
    });

    // Mock slots, ratings and cuts for now until schedule module is complete
    const barbersWithMeta = barbers.map(b => ({
      ...b,
      slots: ["09:00", "09:30", "10:00", "14:00"], 
      rating: (Math.random() * (5 - 4.2) + 4.2).toFixed(1),
      cuts: Math.floor(Math.random() * 2000) + 100
    }));

    res.json(barbersWithMeta);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
