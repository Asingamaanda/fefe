# FEFE Backend API

A comprehensive REST API for FEFE Holdings, supporting e-commerce, education platform, and business management features.

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- Stripe account (for payments)

### Installation

1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Environment Setup:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` file with your configuration:
   - MongoDB connection string
   - JWT secret key
   - Stripe API keys
   - Email service credentials

3. **Seed Database:**
   ```bash
   npm run seed
   ```

4. **Start Development Server:**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:5000`

## 📊 Database Schema

### Core Models

#### User Model
```javascript
{
  email: String (unique),
  password: String (hashed),
  firstName: String,
  lastName: String,
  role: ['customer', 'student', 'admin', 'instructor'],
  addresses: [Address],
  preferences: Object
}
```

#### Product Model (FEFE Wear)
```javascript
{
  name: String,
  description: String,
  price: Number,
  category: ['shirts', 'dresses', 'accessories', 'shoes', 'pants', 'jackets'],
  sku: String (unique),
  variants: [{ size, color, stock, sku }],
  sustainability: Object,
  reviews: [Review]
}
```

#### Order Model
```javascript
{
  orderNumber: String (auto-generated),
  user: ObjectId,
  items: [OrderItem],
  pricing: { subtotal, shipping, tax, total },
  shippingAddress: Address,
  payment: PaymentInfo,
  status: ['pending', 'confirmed', 'processing', 'shipped', 'delivered'],
  timeline: [StatusUpdate]
}
```

#### Course Model (Ngoma Curriculum)
```javascript
{
  title: String,
  instructor: ObjectId,
  category: String,
  level: ['beginner', 'intermediate', 'advanced'],
  gradeLevel: String,
  price: Number,
  curriculum: [Week],
  enrollmentCount: Number
}
```

## 🛠 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/change-password` - Change password

### Products (FEFE Wear)
- `GET /api/products` - List products (with filtering & pagination)
- `GET /api/products/:id` - Get product details
- `POST /api/products` - Create product (Admin)
- `PUT /api/products/:id` - Update product (Admin)
- `POST /api/products/:id/reviews` - Add product review
- `GET /api/products/meta/categories` - Get categories
- `GET /api/products/:id/stock/:size/:color` - Check stock

### Orders
- `GET /api/orders/my-orders` - Get user orders
- `GET /api/orders/:orderId` - Get order details
- `GET /api/orders` - Get all orders (Admin)
- `PATCH /api/orders/:orderId/status` - Update order status (Admin)
- `PATCH /api/orders/:orderId/cancel` - Cancel order
- `GET /api/orders/stats/overview` - Order statistics (Admin)

### Payments (Stripe Integration)
- `POST /api/payments/create-payment-intent` - Create payment intent
- `POST /api/payments/confirm-payment` - Confirm payment
- `POST /api/payments/webhook` - Stripe webhook handler
- `POST /api/payments/refund` - Process refund

### Courses (Ngoma Curriculum)
- `GET /api/courses` - List courses
- `GET /api/courses/:id` - Get course details
- `POST /api/courses` - Create course (Instructor/Admin)
- `PUT /api/courses/:id` - Update course
- `POST /api/courses/:id/reviews` - Add course review

### Enrollments
- `POST /api/enrollments` - Enroll in course
- `GET /api/enrollments/my-courses` - Get user enrollments
- `PUT /api/enrollments/:id/progress` - Update progress
- `GET /api/enrollments/:id` - Get enrollment details

## 💳 Payment Integration

### Stripe Setup
1. Create Stripe account
2. Get API keys from Stripe Dashboard
3. Configure webhook endpoint: `/api/payments/webhook`
4. Add webhook secret to environment variables

### Payment Flow
1. Client creates payment intent via API
2. Frontend handles Stripe payment form
3. Payment confirmation updates order status
4. Inventory automatically updated
5. Email confirmation sent

## 📧 Email Service

Automated emails for:
- Order confirmations
- Order status updates
- Course enrollment confirmations
- Password reset (if implemented)

### Email Templates
- Responsive HTML templates
- FEFE brand styling
- Dynamic content insertion

## 🔐 Security Features

- JWT authentication
- Password hashing (bcrypt)
- Rate limiting
- CORS protection
- Helmet security headers
- Input validation
- Admin authorization middleware

## 📱 API Usage Examples

### Register User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

### Create Payment Intent
```bash
curl -X POST http://localhost:5000/api/payments/create-payment-intent \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "productId": "PRODUCT_ID",
        "size": "M",
        "color": "Blue",
        "quantity": 2
      }
    ],
    "shippingAddress": {
      "firstName": "John",
      "lastName": "Doe",
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zipCode": "10001",
      "country": "USA"
    }
  }'
```

### Get Products
```bash
curl "http://localhost:5000/api/products?category=shirts&page=1&limit=12"
```

## 🧪 Testing

Run tests:
```bash
npm test
```

## 📈 Monitoring & Analytics

The API includes endpoints for:
- Order statistics
- Product performance
- Course enrollment metrics
- Revenue tracking

## 🚀 Production Deployment

1. Set NODE_ENV=production
2. Configure production MongoDB
3. Set up production Stripe keys
4. Configure production email service
5. Set strong JWT secret
6. Enable SSL/HTTPS
7. Set up monitoring and logging

## 🔧 Environment Variables

Required variables:
```env
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb://localhost:27017/fefe
JWT_SECRET=your-super-secret-key
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## 📞 Support

For API support and questions:
- Technical: dev@fefeholdings.com
- Business: hello@fefeholdings.com

---

**Built with ❤️ for FEFE Holdings ecosystem**
