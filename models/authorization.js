function can(user, feature) {
  let authorized = false;
  if (user.features.includes(feature)) {
    authorized = true;
  }
  return authorized;
}

export const authorization = {
  can,
};
