import { freelancerModel } from "@/lib/models/Freelancer";
import { PublicFreelancer, publicFreelancerSchema } from "@/lib/schemas/freelancer";
import { WithId } from "mongodb";

export async function freelancerExists(username: string): Promise<boolean> {
  const doc = await freelancerModel.findOne({ username } as any);
  return doc !== null;
}

export async function getFreelancerByUsername(
  username: string
): Promise<PublicFreelancer | null> {
  const doc = await freelancerModel.findOne({ username } as any);
  if (!doc) return null;

  const result = publicFreelancerSchema.safeParse({
    ...doc,
    _id: (doc as WithId<any>)._id.toString(),
  });

  return result.success ? result.data : null;
}
