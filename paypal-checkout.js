// Cart management
const CART_STORAGE_KEY = 'mucoki_cart';

// Get cart from localStorage
function getCart() {
    const cart = localStorage.getItem(CART_STORAGE_KEY);
    return cart ? JSON.parse(cart) : [];
}

// Get customer email
function getCustomerEmail() {
    const email = document.getElementById('customer-email').value.trim();
    if (!email) {
        alert('Please enter your email address');
        return null;
    }
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('Please enter a valid email address');
        return null;
    }
    return email;
}

// Get customer name
function getCustomerName() {
    const name = document.getElementById('customer-name').value.trim();
    if (!name) {
        alert('Please enter your full name');
        return null;
    }
    return name;
}

// Display cart items
function displayCart() {
    const cart = getCart();
    const cartItemsContainer = document.getElementById('cart-items');
    const emptyState = document.getElementById('empty-state');
    const checkoutContent = document.getElementById('checkout-content');
    
    if (cart.length === 0) {
        checkoutContent.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    checkoutContent.style.display = 'block';
    emptyState.style.display = 'none';
    
    cartItemsContainer.innerHTML = '';
    let total = 0;
    
    cart.forEach((item, index) => {
        const price = parseFloat(item.price.replace('$', '').replace(',', ''));
        const quantity = item.quantity || 1;
        const itemTotal = price * quantity;
        total += itemTotal;
        
        const itemHTML = `
            <div class="product-details">
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <strong>${item.name}</strong>
                    <button type="button" onclick="removeFromCart(${index})" style="background: none; border: none; color: #d4af37; cursor: pointer; font-size: 1.2em;">×</button>
                </div>
                <div style="color: #666; font-size: 0.9em;">
                    Price: $${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div style="color: #666; font-size: 0.9em;">
                    Quantity: 
                    <input type="number" min="1" value="${quantity}" onchange="updateQuantity(${index}, this.value)" style="width: 50px; padding: 5px;">
                </div>
                <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #e0e0e0; color: #d4af37; font-weight: bold;">
                    Subtotal: $${itemTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
            </div>
        `;
        cartItemsContainer.innerHTML += itemHTML;
    });
    
    document.getElementById('total-amount').textContent = total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Remove item from cart
function removeFromCart(index) {
    const cart = getCart();
    cart.splice(index, 1);
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    displayCart();
    renderPayPalButton();
}

// Update quantity
function updateQuantity(index, newQuantity) {
    const cart = getCart();
    const quantity = parseInt(newQuantity) || 1;
    if (quantity > 0) {
        cart[index].quantity = quantity;
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
        displayCart();
        renderPayPalButton();
    }
}

// Calculate total amount
function getTotalAmount() {
    const cart = getCart();
    let total = 0;
    cart.forEach(item => {
        const price = parseFloat(item.price.replace('$', '').replace(',', ''));
        const quantity = item.quantity || 1;
        total += price * quantity;
    });
    return total.toFixed(2);
}

// Render PayPal Button
function renderPayPalButton() {
    const cart = getCart();
    
    if (cart.length === 0) {
        return;
    }
    
    const totalAmount = getTotalAmount();
    
    // Clear previous button
    const container = document.getElementById('paypal-button-container');
    container.innerHTML = '';
    
    paypal.Buttons({
        style: {
            layout: 'vertical',
            color: 'gold',
            shape: 'rect',
            label: 'pay',
            tagline: false
        },
        createOrder: function(data, actions) {
            // Validate customer information
            const email = getCustomerEmail();
            const name = getCustomerName();
            if (!email || !name) {
                return Promise.reject(new Error('Please fill in all required fields'));
            }
            
            // Create order with cart items
            const cart = getCart();
            const items = cart.map(item => {
                const price = parseFloat(item.price.replace('$', '').replace(',', ''));
                const quantity = item.quantity || 1;
                return {
                    name: item.name,
                    unit_amount: {
                        currency_code: 'USD',
                        value: price.toFixed(2)
                    },
                    quantity: quantity.toString()
                };
            });
            
            return actions.order.create({
                intent: 'CAPTURE',
                purchase_units: [{
                    amount: {
                        currency_code: 'USD',
                        value: totalAmount,
                        breakdown: {
                            item_total: {
                                currency_code: 'USD',
                                value: totalAmount
                            }
                        }
                    },
                    items: items,
                    description: 'Mucoki & Co. Luxury Jewelry Purchase',
                    custom_id: email
                }],
                application_context: {
                    brand_name: 'Mucoki & Co.',
                    locale: 'en-US',
                    landing_page: 'BILLING',
                    user_action: 'PAY_NOW',
                    return_url: window.location.origin + '/success.html',
                    cancel_url: window.location.origin + '/paypal-checkout.html'
                }
            });
        },
        onApprove: function(data, actions) {
            return actions.order.capture().then(function(orderData) {
                // Handle successful payment
                console.log('Order captured:', orderData);
                
                const email = document.getElementById('customer-email').value.trim();
                const name = document.getElementById('customer-name').value.trim();
                
                // Store order details
                const orderDetails = {
                    orderId: orderData.id,
                    status: orderData.status,
                    payerEmail: email || (orderData.payer ? orderData.payer.email_address : 'Not provided'),
                    payerName: name || (orderData.payer ? (orderData.payer.name.given_name + ' ' + orderData.payer.name.surname) : 'Not provided'),
                    amount: totalAmount,
                    items: getCart(),
                    timestamp: new Date().toISOString()
                };
                
                localStorage.setItem('lastOrder', JSON.stringify(orderDetails));
                
                // Clear cart
                localStorage.removeItem(CART_STORAGE_KEY);
                
                // Redirect to success page
                window.location.href = 'success.html?orderId=' + orderData.id;
            });
        },
        onError: function(err) {
            console.error('Payment error:', err);
            alert('An error occurred during payment. Please try again.');
        },
        onCancel: function(data) {
            console.log('Payment cancelled by user');
            alert('Payment was cancelled. Your cart has been saved.');
        }
    }).render('#paypal-button-container');
}

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    displayCart();
    renderPayPalButton();
    
    // Optional: Save email input to avoid re-entry
    const emailInput = document.getElementById('customer-email');
    const nameInput = document.getElementById('customer-name');
    
    if (emailInput) {
        emailInput.addEventListener('change', function() {
            sessionStorage.setItem('customer_email', this.value);
        });
        // Load saved email if available
        const savedEmail = sessionStorage.getItem('customer_email');
        if (savedEmail) emailInput.value = savedEmail;
    }
    
    if (nameInput) {
        nameInput.addEventListener('change', function() {
            sessionStorage.setItem('customer_name', this.value);
        });
        // Load saved name if available
        const savedName = sessionStorage.getItem('customer_name');
        if (savedName) nameInput.value = savedName;
    }
});
