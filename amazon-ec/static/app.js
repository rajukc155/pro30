document.addEventListener("DOMContentLoaded", () => {
  fetchProducts();
});

function fetchProducts() {
  fetch("/api/products")
    .then((response) => response.json())
    .then((products) => {
      const listDiv = document.getElementById("product-list");
      listDiv.innerHTML = "";

      if (products.length === 0) {
        listDiv.innerHTML = "<p>No products available.</p>";
        return;
      }

      products.forEach((product) => {
        const card = document.createElement("div");
        card.className = "product-card";
        const imageUrl = product.image || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80";

        card.innerHTML = `
          <div class="product-row">
            <img class="product-image" src="${imageUrl}" alt="${escapeHtml(product.name)}" loading="lazy">
            <div class="product-content">
              <div class="product-title">
                <a href="detail.html?id=${product.id}">${escapeHtml(product.name)}</a>
              </div>
              <div class="price">$${product.price.toLocaleString()}</div>
              <div class="product-description">${escapeHtml(product.description || "")}</div>
              <div class="order-form">
                <label for="qty-${product.id}">Qty:</label>
                <input type="number" id="qty-${product.id}" value="1" min="1" style="width: 60px;">
                <button type="button" class="buy-now-btn">Buy Now</button>
                <button type="button" class="add-to-cart-btn btn-secondary">Add to Cart</button>
              </div>
            </div>
          </div>
        `;

        const buyNowButton = card.querySelector(".buy-now-btn");
        buyNowButton.addEventListener("click", () => orderProduct(product.id));

        const addToCartButton = card.querySelector(".add-to-cart-btn");
        addToCartButton.addEventListener("click", () => addToCart(product.id, product.name, product.price));

        listDiv.appendChild(card);
      });
    })
    .catch((error) => {
      console.error("Error fetching products:", error);
      document.getElementById("product-list").innerText = "Failed to load products.";
    });
}

function addToCart(productId, productName, productPrice) {
  const qtyInput = document.getElementById(`qty-${productId}`);
  const quantity = parseInt(qtyInput.value, 10);

  if (Number.isNaN(quantity) || quantity <= 0) {
    alert("Please enter a valid quantity.");
    return;
  }

  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const existingItemIndex = cart.findIndex((item) => item.id === productId);

  if (existingItemIndex > -1) {
    cart[existingItemIndex].quantity += quantity;
  } else {
    cart.push({
      id: productId,
      name: productName,
      price: productPrice,
      quantity: quantity,
    });
  }

  localStorage.setItem("cart", JSON.stringify(cart));

  const msgDiv = document.getElementById("message");
  if (msgDiv) {
    msgDiv.innerText = `${productName} added to cart.`;
    msgDiv.style.display = "block";
    setTimeout(() => {
      msgDiv.style.display = "none";
    }, 2500);
  }
}

function orderProduct(productId) {
  const qtyInput = document.getElementById(`qty-${productId}`);
  const quantity = parseInt(qtyInput.value, 10);

  if (Number.isNaN(quantity) || quantity <= 0) {
    alert("Please enter a valid quantity.");
    return;
  }

  const payload = {
    product_id: productId,
    quantity: quantity,
  };

  fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Order failed");
      }
      return response.json();
    })
    .then((data) => {
      const msgDiv = document.getElementById("message");
      msgDiv.innerText = data.message;
      msgDiv.style.display = "block";
      setTimeout(() => {
        msgDiv.style.display = "none";
      }, 3000);
    })
    .catch((error) => {
      console.error("Error creating order:", error);
      alert("Order failed. Please try again.");
    });
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>\"']/g, (character) => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return map[character] || character;
  });
}
