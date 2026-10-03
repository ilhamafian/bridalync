// Seeds demo bookings for a stylist account on a non-production database.
//
//   node --env-file=.env scripts/seed-bookings.mjs [email]          insert
//   node --env-file=.env scripts/seed-bookings.mjs [email] --clean  remove seeded bookings
//
// Seeded bookings are identifiable by contact emails ending in SEED_EMAIL_DOMAIN.

import { randomUUID } from "node:crypto";
import { MongoClient, ObjectId } from "mongodb";

const SEED_EMAIL_DOMAIN = "seed.bridalync.test";
const DEFAULT_EMAIL = "yana.nazri5@gmail.com";

const args = process.argv.slice(2);
const clean = args.includes("--clean");
const email = args.find((a) => !a.startsWith("--")) ?? DEFAULT_EMAIL;

const { MONGODB_URI, DB_NAME } = process.env;
if (!MONGODB_URI || !DB_NAME) throw new Error("MONGODB_URI and DB_NAME are required");
if (!/staging|dev|test|local/i.test(DB_NAME)) {
  throw new Error(`Refusing to seed database "${DB_NAME}" (not staging/dev)`);
}

const VENUES = [
  {
    placeId: "ChIJD7nZaM83zDERbqVXVcDER88",
    formattedAddress:
      "121, Jln Ampang, Kuala Lumpur, 50450 Kuala Lumpur, Wilayah Persekutuan Kuala Lumpur, Malaysia",
    displayName: "W Kuala Lumpur",
    location: { lat: 3.158464, lng: 101.7094092 },
  },
  {
    placeId: "ChIJuUdYSik2zDERenN64f1rrqE",
    formattedAddress:
      "B-11-3, Jalan Walter Granier, Bukit Bintang, 55100 Kuala Lumpur, Wilayah Persekutuan Kuala Lumpur, Malaysia",
    displayName: "Hotel Royal Kuala Lumpur",
    location: { lat: 3.1452812, lng: 101.7123186 },
  },
  {
    placeId: "ChIJ0-S5bcVJzDERm6UGd_zP2Ik",
    formattedAddress:
      "Persiaran Masjid, Presint 1, 62000 Putrajaya, Wilayah Persekutuan Putrajaya, Malaysia",
    displayName: "Masjid Putra",
    location: { lat: 2.9360446, lng: 101.6893669 },
  },
  {
    placeId: "ChIJ5-rvAcdJzDERfSgcL1uO2fQ",
    formattedAddress:
      "Jalan Bukit Kiara, Taman Tun Dr Ismail, 60000 Kuala Lumpur, Wilayah Persekutuan Kuala Lumpur, Malaysia",
    displayName: "Kiara Hall",
    location: { lat: 3.1451, lng: 101.6293 },
  },
  {
    placeId: "ChIJs8hXJ8BNzDERqIbBb2v2lP8",
    formattedAddress:
      "Persiaran Kayangan, Seksyen 7, 40000 Shah Alam, Selangor, Malaysia",
    displayName: "Glenmarie Ballroom",
    location: { lat: 3.0733, lng: 101.5185 },
  },
  {
    placeId: "ChIJv8b5qWZMzDERlCq0r3Zk7zM",
    formattedAddress:
      "Jalan SS 2/24, SS 2, 47300 Petaling Jaya, Selangor, Malaysia",
    displayName: "Client's Home, SS2",
    location: { lat: 3.1179, lng: 101.6216 },
  },
];

const CLIENTS = [
  ["Aisyah Rahman", "123456781"],
  ["Nurul Izzati", "134567892"],
  ["Farah Hanim", "145678903"],
  ["Siti Khadijah", "156789014"],
  ["Amira Sofea", "167890125"],
  ["Balqis Zulaikha", "178901236"],
  ["Nadia Iman", "189012347"],
  ["Hani Syuhada", "190123458"],
  ["Qistina Alya", "112345679"],
  ["Damia Huda", "113456780"],
  ["Liyana Aziz", "114567891"],
  ["Insyirah Wan", "115678902"],
  ["Sarah Dayana", "116789013"],
  ["Mira Filzah", "117890124"],
  ["Ain Nabila", "118901235"],
  ["Zara Adriana", "119012346"],
  ["Elyana Yusof", "122345670"],
  ["Hanna Delisha", "123456700"],
  ["Syafiqah Noor", "124567811"],
  ["Batrisyia Kamal", "125678922"],
  ["Puteri Maisarah", "126789033"],
  ["Irdina Sofia", "127890144"],
];

const SLOTS = [
  { startTime: "06:00", endTime: "08:00" },
  { startTime: "08:30", endTime: "10:30" },
  { startTime: "11:00", endTime: "13:00" },
  { startTime: "14:00", endTime: "16:00" },
  { startTime: "17:00", endTime: "19:00" },
];

// [packageName, dayOffsetFromToday, status, payment, slotIndex]
// payment: "deposit" (deposit paid), "full" (fully paid), "unpaid", "pending_receipt"
const PLAN = [
  ["Nikah", 0, "confirmed", "deposit", 0],
  ["Photoshoot", 0, "confirmed", "full", 3],
  ["Trial Makeup", 1, "confirmed", "deposit", 2],
  ["Sanding", 2, "confirmed", "deposit", 1],
  ["Konvo", 4, "confirmed", "full", 1],
  ["Nikah & Sanding", 6, "confirmed", "deposit", 0],
  ["Tunang", 7, "pending", "pending_receipt", 3],
  ["Nikah", 10, "confirmed", "deposit", 1],
  ["Photoshoot", 12, "cancelled", "unpaid", 4],
  ["Sanding", 16, "confirmed", "full", 2],
  ["Nikah & Sanding", 20, "pending", "pending_receipt", 0],
  ["Konvo", 27, "confirmed", "deposit", 3],
  ["Tunang", 41, "enquiry", "unpaid", 1],
  ["Nikah", 63, "enquiry", "unpaid", 0],
  ["Nikah", -2, "completed", "full", 1],
  ["Photoshoot", -4, "completed", "full", 3],
  ["Tunang", -6, "completed", "full", 2],
  ["Sanding", -9, "completed", "deposit", 0],
  ["Trial Makeup", -13, "completed", "full", 4],
  ["Nikah & Sanding", -21, "completed", "full", 0],
  ["Konvo", -30, "completed", "full", 1],
  ["Nikah", -5, "cancelled", "unpaid", 2],
];

/** Noon in Malaysia (UTC+8) on today + offset, matching how the app stores session dates. */
function sessionDate(dayOffset) {
  const nowMy = new Date(Date.now() + 8 * 3600_000);
  return new Date(
    Date.UTC(nowMy.getUTCFullYear(), nowMy.getUTCMonth(), nowMy.getUTCDate() + dayOffset, 4)
  );
}

function slug(name) {
  return name.toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "");
}

const client = await MongoClient.connect(MONGODB_URI);
try {
  const db = client.db(DB_NAME);
  const user = await db.collection("users").findOne({ email });
  if (!user) throw new Error(`No user with email ${email}`);
  const userId = String(user._id);
  const bookings = db.collection("bookings");
  const seedFilter = {
    freelancerUserId: userId,
    "contact.email": { $regex: `@${SEED_EMAIL_DOMAIN.replace(/\./g, "\\.")}$` },
  };

  if (clean) {
    const { deletedCount } = await bookings.deleteMany(seedFilter);
    console.log(`Removed ${deletedCount} seeded bookings for ${email}`);
  } else {
    await seed(db, user, userId, bookings);
  }
} finally {
  await client.close();
}

async function seed(db, user, userId, bookings) {
  const packages = await db
    .collection("packages")
    .find({ user_id: { $in: [userId, user._id] } })
    .toArray();
  const byName = new Map(packages.map((p) => [p.name, p]));
  if (byName.size === 0) throw new Error(`User ${email} has no packages`);

  const receiptSource = await bookings.findOne(
    { depositReceiptUrl: { $exists: true, $ne: "" } },
    { projection: { depositReceiptUrl: 1 } }
  );
  const receiptUrl = receiptSource?.depositReceiptUrl;

  const docs = PLAN.map(([pkgName, offset, status, payment, slotIdx], i) => {
    const pkg = byName.get(pkgName) ?? packages[i % packages.length];
    const [name, mobile] = CLIENTS[i % CLIENTS.length];
    const packageId = String(pkg._id);
    const total = pkg.price + (i % 3) * 50;
    const isSplit = pkg.name === "Nikah & Sanding";

    const sessions = (isSplit ? ["Nikah", "Sanding"] : [pkg.name]).map((sessionName, order) => ({
      status: status === "cancelled" ? "cancelled" : status === "completed" ? "completed" : "scheduled",
      name: sessionName,
      packageId,
      order,
      date: sessionDate(offset + order),
      time_slot: SLOTS[(slotIdx + order) % SLOTS.length],
      location: VENUES[(i + order) % VENUES.length],
      client_key: randomUUID(),
    }));

    const paymentOption = payment === "full" ? "full" : "deposit";
    const depositRm = paymentOption === "full" ? total : pkg.deposit;
    const balanceRm = payment === "full" ? 0 : total - depositRm;
    const createdAt = new Date(sessionDate(Math.min(offset, 0) - 14 - (i % 10)).getTime() + i * 3600_000);

    const doc = {
      _id: new ObjectId(),
      freelancerUsername: user.username,
      freelancerUserId: userId,
      contact: {
        name,
        email: `${slug(name)}@${SEED_EMAIL_DOMAIN}`,
        mobile,
        country_code: "+60",
      },
      packageIds: [packageId],
      packageNames: pkg.name,
      addOnIds: [],
      sessions,
      invoice: {
        lineItems: [{ label: pkg.name, amountRm: pkg.price }].concat(
          total > pkg.price ? [{ label: "Travel fee", amountRm: total - pkg.price }] : []
        ),
        totalRm: total,
        depositRm,
        balanceRm,
      },
      paymentOption,
      status,
      source: "bridalync",
      created_at: createdAt,
      updated_at: createdAt,
    };

    if (payment !== "unpaid") {
      doc.paymentChannel = "manual_transfer";
      doc.depositVerificationStatus = payment === "pending_receipt" ? "pending" : "approved";
      if (payment === "pending_receipt" && receiptUrl) doc.depositReceiptUrl = receiptUrl;
    }
    return doc;
  });

  const { insertedCount } = await bookings.insertMany(docs);
  const total = await bookings.countDocuments({ freelancerUserId: userId });
  console.log(`Inserted ${insertedCount} bookings for ${email} (${user.username}); total now ${total}`);
}
