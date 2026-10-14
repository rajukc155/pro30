document.addEventListener("DOMContentLoaded", () => {
  // Extract product ID from URL query parameters
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get("id");

  let currentProduct = null;

  // Fetch product detail data using existing API endpoint
  if (productId) {
    fetch(`/api/products/detail?id=${productId}`)
      .then((response) => response.json())
      .then((data) => {
        currentProduct = data;
        document.getElementById("product-name").textContent = data.name;
        document.getElementById("product-price").textContent = `Price: $${data.price.toLocaleString()}`;
        document.getElementById("product-description").textContent = data.description || "";
      })
      .catch((error) => console.error("Failed to fetch product details:", error));
  }

  // Existing feature: Direct order from detail page (retained unchanged)
  const orderButton = document.getElementById("order-button");
  if (orderButton) {
    orderButton.addEventListener("click", () => {
      const quantity = parseInt(document.getElementById("quantity").value, 10) || 1;
      fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: parseInt(productId, 10), quantity: quantity })
      })
        .then((response) => {
          if (response.ok) {
            alert("Order placed successfully");
            window.location.href = "index.html";
          } else {
            alert("Failed to place order");
          }
        })
        .catch((error) => console.error("Order error:", error));
    });
  }

  // Added in this update: Add to cart functionality
  const addToCartButton = document.getElementById("add-to-cart-button");
  if (addToCartButton) {
    addToCartButton.addEventListener("click", () => {
      if (!currentProduct) return;

      const quantityInput = document.getElementById("quantity");
      const quantity = parseInt(quantityInput.value, 10);

      if (isNaN(quantity) || quantity < 1) {
        alert("Please enter a valid quantity");
        return;
      }

      // Retrieve existing cart array from localStorage (or initialize empty array)
      let cart = JSON.parse(localStorage.getItem("cart")) || [];

      // Check if product already exists in cart
      const existingItemIndex = cart.findIndex((item) => item.id === currentProduct.id);

      if (existingItemIndex > -1) {
        // Increment quantity if item already exists
        cart[existingItemIndex].quantity += quantity;
      } else {
        // Append new item to cart array (id, name, price, quantity)
        cart.push({
          id: currentProduct.id,
          name: currentProduct.name,
          price: currentProduct.price,
          quantity: quantity
        });
      }

      // Save updated cart back to localStorage
      localStorage.setItem("cart", JSON.stringify(cart));

      // Display user feedback message
      const cartMessage = document.getElementById("cart-message");
      if (cartMessage) {
        cartMessage.textContent = "Item added to cart";
        setTimeout(() => {
          cartMessage.textContent = "";
        }, 3000);
      }
    });
  }
});