import { z } from 'zod';

export const FulfilmentType = z.enum([
  'pickup',
  'delivery',
]);

export const ContactSchema = z.object({
  fullName:    z.string().min(1, 'Name is required'),
  company:     z.string().optional(),
  phone:       z.string().optional(),
  email:       z.string().email('Invalid email').optional().or(z.literal('')),
  fulfilment:  FulfilmentType,
  deliveryAddress: z.string().optional(),
  notes:       z.string().optional(),
});

export type ContactInfo = z.infer<typeof ContactSchema>;

export const defaultContactInfo: ContactInfo = {
  fullName:        '',
  company:         '',
  phone:           '',
  email:           '',
  fulfilment:      'pickup',
  deliveryAddress: '',
  notes:           '',
};
