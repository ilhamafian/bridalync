import { ZodSchema } from "zod";
import { ModelBase } from "@/models/ModelBase";
import { freelancerSchema, Freelancer } from "@/schemas/freelancer";

class FreelancerModel extends ModelBase<Freelancer> {
  protected collectionName = "freelancers";
  protected schema: ZodSchema<Freelancer> = freelancerSchema;
}

export const freelancerModel = new FreelancerModel();
