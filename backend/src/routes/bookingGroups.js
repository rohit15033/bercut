import express from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';

const router = express.Router();

const createGroupSchema = z.object({
  branch_id: z.string().min(1),
});

router.post('/', async (req, res) => {
  const parse = createGroupSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  const { branch_id } = parse.data;
  try {

    const group = await prisma.bookingGroup.create({
      data: { branch_id }
    });
    res.json({ id: group.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create group" });
  }
});

export default router;
