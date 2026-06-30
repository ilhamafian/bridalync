import { userModel } from "@/models/User";


export async function userExists(username: string): Promise<boolean> {
  const doc = await userModel.findOne({ username } as any);
  return doc !== null;
}

