import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE = '/api';

export function useActiveBranch() {
  return useQuery({
    queryKey: ['activeBranch'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/branches/active`);
      if (!res.ok) throw new Error('Failed to fetch active branch');
      return res.json();
    }
  });
}

export function useBarbers(branchId) {
  return useQuery({
    queryKey: ['barbers', branchId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/barbers?branch_id=${branchId}`);
      if (!res.ok) throw new Error('Failed to fetch barbers');
      return res.json();
    },
    enabled: !!branchId
  });
}

export function useServices(branchId) {
  return useQuery({
    queryKey: ['services', branchId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/services?branch_id=${branchId}`);
      if (!res.ok) throw new Error('Failed to fetch services');
      return res.json();
    },
    enabled: !!branchId
  });
}

export function useSlots(barberId, date) {
  return useQuery({
    queryKey: ['slots', barberId, date],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/slots?barber_id=${barberId}&date=${date}`);
      if (!res.ok) throw new Error('Failed to fetch slots');
      return res.json();
    },
    enabled: !!barberId && !!date
  });
}

export function useBookings(branchId, status) {
  return useQuery({
    queryKey: ['bookings', branchId, status],
    queryFn: async () => {
      const url = new URL(`${window.location.origin}${API_BASE}/bookings`);
      if (branchId) url.searchParams.append('branch_id', branchId);
      if (status) url.searchParams.append('status', status);
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('Failed to fetch bookings');
      return res.json();
    },
    enabled: !!branchId
  });
}

export function useCreateBookingGroup() {
  return useMutation({
    mutationFn: async ({ branch_id }) => {
      const res = await fetch(`${API_BASE}/bookingGroups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch_id })
      });
      if (!res.ok) throw new Error('Failed to create booking group');
      return res.json();
    }
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bookingData) => {
      const res = await fetch(`${API_BASE}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
      });
      if (!res.ok) throw new Error('Failed to create booking');
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['slots', variables.barber_id] });
      queryClient.invalidateQueries({ queryKey: ['bookings', variables.branch_id] });
    }
  });
}

export function useUpdateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, payment_status, payment_method }) => {
      const res = await fetch(`${API_BASE}/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, payment_status, payment_method })
      });
      if (!res.ok) throw new Error('Failed to update booking');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    }
  });
}
