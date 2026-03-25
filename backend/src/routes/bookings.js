import express from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';

const router = express.Router();

const createBookingSchema = z.object({
  branch_id:    z.string().min(1),
  barber_id:    z.string().min(1),
  scheduled_at: z.string().datetime(),
  service_ids:  z.array(z.string().min(1)).min(1),
  group_id:     z.string().optional().nullable(),
  guest_name:   z.string().max(100).optional().nullable(),
  guest_phone:  z.string().max(20).optional().nullable(),
});

const patchBookingSchema = z.object({
  status:         z.string().optional(),
  payment_status: z.string().optional(),
  payment_method: z.string().optional(),
});

const queryBookingSchema = z.object({
  branch_id: z.string().min(1),
  status: z.string().optional(),
});

const bookingParamsSchema = z.object({
  id: z.string().min(1),
});

router.post('/', async (req, res) => {
  try {
    const parse = createBookingSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
    const { branch_id, barber_id, scheduled_at, service_ids, group_id, guest_name, guest_phone } = parse.data;

    // Process price and duration
    // Fetch base price for all services selected
    const branchServices = await prisma.serviceBranchPrice.findMany({
      where: {
        branch_id,
        service_id: { in: service_ids }
      },
      include: { service: true }
    });

    let totalAmount = 0;
    let totalDuration = 0;

    for (const serviceId of service_ids) {
      const sp = branchServices.find(x => x.service_id === serviceId);
      if (sp) {
        totalAmount += Number(sp.price);
        totalDuration += sp.service.duration_minutes || 30; // 30 fallback
      }
    }

    // Generate Booking Number (simple logic for MVP: BK-YYYYMMDD-Random)
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const ran = Math.floor(100 + Math.random() * 900);
    const booking_number = `B${dateStr.slice(-4)}${ran}`; // e.g. B0319123

    // Create the booking entry in database
    const booking = await prisma.booking.create({
      data: {
        branch_id,
        barber_id,
        scheduled_at: new Date(scheduled_at),
        total_amount: totalAmount,
        booking_number,
        booking_source: 'kiosk',
        status: 'confirmed',
        guest_name: guest_name || null,
        guest_phone: guest_phone || null,
        group_id: group_id || null,
        // Insert booking services
        booking_services: {
          create: service_ids.map(sId => ({
            service_id: sId,
            price_charged: branchServices.find(x => x.service_id === sId)?.price || 0
          }))
        }
      }
    });

    res.json({
      booking_id: booking.id,
      booking_number: booking.booking_number,
      group_id: booking.group_id
    });
  } catch (error) {
    console.error("Booking failed:", error);
    res.status(500).json({ error: "Failed to create booking" });
  }
});

router.get('/', async (req, res) => {
  try {
    const parse = queryBookingSchema.safeParse(req.query);
    if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
    
    const { branch_id, status } = parse.data;
    
    // Parse statuses 
    const statuses = status ? status.split(',') : ['confirmed', 'in_progress', 'pending_payment'];

    // Select raw bookings
    const rawBookings = await prisma.booking.findMany({
      where: {
        branch_id,
        status: { in: statuses }
      },
      include: {
        barber: true,
        booking_services: { include: { service: true } }
      },
      orderBy: { created_at: 'desc' }
    });

    // Map and group by group_id
    const processed = [];
    const groupsMap = {};

    for (const b of rawBookings) {
      const uiB = {
        id: b.id,
        number: b.booking_number,
        barber: b.barber?.name || "Unknown",
        slot: new Date(b.scheduled_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        services: b.booking_services.map(bs => bs.service.name).join(", "),
        cartItems: b.booking_services.map(bs => ({
           id: bs.service_id,
           name: bs.service.name,
           price: bs.price_charged,
           dur: bs.service.duration_minutes
        })),
        total: b.total_amount,
        group_id: b.group_id,
        groupItems: []
      };

      if (b.group_id) {
        if (!groupsMap[b.group_id]) {
          groupsMap[b.group_id] = uiB;
          processed.push(uiB);
        } else {
          groupsMap[b.group_id].groupItems.push({
            id: b.id,
            number: b.booking_number,
            barber: b.barber?.name || "Unknown",
            total: b.total_amount,
            services: uiB.services,
            cartItems: uiB.cartItems
          });
        }
      } else {
        processed.push(uiB);
      }
    }

    res.json(processed);
  } catch (err) {
    console.error("Failed fetching bookings:", err);
    res.status(500).json({ error: 'Failed' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const paramsParse = bookingParamsSchema.safeParse(req.params);
    if (!paramsParse.success) return res.status(400).json({ error: paramsParse.error.flatten() });
    const { id } = paramsParse.data;

    const parse = patchBookingSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
    const { status, payment_status, payment_method } = parse.data;

    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) return res.status(404).json({ error: "Not found" });

    const updateData = {
      status: status || undefined,
      payment_status: payment_status || undefined,
      payment_method: payment_method || undefined,
      paid_at: (payment_status === 'paid') ? new Date() : undefined
    };

    if (booking.group_id) {
      // Update all bookings in this group
      await prisma.booking.updateMany({
        where: { group_id: booking.group_id },
        data: updateData
      });
      res.json({ success: true, groupId: booking.group_id });
    } else {
      const updated = await prisma.booking.update({
        where: { id },
        data: updateData
      });
      res.json(updated);
    }
  } catch (err) {
    console.error("Failed updating booking:", err);
    res.status(500).json({ error: "Failed" });
  }
});

export default router;
