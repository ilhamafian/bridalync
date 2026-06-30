import { UserModel } from "@/models/User";


export async function userExists(username: string): Promise<boolean> {
  const doc = await new UserModel().findOne({ username });
  return doc !== null;
}

