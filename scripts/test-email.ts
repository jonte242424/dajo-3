/**
 * Kör: npx tsx scripts/test-email.ts [mottagare]
 * Skickar ett riktigt välkomstmejl för att testa SMTP end-to-end.
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

// Dynamisk import så att email.ts läser env EFTER att dotenv kört.
const { sendPilotWelcome, notifyAdminOfSignup } = await import("../server/email.js");

const to = process.argv[2] ?? "hello@dajo.club";

console.log(`→ Skickar test-mejl till ${to} …`);

await sendPilotWelcome({
  email: to,
  name: "DAJO-teamet",
  instrument: "Piano",
});

await notifyAdminOfSignup({
  adminEmail: "hello@dajo.club",
  signup: {
    email: "testanvändare@exempel.se",
    name: "Testanvändare",
    instrument: "Saxofon",
  },
  totalCount: 1,
});

console.log("✅ Klart — kolla inkorgen.");
