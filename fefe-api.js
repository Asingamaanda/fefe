// FEFE API Integration
// Add this to your frontend JavaScript to connect with the backend

class FefeAPI {
  constructor() {
    this.baseURL = 'http://localhost:5000/api';
    this.token = localStorage.getItem('fefeAuthToken');
  }

  // Helper method to make authenticated requests
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  }

  // Authentication methods
  async register(userData) {
    const response = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    
    if (response.token) {
      this.token = response.token;
      localStorage.setItem('fefeAuthToken', this.token);
    }
    
    return response;
  }

  async login(email, password) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    
    if (response.token) {
      this.token = response.token;
      localStorage.setItem('fefeAuthToken', this.token);
    }
    
    return response;
  }

  logout() {
    this.token = null;
    localStorage.removeItem('fefeAuthToken');
  }

  // Product methods
  async getProducts(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return this.request(`/products?${queryParams}`);
  }

  async getProduct(id) {
    return this.request(`/products/${id}`);
  }

  async addProductReview(productId, rating, comment) {
    return this.request(`/products/${productId}/reviews`, {
      method: 'POST',
      body: JSON.stringify({ rating, comment })
    });
  }

  // Order methods
  async getMyOrders() {
    return this.request('/orders/my-orders');
  }

  async getOrder(orderId) {
    return this.request(`/orders/${orderId}`);
  }

  async cancelOrder(orderId, reason) {
    return this.request(`/orders/${orderId}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ reason })
    });
  }

  // Payment methods
  async createPaymentIntent(items, shippingAddress) {
    return this.request('/payments/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify({ items, shippingAddress })
    });
  }

  async confirmPayment(paymentIntentId, orderId) {
    return this.request('/payments/confirm-payment', {
      method: 'POST',
      body: JSON.stringify({ paymentIntentId, orderId })
    });
  }

  // Course methods
  async getCourses(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return this.request(`/courses?${queryParams}`);
  }

  async getCourse(id) {
    return this.request(`/courses/${id}`);
  }

  async enrollInCourse(courseId) {
    return this.request('/enrollments', {
      method: 'POST',
      body: JSON.stringify({ courseId })
    });
  }

  async getMyCourses() {
    return this.request('/enrollments/my-courses');
  }

  async updateProgress(enrollmentId, lessonId, completed, score) {
    return this.request(`/enrollments/${enrollmentId}/progress`, {
      method: 'PUT',
      body: JSON.stringify({ lessonId, completed, score })
    });
  }
}

// Usage examples:
const api = new FefeAPI();

// Example 1: User registration and login
async function handleUserRegistration() {
  try {
    const response = await api.register({
      email: 'user@example.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe'
    });
    console.log('Registration successful:', response);
  } catch (error) {
    console.error('Registration failed:', error);
  }
}

// Example 2: Load products for FEFE Wear
async function loadProducts() {
  try {
    const response = await api.getProducts({
      category: 'shirts',
      page: 1,
      limit: 12
    });
    
    // Update your product grid
    updateProductGrid(response.products);
  } catch (error) {
    console.error('Failed to load products:', error);
  }
}

// Example 3: Handle e-commerce checkout
async function handleCheckout(cartItems, shippingAddress) {
  try {
    // Create payment intent
    const paymentResponse = await api.createPaymentIntent(cartItems, shippingAddress);
    
    // Initialize Stripe (you'll need to include Stripe.js)
    const stripe = Stripe('pk_test_your_stripe_publishable_key');
    
    // Confirm payment with Stripe
    const { error } = await stripe.confirmCardPayment(paymentResponse.clientSecret, {
      payment_method: {
        card: cardElement, // Your Stripe card element
        billing_details: {
          name: `${shippingAddress.firstName} ${shippingAddress.lastName}`,
        },
      }
    });

    if (!error) {
      // Confirm payment with backend
      await api.confirmPayment(paymentResponse.clientSecret.split('_secret')[0], paymentResponse.orderId);
      console.log('Payment successful!');
    }
  } catch (error) {
    console.error('Checkout failed:', error);
  }
}

// Example 4: Enroll in a course
async function enrollInCourse(courseId) {
  try {
    const response = await api.enrollInCourse(courseId);
    console.log('Enrollment successful:', response);
    
    // Redirect to course dashboard
    window.location.href = '/course-dashboard.html';
  } catch (error) {
    console.error('Enrollment failed:', error);
  }
}

// Example 5: Update existing cart functionality to use backend
function updateCartFunctionality() {
  // Replace existing localStorage cart with API calls
  window.addToCart = async function(productName, price) {
    try {
      // First, get the full product details
      const products = await api.getProducts({ search: productName });
      const product = products.products.find(p => p.name === productName);
      
      if (product) {
        // Store in localStorage for now, but you could also save to user's cart in backend
        let cart = JSON.parse(localStorage.getItem('fefeCart')) || [];
        cart.push({
          productId: product._id,
          name: product.name,
          price: product.price,
          quantity: 1,
          size: 'M', // Default size, you'd get this from UI
          color: 'Default' // Default color, you'd get this from UI
        });
        localStorage.setItem('fefeCart', JSON.stringify(cart));
        
        // Update cart display
        updateCartDisplay();
      }
    } catch (error) {
      console.error('Add to cart failed:', error);
    }
  };
}

// Example 6: Load courses for Ngoma Curriculum
async function loadCourses() {
  try {
    const response = await api.getCourses({
      category: 'mathematics',
      level: 'beginner'
    });
    
    // Update course catalog
    updateCourseGrid(response.courses);
  } catch (error) {
    console.error('Failed to load courses:', error);
  }
}

// Initialize API when page loads
document.addEventListener('DOMContentLoaded', function() {
  // Check if user is logged in
  if (api.token) {
    console.log('User is logged in');
    // Load user-specific data
  } else {
    console.log('User is not logged in');
  }
  
  // Update cart functionality
  updateCartFunctionality();
});

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FefeAPI;
}
