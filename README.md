# fefe

Welcome to fefe, a comprehensive holding company website showcasing our diverse portfolio of innovative companies in education, technology, fashion, and digital solutions.

## 🌟 About fefe

fefe is a visionary holding company that drives innovation across multiple industries. Our portfolio includes:

- **FEFE Wear** - Sustainable fashion and clothing
- **Ngoma Curriculum** - Interactive learning platform  
- **FEFE AI Education** - AI-powered educational solutions
- **FEFE Web Solutions** - Professional web development services

## 🚀 Website Features

### Main Website (index.html)
- Modern, responsive design
- Interactive hero section with floating cards
- Company showcase with detailed descriptions
- Services overview
- Contact forms and information
- Mobile-friendly navigation

### FEFE Wear (fefewear.html)
- **Sustainable Fashion Store**
- Product catalog with categories
- Shopping cart functionality
- Product filtering system
- Sustainability information
- E-commerce features

### Ngoma Curriculum (ngoma.html)
- **Educational Platform**
- Course catalog for different grade levels
- Virtual classroom features
- Learning path visualization
- Interactive enrollment system
- Progress tracking capabilities

### FEFE AI Education (ai-education.html)
- **AI-Powered Learning**
- AI chatbot demo
- Feature showcase
- Global impact visualization
- Implementation timeline
- Partnership information

### FEFE Web Solutions (web-development.html)
- **Professional Web Development**
- Service packages and pricing
- Portfolio showcase
- Development process timeline
- Quote request system
- Technology stack displays

## 🛠️ Technologies Used

### Frontend
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Design**: Responsive CSS Grid & Flexbox
- **Icons**: Font Awesome 6.0
- **Fonts**: Google Fonts (Inter)
- **Animations**: CSS animations and transitions
- **Interactive Features**: Vanilla JavaScript

### Backend
- **Runtime**: Node.js with Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **Payments**: Stripe integration
- **Email**: Nodemailer with SMTP
- **Security**: Helmet, CORS, Rate limiting
- **Validation**: Express-validator

## 🔗 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile

### Products (FEFE Wear)
- `GET /api/products` - List products with filtering
- `GET /api/products/:id` - Get product details
- `POST /api/products/:id/reviews` - Add product review
- `GET /api/products/meta/categories` - Get categories

### Orders & Payments
- `POST /api/payments/create-payment-intent` - Create Stripe payment
- `POST /api/payments/confirm-payment` - Confirm payment
- `GET /api/orders/my-orders` - Get user orders
- `PATCH /api/orders/:id/cancel` - Cancel order

### Courses (Ngoma Curriculum)
- `GET /api/courses` - List courses with filtering
- `GET /api/courses/:id` - Get course details
- `POST /api/enrollments` - Enroll in course
- `GET /api/enrollments/my-courses` - Get user enrollments

### Full API Documentation
See `backend/README.md` for complete API documentation including request/response examples.

## 🎨 Design Features

- **Modern Gradient Designs**: Beautiful color schemes for each company
- **Responsive Layout**: Works on all devices and screen sizes
- **Interactive Elements**: Hover effects, animations, and transitions
- **Accessible Design**: Proper contrast ratios and semantic HTML
- **Fast Loading**: Optimized images and efficient code
- **Cross-browser Compatible**: Works on all modern browsers

## 📱 Mobile Responsiveness

All pages are fully responsive with:
- Mobile-first design approach
- Hamburger navigation for mobile devices
- Optimized layouts for tablets and phones
- Touch-friendly interactive elements
- Fast loading on mobile networks

## 🚀 Getting Started

### Frontend Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/Asingamaanda/fefe.git
   ```

2. Open `index.html` in your web browser

3. Navigate through the different company pages:
   - FEFE Wear: `fefewear.html`
   - Ngoma Curriculum: `ngoma.html`
   - AI Education: `ai-education.html`
   - Web Solutions: `web-development.html`

### Backend Setup

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
   - Stripe API keys (for payments)
   - Email service credentials

3. **Start MongoDB:**
   Make sure MongoDB is running on your system

4. **Seed Database:**
   ```bash
   node scripts/seedDatabase.js
   ```

5. **Start Backend Server:**
   ```bash
   node server.js
   ```

The API will be available at `http://localhost:5000/api`

### 🔑 Default Login Credentials

- **Admin Account:**
  - Email: admin@fefeholdings.com
  - Password: admin123

- **Instructor Account:**
  - Email: instructor@ngomacurriculum.com
  - Password: instructor123

## 📂 File Structure

```
fefe/
├── index.html              # Main landing page
├── fefewear.html          # FEFE Wear store
├── ngoma.html             # Ngoma Curriculum platform
├── ai-education.html      # AI Education services
├── web-development.html   # Web development services
├── styles.css             # Main stylesheet
├── script.js              # JavaScript functionality
├── dynamics.js            # Dynamic features system
├── fefe-api.js            # Backend API integration
├── backend/               # Backend API server
│   ├── server.js          # Main server file
│   ├── models/            # Database models
│   ├── routes/            # API routes
│   ├── middleware/        # Authentication & security
│   ├── services/          # Email & external services
│   └── scripts/           # Database seeding
└── README.md              # Project documentation
```

## ✨ Key Features

### Interactive Elements
- **Shopping Cart**: Functional cart system for FEFE Wear
- **AI Chatbot Demo**: Try the AI tutor on the AI Education page
- **Course Enrollment**: Interactive course selection system
- **Quote Requests**: Automated quote generation for web services
- **Contact Forms**: Functional contact forms with validation

### Visual Features
- **Floating Animations**: Animated elements on hero sections
- **Scroll Animations**: Elements animate in as you scroll
- **Hover Effects**: Interactive buttons and cards
- **Gradient Backgrounds**: Modern gradient designs
- **Typography**: Professional font hierarchy

### Business Features
- **E-commerce Ready**: Product catalog and cart system
- **Educational Platform**: Course management interface
- **Service Showcase**: Professional service presentations
- **Portfolio Display**: Project showcases with tech stacks
- **Pricing Tables**: Clear pricing structures

## 🌍 Global Reach

FEFE Holdings serves clients and students worldwide with:
- Multi-language support capabilities
- Global shipping for FEFE Wear
- International online education through Ngoma
- Worldwide AI education implementation
- Remote web development services

## 📈 Future Enhancements

- Backend integration for full e-commerce functionality
- User authentication and account management
- Payment gateway integration
- Advanced AI chatbot with natural language processing
- Mobile app development
- Content management system integration

## 🤝 Contributing

We welcome contributions to improve the FEFE Holdings website. Please feel free to submit pull requests or open issues for bugs and feature requests.

## 📞 Contact Information

- **Main Office**: hello@fefeholdings.com
- **FEFE Wear**: shop@fefewear.com
- **Ngoma Curriculum**: learn@ngomacurriculum.com
- **AI Education**: ai@fefeeducation.com
- **Web Solutions**: projects@fefewebsolutions.com

## 📄 License

© 2025 FEFE Holdings. All rights reserved.

---

**Built with ❤️ by the FEFE Holdings team**

Ready to transform education, fashion, and technology? [Get in touch with us today!](mailto:hello@fefeholdings.com)