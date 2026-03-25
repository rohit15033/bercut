import express from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';

const router = express.Router();

const servicesQuerySchema = z.object({
  branch_id: z.string().min(1),
});

router.get('/', async (req, res) => {
  const parse = servicesQuerySchema.safeParse(req.query);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  const { branch_id } = parse.data;
  try {

    const branchPrices = await prisma.serviceBranchPrice.findMany({
      where: { branch_id },
      include: { service: true }
    });

    const mapped = branchPrices.map(bp => ({
      ...bp.service,
      price: bp.price, 
    })).sort((a, b) => a.sort_order - b.sort_order);

    res.json(mapped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
