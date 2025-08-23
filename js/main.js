import { createNewUser } from './auth.js';

async function test() {
  const result = await createNewUser('hruiz', '123456');
  console.log(result);
}

test();
