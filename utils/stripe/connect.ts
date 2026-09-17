import type Stripe from "stripe";

import { getStripe } from "@/lib/stripe";
import { UserModel } from "@/models/User";
import { getAppUrl } from "@/utils/appUrl";
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

function isRestrictedConnectedAccountUpdate(error: unknown) {
  return (
    error instanceof Error &&
    error.message.includes("does not have the required permissions")
  );
}

export function isAccountPayoutReady(account: Stripe.Account | StripeRecord): boolean {
  const record = account as StripeRecord;

  const merchantCaps = (
    record.configuration as StripeRecord | undefined
  )?.merchant as StripeRecord | undefined;
  const merchantCapabilities = merchantCaps?.capabilities as
    | StripeRecord
    | undefined;
  const payouts = (
    merchantCapabilities?.stripe_balance as StripeRecord | undefined
  )?.payouts as StripeRecord | undefined;
  if (payouts?.status === "active") {
    return true;
  }

  const payoutsEnabled = record.payouts_enabled === true;
  const detailsSubmitted = record.details_submitted === true;

  const requirements = record.requirements as StripeRecord | undefined;
  const currentlyDue = requirements?.currently_due;
  const hasCurrentlyDue =
    Array.isArray(currentlyDue) && currentlyDue.length > 0;

  return payoutsEnabled && detailsSubmitted && !hasCurrentlyDue;
}

/** Post-onboarding return status for dashboard Settings feedback. */
export type StripePayoutReturnStatus = "ready" | "pending" | "incomplete";

export type ConnectFlow = "settings" | "onboarding";

export function classifyPayoutOnboardingStatus(
  account: Stripe.Account | StripeRecord
): StripePayoutReturnStatus {
  if (isAccountPayoutReady(account)) {
    return "ready";
  }

  const record = account as StripeRecord;
  const requirements = record.requirements as StripeRecord | undefined;
  const currentlyDue = requirements?.currently_due;
  const hasCurrentlyDue =
    Array.isArray(currentlyDue) && currentlyDue.length > 0;

  if (hasCurrentlyDue || record.details_submitted !== true) {
    return "incomplete";
  }

  // Details submitted; waiting on Stripe review / payouts_enabled.
  return "pending";
}

export function getConnectUrls(flow: ConnectFlow = "settings") {
  const appUrl = getAppUrl();
  if (flow === "onboarding") {
    return {
      returnUrl: `${appUrl}/api/stripe/connect/return?flow=onboarding`,
      refreshUrl: `${appUrl}/api/stripe/connect/refresh?flow=onboarding`,
    };
  }
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

/** SaaS merchant account (Accounts v2) — KYC completes via Account Link. */
export async function createDeferredConnectedAccount(owner: ConnectedAccountOwner) {
  const stripe = getStripe();
  const displayName =
    owner.name?.trim() || owner.email.split("@")[0] || "Bridalync stylist";

  const baseParams = {
    contact_email: owner.email,
    display_name: displayName,
    dashboard: "full" as const,
    identity: {
      country: "my",
      entity_type: "individual" as const,
    },
    configuration: {
      merchant: {
        mcc: BEAUTY_SERVICES_MCC,
        capabilities: {
          card_payments: { requested: true },
          fpx_payments: { requested: true },
        },
      },
    },
    defaults: {
      currency: "myr",
      responsibilities: {
        fees_collector: "stripe" as const,
        losses_collector: "stripe" as const,
      },
    },
    include: [
      "configuration.merchant",
      "identity",
      "requirements",
    ] as Array<
      | "configuration.merchant"
      | "identity"
      | "requirements"
    >,
  };

  try {
    return await stripe.v2.core.accounts.create(baseParams);
  } catch (error) {
    // FPX may be unavailable for some platform/test configs — retry with cards only.
    if (error instanceof Error && /fpx/i.test(error.message)) {
      return stripe.v2.core.accounts.create({
        ...baseParams,
        configuration: {
          merchant: {
            mcc: BEAUTY_SERVICES_MCC,
            capabilities: {
              card_payments: { requested: true },
            },
          },
        },
      });
    }
    throw error;
  }
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
  // Accounts v2 collects KYC via Account Link. Prefill is best-effort only.
  const stripe = getStripe();
  const nameParts = owner.name ? splitFullName(owner.name) : {};

  try {
    await stripe.v2.core.accounts.update(accountId, {
      contact_email: owner.email,
      ...(owner.name?.trim() ? { display_name: owner.name.trim() } : {}),
      identity: {
        individual: {
          ...(nameParts.first_name
            ? { given_name: nameParts.first_name }
            : {}),
          ...(nameParts.last_name ? { surname: nameParts.last_name } : {}),
          email: owner.email,
        },
      },
    });
  } catch (error) {
    console.warn(
      `[stripe] skipped Accounts v2 prefill for ${accountId}:`,
      error instanceof Error ? error.message : error
    );
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

  const merchantCaps = (
    record.configuration as StripeRecord | undefined
  )?.merchant as StripeRecord | undefined;
  const merchantCapabilities = merchantCaps?.capabilities as
    | StripeRecord
    | undefined;
  const cardPaymentsV2 = merchantCapabilities?.card_payments as
    | StripeRecord
    | undefined;
  if (cardPaymentsV2?.status === "active") {
    return true;
  }
  if (cardPaymentsV2?.status === "pending") {
    return true;
  }

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

export async function createOnboardingAccountLink(
  accountId: string,
  flow: ConnectFlow = "settings"
) {
  const stripe = getStripe();
  const { returnUrl, refreshUrl } = getConnectUrls(flow);

  return stripe.v2.core.accountLinks.create({
    account: accountId,
    use_case: {
      type: "account_onboarding",
      account_onboarding: {
        configurations: ["merchant"],
        refresh_url: refreshUrl,
        return_url: returnUrl,
        collection_options: {
          fields: "eventually_due",
        },
      },
    },
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
