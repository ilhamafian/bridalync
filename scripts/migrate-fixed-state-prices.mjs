// Converts event-priced stylists who saved a fixed amount per state into a
// different price per event. Each event's state price becomes its current
// price plus that state's fee, which is what clients would pay on that fixed
// charge. Stylists still charging by distance keep that mode; only the saved
// state prices move onto their events.
//
// Stylists who charge by style stay on the fixed list: that fee is added to
// each style, and there is no event price to replace.
//
//   node --env-file=.env.production scripts/migrate-fixed-state-prices.mjs
//   node --env-file=.env.production scripts/migrate-fixed-state-prices.mjs --apply
//
// Safe to re-run: stylists already on per-event pricing are skipped.

import { MongoClient, ObjectId } from "mongodb";

const apply = process.argv.includes("--apply");

const REGION_IDS = [
  "klang_valley",
  "negeri_sembilan",
  "melaka",
  "johor",
  "perak",
  "pahang",
  "kedah",
  "penang",
  "perlis",
  "kelantan",
  "terengganu",
  "sabah",
  "sarawak",
  "labuan",
];

const { MONGODB_URI } = process.env;
const DB_NAME = process.env.MONGODB_DATABASE ?? process.env.DB_NAME;
if (!MONGODB_URI || !DB_NAME) {
  throw new Error("MONGODB_URI and MONGODB_DATABASE (or DB_NAME) are required");
}

/** Full event price per state: catalog price + the fixed state fee. */
function statePrices(eventPrice, fees) {
  const base = typeof eventPrice === "number" && eventPrice >= 0 ? eventPrice : 0;
  const prices = {};
  for (const id of REGION_IDS) {
    const fee = fees?.[id];
    if (typeof fee !== "number" || !Number.isFinite(fee) || fee < 0) continue;
    prices[id] = base + fee;
  }
  return prices;
}

function samePrices(left, right) {
  const keys = new Set([...Object.keys(left ?? {}), ...Object.keys(right ?? {})]);
  for (const key of keys) {
    if ((left ?? {})[key] !== (right ?? {})[key]) return false;
  }
  return true;
}

const client = new MongoClient(MONGODB_URI);
try {
  await client.connect();
  const db = client.db(DB_NAME);
  const settings = db.collection("settings");
  const packages = db.collection("packages");
  const users = db.collection("users");

  const docs = await settings
    .find({
      charge_by: "package",
      $or: [
        { "travel.region_mode": "fixed" },
        {
          "travel.mode": "region",
          "travel.region_mode": { $exists: false },
        },
      ],
    })
    .toArray();

  console.log(
    `${DB_NAME}: ${docs.length} event-priced stylist(s) with a fixed state charge saved.`
  );

  let updatedSettings = 0;
  let updatedEvents = 0;

  for (const setting of docs) {
    let user = null;
    if (ObjectId.isValid(setting.user_id)) {
      user = await users.findOne(
        { _id: new ObjectId(setting.user_id) },
        { projection: { email: 1, username: 1 } }
      );
    }
    const who = user?.username ?? user?.email ?? setting.user_id;
    const fees = setting.travel?.region_prices ?? {};
    const events = await packages.find({ user_id: setting.user_id }).toArray();
    const pricedStates = REGION_IDS.filter(
      (id) => typeof fees[id] === "number"
    );

    console.log(
      `${apply ? "update" : "would update"} ${who}: ` +
        `${pricedStates.length} state fee(s), ${events.length} event(s), ` +
        `region_mode ${setting.travel?.region_mode ?? "(missing)"}`
    );

    for (const event of events) {
      const next = statePrices(event.price, fees);
      if (Object.keys(next).length === 0) {
        console.log(`  event "${event.name}": no state fees to copy`);
        continue;
      }
      const unchanged = samePrices(event.region_prices, next);
      console.log(
        `  event "${event.name}" (price ${event.price ?? 0}): ` +
          `${unchanged ? "already" : apply ? "set" : "would set"} ${JSON.stringify(next)}`
      );
      if (!apply || unchanged) continue;
      await packages.updateOne(
        { _id: event._id },
        { $set: { region_prices: next, updated_at: new Date() } }
      );
      updatedEvents += 1;
    }

    if (!apply) continue;
    await settings.updateOne(
      { _id: setting._id },
      { $set: { "travel.region_mode": "per_event", updated_at: new Date() } }
    );
    updatedSettings += 1;
  }

  const styleCount = await settings.countDocuments({
    charge_by: "style",
    "travel.mode": "region",
    "travel.region_mode": { $ne: "per_event" },
  });
  console.log(
    `${styleCount} stylist(s) charge by style with a fixed state price; left unchanged.`
  );
  console.log(
    apply
      ? `Updated ${updatedSettings} settings and ${updatedEvents} event(s).`
      : "Dry run. Re-run with --apply to update them."
  );
} finally {
  await client.close();
}
