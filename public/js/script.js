
const API_URL = '/api';

let menuItems = [];
let orders = [];
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

        displayMenu();
        displayOrderMenu();
        updateDashboard();

    } catch (error) {
        console.error(error);
        document.getElementById('menuTableBody').innerHTML =
            '<tr><td colspan="5">Unable to load menu.</td></tr>';
    }
}

function displayMenu() {
    const tableBody = document.getElementById('menuTableBody');

    if (menuItems.length === 0) {
        tableBody.innerHTML =
            '<tr><td colspan="5">No menu items found.</td></tr>';
        return;
    }

    tableBody.innerHTML = menuItems.map(item => `
        <tr>
            <td>${escapeHTML(item.name)}</td>
            <td>${escapeHTML(item.category)}</td>
            <td>${formatCurrency(item.price)}</td>
            <td>${item.available ? 'Available' : 'Unavailable'}</td>
            <td>
                <button class="action-button"
                    onclick="editMenuItem('${item._id}')">
                    Edit
                </button>

                <button class="action-button delete-button"
                    onclick="deleteMenuItem('${item._id}')">
                    Delete
                </button>
            </td>
        </tr>
    `).join('');
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

document.getElementById('menuForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const id = document.getElementById('menuItemId').value;

    const itemData = {
        name: document.getElementById('itemName').value.trim(),
        category: document.getElementById('itemCategory').value,
        price: Number(document.getElementById('itemPrice').value),
        available: document.getElementById('itemAvailable').checked
    };

    if (!itemData.name || !Number.isFinite(itemData.price) || itemData.price <= 0) {
        alert('Please enter a valid item name and price.');
        return;
    }

    try {
        const response = await fetch(
            id ? `${API_URL}/menu/${id}` : `${API_URL}/menu`,
            {
                method: id ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(itemData)
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Unable to save menu item.');
        }

        alert(id ? 'Menu item updated!' : 'Menu item added!');

        resetMenuForm();
        await loadMenu();

    } catch (error) {
        alert(error.message);
    }
});

function editMenuItem(id) {
    const item = menuItems.find(menuItem => menuItem._id === id);

    if (!item) return;

    document.getElementById('menuItemId').value = item._id;
    document.getElementById('itemName').value = item.name;
    document.getElementById('itemCategory').value = item.category;
    document.getElementById('itemPrice').value = item.price;
    document.getElementById('itemAvailable').checked = item.available;

    document.getElementById('menuSubmitButton').textContent = 'Update Item';
    document.getElementById('cancelEditButton').hidden = false;

    document.getElementById('menu').scrollIntoView({
        behavior: 'smooth'
    });
}

function resetMenuForm() {
    document.getElementById('menuForm').reset();
    document.getElementById('menuItemId').value = '';
    document.getElementById('itemAvailable').checked = true;
    document.getElementById('menuSubmitButton').textContent = 'Add Item';
    document.getElementById('cancelEditButton').hidden = true;
}

document.getElementById('cancelEditButton').addEventListener('click', resetMenuForm);

async function deleteMenuItem(id) {
    const confirmed = confirm('Are you sure you want to delete this menu item?');

    if (!confirmed) return;

    try {
        const response = await fetch(`${API_URL}/menu/${id}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Unable to delete menu item.');
        }

        alert('Menu item deleted!');

        await loadMenu();

    } catch (error) {
        alert(error.message);
    }
}

function displayOrderMenu() {
    const container = document.getElementById('orderMenuList');

    const availableItems = menuItems.filter(item => item.available);

    if (availableItems.length === 0) {
        container.innerHTML = '<p>No available menu items.</p>';
        return;
    }

    container.innerHTML = availableItems.map(item => `
        <div class="menu-option">
            <div>
                <strong>${escapeHTML(item.name)}</strong>
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

document.getElementById('placeOrderButton').addEventListener('click', async function() {
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

        await loadOrders();
        await loadDailySales();

    } catch (error) {
        alert(error.message);
    }
});

async function loadOrders() {
    try {
        const response = await fetch(`${API_URL}/orders`);

        if (!response.ok) {
            throw new Error('Failed to load orders.');
        }

        orders = await response.json();

        displayOrders();
        updateDashboard();

    } catch (error) {
        console.error(error);
        document.getElementById('ordersTableBody').innerHTML =
            '<tr><td colspan="6">Unable to load orders.</td></tr>';
    }
}

function displayOrders() {
    const tableBody = document.getElementById('ordersTableBody');

    if (orders.length === 0) {
        tableBody.innerHTML =
            '<tr><td colspan="6">No orders found.</td></tr>';
        return;
    }

    tableBody.innerHTML = orders.map(order => {
        const itemNames = order.items.map(item =>
            `${escapeHTML(item.itemName)} x ${item.quantity}`
        ).join(', ');

        const date = new Date(order.createdAt).toLocaleString();

        return `
            <tr>
                <td>${escapeHTML(order._id.slice(-6))}</td>
                <td>${itemNames}</td>
                <td>${formatCurrency(order.totalAmount)}</td>
                <td>
                    <span class="status-${order.status.toLowerCase()}">
                        ${escapeHTML(order.status)}
                    </span>
                </td>
                <td>${date}</td>
                <td>
                    ${order.status === 'Pending'
                        ? `<button onclick="markAsServed('${order._id}')">
                            Mark Served
                           </button>`
                        : 'Completed'
                    }
                </td>
            </tr>
        `;
    }).join('');
}

async function markAsServed(id) {
    try {
        const response = await fetch(`${API_URL}/orders/${id}/serve`, {
            method: 'PUT'
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Unable to update order.');
        }

        alert('Order marked as served!');

        await loadOrders();
        await loadDailySales();

    } catch (error) {
        alert(error.message);
    }
}

async function loadDailySales() {
    try {
        const response = await fetch(`${API_URL}/orders/sales/daily`);

        if (!response.ok) {
            throw new Error('Failed to load daily sales.');
        }

        const sales = await response.json();

        document.getElementById('dailySales').textContent =
            formatCurrency(sales.totalSales);

        document.getElementById('dailyOrderCount').textContent =
            `${sales.totalOrders} served orders`;

        document.getElementById('dashboardSales').textContent =
            formatCurrency(sales.totalSales);

    } catch (error) {
        console.error(error);
    }
}

function updateDashboard() {
    document.getElementById('menuCount').textContent = menuItems.length;
    document.getElementById('orderCount').textContent = orders.length;
}

document.getElementById('refreshSalesButton').addEventListener('click', loadDailySales);

async function initializeApp() {
    await loadMenu();
    await loadOrders();
    await loadDailySales();
}

initializeApp();
