document.addEventListener("DOMContentLoaded", () => {
  const cartItemsContainer = document.getElementById("cart-items");
  const totalPriceElement = document.getElementById("total-price");

  // Read cart array from localStorage
  const cart = JSON.parse(localStorage.getItem("cart")) || [];

  if (cart.length === 0) {
    cartItemsContainer.innerHTML = '<tr><td colspan="4" style="text-align: center;">Your cart is empty</td></tr>';
    totalPriceElement.textContent = "$0";
    return;
  }

  let totalAmount = 0;
  cartItemsContainer.innerHTML = "";

  // Render each cart item into table row
  cart.forEach((item) => {
    const subtotal = item.price * item.quantity;
    totalAmount += subtotal;

    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${escapeHtml(item.name)}</td>
      <td>$${item.price.toLocaleString()}</td>
      <td>${item.quantity}</td>
      <td>$${subtotal.toLocaleString()}</td>
    `;

    cartItemsContainer.appendChild(row);
  });

  // Display grand total amount
  totalPriceElement.textContent = `$${totalAmount.toLocaleString()}`;
});

// HTML escaping helper function for security (XSS prevention)
function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}