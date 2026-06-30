import { ZodSchema } from "zod";
import { ModelBase } from "@/models/ModelBase";
import { userSchema, User } from "@/schemas/userSchema";

export class UserModel extends ModelBase<User> {
  protected collectionName = "users";
  protected schema: ZodSchema<User> = userSchema;

  static userRoles: { value: string; label: string }[] = [
    { value: "hijabstylist", label: "Hijab Stylist" },
    { value: "makeupartist", label: "Makeup Artist" },
  ];
}