import bcryptjs from "bcryptjs";

async function hash(password) {
  const rounds = getNumberOfRounds();
  return bcryptjs.hash(password, rounds);
}

function getNumberOfRounds() {
  return process.env.NODE_EN === "production" ? 14 : 1;
}

async function compare(providePassword, storedPassword) {
  return bcryptjs.compare(providePassword, storedPassword);
}

const password = {
  hash,
  compare,
};

export default password;
