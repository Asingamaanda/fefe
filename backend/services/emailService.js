const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  async sendOrderConfirmation(order) {
    try {
      await order.populate('user items.product');
      
      const mailOptions = {
        from: process.env.FROM_EMAIL || 'noreply@fefeholdings.com',
        to: order.user.email,
        subject: `Order Confirmation - ${order.orderNumber}`,
        html: this.generateOrderConfirmationHTML(order)
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Order confirmation email sent to ${order.user.email}`);
    } catch (error) {
      console.error('Error sending order confirmation email:', error);
      throw error;
    }
  }

  async sendOrderStatusUpdate(order) {
    try {
      await order.populate('user');
      
      const mailOptions = {
        from: process.env.FROM_EMAIL || 'noreply@fefeholdings.com',
        to: order.user.email,
        subject: `Order Update - ${order.orderNumber}`,
        html: this.generateOrderStatusHTML(order)
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Order status email sent to ${order.user.email}`);
    } catch (error) {
      console.error('Error sending order status email:', error);
      throw error;
    }
  }

  async sendEnrollmentConfirmation(enrollment) {
    try {
      await enrollment.populate('student course');
      
      const mailOptions = {
        from: process.env.FROM_EMAIL || 'noreply@fefeholdings.com',
        to: enrollment.student.email,
        subject: `Welcome to ${enrollment.course.title}!`,
        html: this.generateEnrollmentHTML(enrollment)
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Enrollment confirmation email sent to ${enrollment.student.email}`);
    } catch (error) {
      console.error('Error sending enrollment email:', error);
      throw error;
    }
  }

  generateOrderConfirmationHTML(order) {
    const itemsHTML = order.items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">
          ${item.product.name} (${item.variant.size}, ${item.variant.color})
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">
          ${item.quantity}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
          $${item.total.toFixed(2)}
        </td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #8B7355, #A0845C); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #F5F0E8; padding: 20px; }
          .order-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          table { width: 100%; border-collapse: collapse; }
          .footer { background: #8B7355; color: white; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Order Confirmed!</h1>
            <p>Thank you for your order, ${order.user.firstName}!</p>
          </div>
          
          <div class="content">
            <div class="order-details">
              <h2>Order Details</h2>
              <p><strong>Order Number:</strong> ${order.orderNumber}</p>
              <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
              
              <h3>Items Ordered:</h3>
              <table>
                <thead>
                  <tr style="background: #F5F0E8;">
                    <th style="padding: 10px; text-align: left;">Item</th>
                    <th style="padding: 10px; text-align: center;">Quantity</th>
                    <th style="padding: 10px; text-align: right;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHTML}
                </tbody>
              </table>
              
              <div style="margin-top: 20px; text-align: right;">
                <p><strong>Subtotal: $${order.pricing.subtotal.toFixed(2)}</strong></p>
                <p><strong>Shipping: $${order.pricing.shipping.toFixed(2)}</strong></p>
                <p><strong>Tax: $${order.pricing.tax.toFixed(2)}</strong></p>
                <p style="font-size: 1.2em; color: #8B7355;"><strong>Total: $${order.pricing.total.toFixed(2)}</strong></p>
              </div>
            </div>
            
            <div class="order-details">
              <h3>Shipping Address</h3>
              <p>
                ${order.shippingAddress.firstName} ${order.shippingAddress.lastName}<br>
                ${order.shippingAddress.street}<br>
                ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zipCode}<br>
                ${order.shippingAddress.country}
              </p>
            </div>
          </div>
          
          <div class="footer">
            <p>Thank you for shopping with FEFE Wear!</p>
            <p>For questions, contact us at shop@fefewear.com</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generateOrderStatusHTML(order) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #8B7355, #A0845C); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #F5F0E8; padding: 20px; border-radius: 0 0 8px 8px; }
          .status-badge { background: #27ae60; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Order Update</h1>
            <p>Order ${order.orderNumber}</p>
          </div>
          
          <div class="content">
            <p>Hello ${order.user.firstName},</p>
            <p>Your order status has been updated:</p>
            
            <div style="text-align: center; margin: 20px 0;">
              <span class="status-badge">${order.status.toUpperCase()}</span>
            </div>
            
            ${order.shipping.trackingNumber ? `
              <p><strong>Tracking Number:</strong> ${order.shipping.trackingNumber}</p>
              <p><strong>Carrier:</strong> ${order.shipping.carrier}</p>
            ` : ''}
            
            <p>Thank you for your patience!</p>
            
            <p>Best regards,<br>The FEFE Wear Team</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generateEnrollmentHTML(enrollment) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #8B7355, #A0845C); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #F5F0E8; padding: 20px; border-radius: 0 0 8px 8px; }
          .course-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Ngoma Curriculum!</h1>
            <p>You're enrolled in ${enrollment.course.title}</p>
          </div>
          
          <div class="content">
            <p>Hello ${enrollment.student.firstName},</p>
            <p>Congratulations! You have successfully enrolled in <strong>${enrollment.course.title}</strong>.</p>
            
            <div class="course-info">
              <h3>Course Information</h3>
              <p><strong>Instructor:</strong> ${enrollment.course.instructor.firstName} ${enrollment.course.instructor.lastName}</p>
              <p><strong>Level:</strong> ${enrollment.course.level}</p>
              <p><strong>Duration:</strong> ${enrollment.course.duration.weeks} weeks</p>
              <p><strong>Enrollment Date:</strong> ${new Date(enrollment.enrollmentDate).toLocaleDateString()}</p>
            </div>
            
            <p>You can access your course materials and track your progress in your student dashboard.</p>
            
            <p>Happy learning!</p>
            
            <p>Best regards,<br>The Ngoma Curriculum Team</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = new EmailService();
