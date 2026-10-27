
export function getLoggedInCustomer() {
  try {
    return JSON.parse(localStorage.getItem("customer") || "null");
  } catch {
    return null;
  }
}

export function getCustomerId() {
  const customer = getLoggedInCustomer();
  return customer?._id || customer?.id || null;
}

export function getCartKey(customerId) {
  return `localshop_cart_${customerId}`;
}

export function getCart(customerId) {
  if (!customerId) return [];

  try {
    const cart = JSON.parse(
      localStorage.getItem(getCartKey(customerId)) || "[]"
    );

    return Array.isArray(cart) ? cart : [];
  } catch {
    return [];
  }
}

export function saveCart(customerId, cart) {
  if (!customerId) return;

  localStorage.setItem(
    getCartKey(customerId),
    JSON.stringify(cart)
  );
}
