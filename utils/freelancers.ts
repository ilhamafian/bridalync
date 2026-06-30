import { freelancerModel } from "@/models/Freelancer";
import {
  BookingFreelancer,
  bookingFreelancerSchema,
} from "@/schemas/freelancer";

export async function freelancerExists(username: string): Promise<boolean> {
  const doc = await freelancerModel.findOne({ username } as any);
  return doc !== null;
}

export async function getFreelancerByUsername(
  username: string
): Promise<BookingFreelancer | null> {
  const doc = await freelancerModel.findOne({ username } as any);
  if (!doc) return null;

  const result = bookingFreelancerSchema.safeParse(doc);
  return result.success ? result.data : null;
}
