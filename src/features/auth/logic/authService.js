export async function loginCustomerGraph({ email, password, roleId }) {
  // Backend API connect karne ke time yaha fetch/axios call add karna.
  // Abhi UI test ke liye payload return kar raha hai.
  return {
    ok: true,
    email,
    password,
    roleId,
  };
}
