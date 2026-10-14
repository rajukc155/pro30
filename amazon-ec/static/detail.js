document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get("id");
  let currentProduct = null;

  if (productId) {
    fetch(`/api/products/detail?id=${productId}`)
      .then((response) => response.json())
      .then((data) => {
        currentProduct = data;
        const image = document.getElementById("product-image");
        const fallbackImage = "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80";

        document.getElementById("product-name").textContent = data.name;
        document.getElementById("product-price").textContent = `Price: $${data.price.toLocaleString()}`;
        document.getElementById("product-description").textContent = data.description || "";
        image.src = data.image || fallbackImage;
        image.alt = data.name;
        image.hidden = false;
      })
      .catch((error) => console.error("Failed to fetch product details:", error));
  }

  const orderButton = document.getElementById("order-button");
  if (orderButton) {
    orderButton.addEventListener("click", () => {
      const quantity = parseInt(document.getElementById("quantity").value, 10) || 1;
      fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: parseInt(productId, 10), quantity: quantity }),
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

  const addToCartButton = document.getElementById("add-to-cart-button");
  if (addToCartButton) {
    addToCartButton.addEventListener("click", () => {
      if (!currentProduct) return;

      const quantityInput = document.getElementById("quantity");
      const quantity = parseInt(quantityInput.value, 10);

      if (Number.isNaN(quantity) || quantity < 1) {
        alert("Please enter a valid quantity");
        return;
      }

      const cart = JSON.parse(localStorage.getItem("cart")) || [];
      const existingItemIndex = cart.findIndex((item) => item.id === currentProduct.id);

      if (existingItemIndex > -1) {
        cart[existingItemIndex].quantity += quantity;
      } else {
        cart.push({
          id: currentProduct.id,
          name: currentProduct.name,
          price: currentProduct.price,
          quantity: quantity,
        });
      }

      localStorage.setItem("cart", JSON.stringify(cart));

      const cartMessage = document.getElementById("cart-message");
      if (cartMessage) {
        cartMessage.textContent = `${currentProduct.name} added to cart`;
        setTimeout(() => {
          cartMessage.textContent = "";
        }, 3000);
      }
    });
  }
});
