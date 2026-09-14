import type Stripe from "stripe";

import { getStripe } from "@/lib/stripe";
import { UserModel } from "@/models/User";
import { buildProfileUrl, getAppUrl } from "@/utils/appUrl";
import { refreshSession } from "@/utils/onboarding/progress";
import { toIdString } from "@/schemas/objectId";

type StripeRecord = Record<string, unknown>;

export type ConnectedAccountOwner = {
  email: string;
  name?: string | null;
  username?: string | null;
  role?: "hijabstylist" | "makeupartist" | string | null;
};

const BEAUTY_SERVICES_MCC = "7298";

function getServiceDescription(role?: string | null) {
  if (role === "makeupartist") {
    return "Bridal and event makeup services for clients booked through Bridalync.";
  }
  if (role === "hijabstylist") {
    return "Bridal hijab styling services for clients booked through Bridalync.";
  }
  return "Bridal beauty and styling services for clients booked through Bridalync.";
}

function isStripeAcceptableBusinessUrl(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.endsWith(".local")
    ) {
      return false;
    }

    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function getBusinessProfileUrl(owner: ConnectedAccountOwner) {
  const appUrl = getAppUrl();
  const candidate = owner.username
    ? buildProfileUrl(appUrl, owner.username)
    : appUrl;

  if (isStripeAcceptableBusinessUrl(candidate)) {
    return candidate;
  }

  const fallback = process.env.STRIPE_BUSINESS_URL?.trim();
  if (fallback && isStripeAcceptableBusinessUrl(fallback)) {
    return fallback;
  }

  return undefined;
}

function buildBusinessProfilePrefill(owner: ConnectedAccountOwner) {
  const profile: Stripe.AccountUpdateParams.BusinessProfile = {
    mcc: BEAUTY_SERVICES_MCC,
    product_description: getServiceDescription(owner.role),
  };

  if (owner.name?.trim()) {
    profile.name = owner.name.trim();
  }

  const url = getBusinessProfileUrl(owner);
  if (url) {
    profile.url = url;
  }

  return profile;
}

function splitFullName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    return {};
  }

  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return { first_name: parts[0] };
  }

  return {
    first_name: parts[0],
    last_name: parts.slice(1).join(" "),
  };
}

function buildIndividualPrefill(owner: ConnectedAccountOwner) {
  const individual: Stripe.AccountUpdateParams.Individual = {
    email: owner.email,
  };

  if (owner.name) {
    Object.assign(individual, splitFullName(owner.name));
  }

  return individual;
}

function isRestrictedConnectedAccountUpdate(error: unknown) {
  return (
    error instanceof Error &&
    error.message.includes("does not have the required permissions")
  );
}

export function isAccountPayoutReady(account: Stripe.Account | StripeRecord): boolean {
  const record = account as StripeRecord;
  const payoutsEnabled = record.payouts_enabled === true;
  const detailsSubmitted = record.details_submitted === true;

  const requirements = record.requirements as StripeRecord | undefined;
  const currentlyDue = requirements?.currently_due;
  const hasCurrentlyDue =
    Array.isArray(currentlyDue) && currentlyDue.length > 0;

  return payoutsEnabled && detailsSubmitted && !hasCurrentlyDue;
}

export function getConnectUrls() {
  const appUrl = getAppUrl();
  return {
    returnUrl: `${appUrl}/api/stripe/connect/return`,
    refreshUrl: `${appUrl}/api/stripe/connect/refresh`,
  };
}

export function buildStripeOwner(user: {
  email: string;
  name?: string | null;
  username?: string | null;
  role?: string | null;
}): ConnectedAccountOwner {
  return {
    email: user.email,
    name: user.name,
    username: user.username,
    role: user.role,
  };
}

/** Minimal Standard account — no KYC onboarding until the user needs payouts. */
export async function createDeferredConnectedAccount(owner: ConnectedAccountOwner) {
  const stripe = getStripe();
  return stripe.accounts.create({
    type: "standard",
    country: "MY",
    email: owner.email,
    business_type: "individual",
  });
}

export async function provisionDeferredStripeAccount(
  userId: string,
  owner: ConnectedAccountOwner,
  existingAccountId?: string | null
) {
  if (existingAccountId) {
    await new UserModel().setDeferredMinimalAccount(userId, existingAccountId);
    return existingAccountId;
  }

  const account = await createDeferredConnectedAccount(owner);
  const accountId = account.id;

  await new UserModel().setDeferredMinimalAccount(userId, accountId);

  return accountId;
}

async function prepareAccountForPayoutOnboarding(
  accountId: string,
  owner: ConnectedAccountOwner
) {
  const account = await retrieveConnectedAccount(accountId);
  if (account.details_submitted) {
    return;
  }

  const stripe = getStripe();
  try {
    await stripe.accounts.update(accountId, {
      business_type: "individual",
      individual: buildIndividualPrefill(owner),
      business_profile: buildBusinessProfilePrefill(owner),
    });
  } catch (error) {
    // Standard accounts own KYC fields after Account Link/onboarding starts.
    // Prefill is best-effort — never block hosted onboarding on this.
    if (isRestrictedConnectedAccountUpdate(error)) {
      console.warn(
        `[stripe] skipped Standard account prefill for ${accountId}:`,
        error instanceof Error ? error.message : error
      );
      return;
    }
    throw error;
  }
}

export async function ensureStripeAccountId(
  userId: string,
  owner: ConnectedAccountOwner,
  existingAccountId?: string | null
) {
  const accountId = await provisionDeferredStripeAccount(
    userId,
    owner,
    existingAccountId
  );
  // Prefill payout onboarding details before the hosted bank/KYC flow.
  await prepareAccountForPayoutOnboarding(accountId, owner);
  return accountId;
}

export function isAccountReadyForClientCharges(
  account: Stripe.Account | StripeRecord
): boolean {
  const record = account as StripeRecord;
  if (record.charges_enabled === true) {
    return true;
  }

  const requirements = record.requirements as StripeRecord | undefined;
  const pastDue = requirements?.past_due;
  if (Array.isArray(pastDue) && pastDue.length > 0) {
    return false;
  }

  const capabilities = record.capabilities as StripeRecord | undefined;
  const cardPayments = capabilities?.card_payments;
  return cardPayments === "active" || cardPayments === "pending";
}

function isRequestedCapability(status: string | null | undefined) {
  return status === "active" || status === "pending";
}

/** Request card and FPX capabilities on a deferred account when a client pays. */
export async function ensurePaymentCapabilities(accountId: string) {
  const account = await retrieveConnectedAccount(accountId);
  const needsCard = !isRequestedCapability(account.capabilities?.card_payments);
  const needsFpx = !isRequestedCapability(account.capabilities?.fpx_payments);

  if (!needsCard && !needsFpx) {
    return account;
  }

  const stripe = getStripe();
  const capabilities: Stripe.AccountUpdateParams.Capabilities = {};
  if (needsCard) {
    capabilities.card_payments = { requested: true };
    capabilities.transfers = { requested: true };
  }
  if (needsFpx) {
    capabilities.fpx_payments = { requested: true };
  }

  try {
    // Do not send business_profile here. Standard connected accounts reject
    // platform updates to that field after onboarding has started (live mode).
    return await stripe.accounts.update(accountId, { capabilities });
  } catch (error) {
    if (needsFpx && (needsCard || isRestrictedConnectedAccountUpdate(error))) {
      delete capabilities.fpx_payments;
      if (Object.keys(capabilities).length > 0) {
        try {
          return await stripe.accounts.update(accountId, { capabilities });
        } catch (cardOnlyError) {
          if (isRestrictedConnectedAccountUpdate(cardOnlyError)) {
            console.warn(
              `[stripe] skipped capability request for ${accountId}:`,
              cardOnlyError instanceof Error
                ? cardOnlyError.message
                : cardOnlyError
            );
            return account;
          }
          throw cardOnlyError;
        }
      }
    }

    if (isRestrictedConnectedAccountUpdate(error)) {
      console.warn(
        `[stripe] skipped capability request for ${accountId}:`,
        error instanceof Error ? error.message : error
      );
      return account;
    }
    throw error;
  }
}

/** @deprecated Use ensurePaymentCapabilities */
export const requestPaymentCapabilities = ensurePaymentCapabilities;

export async function retrieveConnectedAccount(accountId: string) {
  const stripe = getStripe();
  return stripe.accounts.retrieve(accountId);
}

export async function createOnboardingAccountLink(accountId: string) {
  const stripe = getStripe();
  const { returnUrl, refreshUrl } = getConnectUrls();

  return stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  });
}

export async function syncPayoutOnboardingStatus(
  stripeAccountId: string
): Promise<boolean> {
  const user = await new UserModel().findOne({
    stripe_account_id: stripeAccountId,
  } as never);

  const userId = user?._id ? toIdString(user._id) : null;
  if (!userId) {
    return false;
  }

  const account = await retrieveConnectedAccount(stripeAccountId);
  if (!isAccountPayoutReady(account)) {
    return false;
  }

  await new UserModel().markStripeConnected(userId);
  await refreshSession(userId);
  return true;
}
