// Set a new password for an existing user, from the terminal.
// Use it if you forget your password:  npm run user:reset-password
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const rl = createInterface({ input: stdin, output: stdout, terminal: stdin.isTTY });
const lines = rl[Symbol.asyncIterator]();

async function ask(question) {
  stdout.write(question);
  const { value, done } = await lines.next();
  if (done) throw new Error("No input given.");
  return value;
}

try {
  const email = (await ask("Email: ")).trim().toLowerCase();
  const user = await db.user.findUnique({ where: { email } });
  if (!user) throw new Error(`No user with email ${email}.`);

  const password = await ask("New password (min. 8 characters): ");
  if (password.length < 8) throw new Error("Password must be at least 8 characters.");

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(password, 12) },
  });
  console.log(`Password updated for ${email}.`);
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  rl.close();
  await db.$disconnect();
}
