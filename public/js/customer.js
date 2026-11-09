    const API_URL = '/api';

let menuItems = [];
let cart = [];

function formatCurrency(amount) {
    return '₱' + Number(amount).toFixed(2);
}

async function loadMenu() {
    try {
        const response = await fetch(`${API_URL}/menu`);

        if (!response.ok) {
            throw new Error('Failed to load menu.');
        }

        menuItems = await response.json();
        displayOrderMenu();

    } catch (error) {
        console.error(error);
        document.getElementById('orderMenuList').innerHTML =
            '<p>Unable to load menu.</p>';
    }
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[character]);
}

function displayOrderMenu() {
    const container = document.getElementById('orderMenuList');
    const categoryFilter = document.getElementById('orderCategoryFilter');

    const selectedCategory = categoryFilter
        ? categoryFilter.value
        : 'All';

    const availableItems = menuItems.filter(item => {
        return item.available &&
            (selectedCategory === 'All' ||
                item.category === selectedCategory);
    });

    if (availableItems.length === 0) {
        container.innerHTML = '<p>No available menu items in this category.</p>';
        return;
    }

    container.innerHTML = availableItems.map(item => `
        <div class="menu-option">
            <div>
                <strong>${escapeHTML(item.name)}</strong>
                <p>${escapeHTML(item.category)}</p>
                <p>${formatCurrency(item.price)}</p>
            </div>

            <button onclick="addToCart('${item._id}')">
                Add
            </button>
        </div>
    `).join('');
}

function addToCart(id) {
    const item = menuItems.find(menuItem => menuItem._id === id);

    if (!item || !item.available) return;

    const existingItem = cart.find(cartItem => cartItem.menuItemId === id);

    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({
            menuItemId: item._id,
            name: item.name,
            price: item.price,
            quantity: 1
        });
    }

    displayCart();
}

function displayCart() {
    const tableBody = document.getElementById('cartTableBody');

    if (cart.length === 0) {
        tableBody.innerHTML =
            '<tr><td colspan="5">No items added.</td></tr>';

        document.getElementById('orderTotal').textContent =
            'Total: ₱0.00';

        return;
    }

    let total = 0;

    tableBody.innerHTML = cart.map((item, index) => {
        const subtotal = item.price * item.quantity;
        total += subtotal;

        return `
            <tr>
                <td>${escapeHTML(item.name)}</td>
                <td>${formatCurrency(item.price)}</td>

                <td>
                    <input
                        class="quantity-input"
                        type="number"
                        min="1"
                        step="1"
                        value="${item.quantity}"
                        onchange="updateCartQuantity(${index}, this.value)"
                    >
                </td>

                <td>${formatCurrency(subtotal)}</td>

                <td>
                    <button class="action-button delete-button"
                        onclick="removeFromCart(${index})">
                        Remove
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    document.getElementById('orderTotal').textContent =
        'Total: ' + formatCurrency(total);
}

function updateCartQuantity(index, quantity) {
    const newQuantity = Number(quantity);

    if (!Number.isInteger(newQuantity) || newQuantity < 1) {
        alert('Quantity must be at least 1.');
        displayCart();
        return;
    }

    cart[index].quantity = newQuantity;
    displayCart();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    displayCart();
}

document.getElementById('placeOrderButton').addEventListener('click', async function () {
    if (cart.length === 0) {
        alert('Please add items to the order first.');
        return;
    }

    const orderData = {
        items: cart.map(item => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity
        }))
    };

    try {
        const response = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Unable to create order.');
        }

        alert('Order placed successfully!');

        cart = [];
        displayCart();

    } catch (error) {
        alert(error.message);
    }
});

document.getElementById('orderCategoryFilter')
    .addEventListener('change', displayOrderMenu);

loadMenu();