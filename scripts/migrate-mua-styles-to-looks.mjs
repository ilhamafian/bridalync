// Moves makeup artists' style categories from `styles` into `looks`.
//
//   node --env-file=.env scripts/migrate-mua-styles-to-looks.mjs           dry run (prints what would move)
//   node --env-file=.env scripts/migrate-mua-styles-to-looks.mjs --apply   move them
//
// Each doc keeps its `_id`, so bookings (`styleId` = "{id}:{variantOrder}") and hot date
// overrides still point at it. A variant's `image_url` becomes the first entry of `image_urls`.
// Safe to re-run: docs already in `looks` are skipped.

import { MongoClient } from "mongodb";

const apply = process.argv.includes("--apply");

const { MONGODB_URI } = process.env;
const DB_NAME = process.env.MONGODB_DATABASE ?? process.env.DB_NAME;
if (!MONGODB_URI || !DB_NAME) {
  throw new Error("MONGODB_URI and MONGODB_DATABASE (or DB_NAME) are required");
}

function toLook(style) {
  return {
    ...style,
    variants: (style.variants ?? []).map(({ image_url, ...variant }) => ({
      ...variant,
      image_urls: image_url ? [image_url] : [],
    })),
  };
}

const client = new MongoClient(MONGODB_URI);
try {
  await client.connect();
  const db = client.db(DB_NAME);
  const styles = db.collection("styles");
  const looks = db.collection("looks");

  const artists = await db
    .collection("users")
    .find({ role: "makeupartist" }, { projection: { _id: 1, email: 1 } })
    .toArray();
  const artistIds = artists.map((user) => String(user._id));

  const docs = await styles.find({ user_id: { $in: artistIds } }).toArray();
  console.log(
    `${DB_NAME}: ${artists.length} makeup artist(s), ${docs.length} style doc(s) to move.`
  );

  let moved = 0;
  for (const doc of docs) {
    const exists = await looks.findOne({ _id: doc._id });
    const email = artists.find((user) => String(user._id) === doc.user_id)?.email;
    console.log(
      `${exists ? "skip (already a look)" : apply ? "move" : "would move"}: ` +
        `"${doc.name}" (${doc.variants?.length ?? 0} variants) for ${email ?? doc.user_id}`
    );
    if (!apply) continue;
    if (!exists) await looks.insertOne(toLook(doc));
    await styles.deleteOne({ _id: doc._id });
    moved += 1;
  }

  console.log(apply ? `Moved ${moved} doc(s).` : "Dry run. Re-run with --apply to move them.");
} finally {
  await client.close();
}
