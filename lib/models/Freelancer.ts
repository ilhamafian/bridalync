import { ZodSchema } from "zod";
import { ModelBase } from "@/lib/models/ModelBase";
import { freelancerSchema, Freelancer } from "@/lib/schemas/freelancer";

class FreelancerModel extends ModelBase<Freelancer> {
  protected collectionName = "freelancers";
  protected schema: ZodSchema<Freelancer> = freelancerSchema;
}

export const freelancerModel = new FreelancerModel();
