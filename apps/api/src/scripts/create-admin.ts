import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectDatabase } from '@/database/mongoose.js';
import { UserModel } from '@/database/models/user.model.js';

async function main(): Promise<void> {
  const [email, password, name = 'Admin'] = process.argv.slice(2);
  if (!email || !password) {
    console.error('Usage: pnpm seed:admin <email> <password> [name]');
    process.exit(1);
  }

  await connectDatabase();

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await UserModel.findOneAndUpdate(
    { email },
    { email, name, passwordHash, role: 'admin' },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  console.log(`Admin user ready: ${user.email} (${user._id.toString()})`);
  process.exit(0);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
