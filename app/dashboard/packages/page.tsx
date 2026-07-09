import { redirect } from "next/navigation";
import { WithId } from "mongodb";

import {
  PackagesManager,
  type PackageItem,
  type StyleItem,
} from "@/components/PackagesManager";
import { PackageModel } from "@/models/Package";
import { StyleModel } from "@/models/Style";
import type { Package } from "@/schemas/packageSchema";
import { toIdString } from "@/schemas/objectId";
import type { Style } from "@/schemas/styleSchema";
import { isOnboardingComplete } from "@/schemas/userSchema";
import { getSessionUser } from "@/utils/auth/session";

function serializePackage(pkg: WithId<Package>): PackageItem {
  return {
    _id: toIdString(pkg._id),
    name: pkg.name,
    price: pkg.price,
    deposit: pkg.deposit,
    order: pkg.order,
    session_templates: pkg.session_templates,
  };
}

function serializeStyle(style: WithId<Style>): StyleItem {
  return {
    _id: toIdString(style._id),
    name: style.name,
    order: style.order,
    variants: style.variants,
  };
}

export default async function PackagesPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/auth");
  }

  if (!isOnboardingComplete(user.onboarding)) {
    redirect("/onboarding");
  }

  const userId = toIdString(user._id);
  const [packages, styles] = await Promise.all([
    new PackageModel().find({ user_id: userId }, { sort: { order: 1 } }),
    new StyleModel().find({ user_id: userId }, { sort: { order: 1 } }),
  ]);

  return (
    <PackagesManager
      initialPackages={packages.map(serializePackage)}
      initialStyles={styles.map(serializeStyle)}
    />
  );
}
