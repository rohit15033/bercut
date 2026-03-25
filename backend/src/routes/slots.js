import express from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';

const router = express.Router();

const slotsQuerySchema = z.object({
  barber_id: z.string().min(1),
  date:      z.string().min(1),
  service_ids: z.string().optional(),
});

router.get('/', async (req, res) => {
  const parse = slotsQuerySchema.safeParse(req.query);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  const { barber_id, date, service_ids } = parse.data;
  
  try {
    // 1. Fetch all bookings for this barber on this date
    const startOfDay = new Date(date);
    startOfDay.setHours(0,0,0,0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const takenBookings = await prisma.booking.findMany({
      where: {
        barber_id,
        scheduled_at: { gte: startOfDay, lte: endOfDay },
        status: { notIn: ['cancelled', 'noshow'] }
      }
    });

    const occupiedTimes = takenBookings.map(b => {
      const d = b.scheduled_at;
      // Force format to HH:MM (24-hour style) to match allSlots keys
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return `${hh}:${mm}`;
    });

    // 2. Define business hour slots (standard 30min intervals)
    const allSlots = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00"];
    
    // 3. Filter out occupied times + past times if date is today
    const now = new Date();
    const isToday = now.toISOString().split('T')[0] === date;

    const availableSlots = allSlots.filter(s => {
      // Rule 1: Not occupied
      if (occupiedTimes.includes(s)) return false;

      // Rule 2: If today, slot time must be at least 15 min in the future
      if (isToday) {
        const [h, m] = s.split(':').map(Number);
        const slotDate = new Date(date);
        slotDate.setHours(h, m, 0, 0);
        if (slotDate.getTime() < now.getTime() + (15 * 60 * 1000)) return false;
      }

      return true;
    });

    res.json({ slots: availableSlots });
  } catch (err) {
    console.error("Slots fetch failed:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
