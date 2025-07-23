const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { body, validationResult } = require('express-validator');
const Order = require('../models/Order');
const Product = require('../models/Product');
const auth = require('../middleware/auth');
const emailService = require('../services/emailService');

const router = express.Router();

// Create payment intent
router.post('/create-payment-intent', [auth, [
  body('items').isArray({ min: 1 }),
  body('currency').optional().isIn(['usd', 'eur', 'gbp']),
  body('shippingAddress').isObject()
]], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { items, currency = 'usd', shippingAddress } = req.body;

    // Calculate total amount
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ message: `Product ${item.productId} not found` });
      }

      // Check stock
      const variant = product.variants.find(v => 
        v.size === item.size && v.color === item.color
      );

      if (!variant || variant.stock < item.quantity) {
        return res.status(400).json({ 
          message: `Insufficient stock for ${product.name} (${item.size}, ${item.color})` 
        });
      }

      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;

      orderItems.push({
        product: product._id,
        variant: {
          size: item.size,
          color: item.color,
          sku: variant.sku
        },
        quantity: item.quantity,
        price: product.price,
        total: itemTotal
      });
    }

    // Calculate shipping (simplified)
    const shippingCost = totalAmount > 100 ? 0 : 10; // Free shipping over $100
    const tax = totalAmount * 0.08; // 8% tax rate
    const finalAmount = totalAmount + shippingCost + tax;

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(finalAmount * 100), // Convert to cents
      currency,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        userId: req.user.userId,
        itemCount: items.length
      }
    });

    // Create pending order
    const order = new Order({
      user: req.user.userId,
      items: orderItems,
      pricing: {
        subtotal: totalAmount,
        shipping: shippingCost,
        tax,
        total: finalAmount
      },
      shippingAddress,
      payment: {
        method: 'stripe',
        paymentIntentId: paymentIntent.id,
        status: 'pending'
      }
    });

    await order.save();

    res.json({
      clientSecret: paymentIntent.client_secret,
      orderId: order._id,
      amount: finalAmount
    });
  } catch (error) {
    console.error('Payment intent error:', error);
    res.status(500).json({ message: 'Server error creating payment intent' });
  }
});

// Confirm payment
router.post('/confirm-payment', [auth, [
  body('paymentIntentId').notEmpty(),
  body('orderId').notEmpty()
]], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { paymentIntentId, orderId } = req.body;

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ message: 'Payment not successful' });
    }

    // Update order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.payment.status = 'paid';
    order.payment.transactionId = paymentIntent.id;
    order.payment.paidAt = new Date();
    order.status = 'confirmed';
    order.timeline.push({
      status: 'confirmed',
      message: 'Payment confirmed and order placed'
    });

    await order.save();

    // Update product stock
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      const variant = product.variants.find(v => v.sku === item.variant.sku);
      variant.stock -= item.quantity;
      await product.save();
    }

    // Send confirmation email
    try {
      await emailService.sendOrderConfirmation(order);
    } catch (emailError) {
      console.error('Email sending error:', emailError);
    }

    res.json({
      message: 'Payment confirmed successfully',
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        total: order.pricing.total,
        status: order.status
      }
    });
  } catch (error) {
    console.error('Payment confirmation error:', error);
    res.status(500).json({ message: 'Server error confirming payment' });
  }
});

// Stripe webhook for payment events
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log(`Payment for ${paymentIntent.amount} was successful!`);
      break;
    
    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      console.log(`Payment failed: ${failedPayment.last_payment_error?.message}`);
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

// Refund payment
router.post('/refund', [auth, [
  body('orderId').notEmpty(),
  body('amount').optional().isFloat({ min: 0 }),
  body('reason').optional().trim()
]], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { orderId, amount, reason } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.user.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to refund this order' });
    }

    if (order.payment.status !== 'paid') {
      return res.status(400).json({ message: 'Order payment is not eligible for refund' });
    }

    // Create refund in Stripe
    const refund = await stripe.refunds.create({
      payment_intent: order.payment.paymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined, // Full refund if no amount specified
      reason: 'requested_by_customer'
    });

    // Update order
    order.payment.status = 'refunded';
    order.status = 'cancelled';
    order.timeline.push({
      status: 'refunded',
      message: reason || 'Refund processed'
    });

    await order.save();

    res.json({
      message: 'Refund processed successfully',
      refund: {
        id: refund.id,
        amount: refund.amount / 100,
        status: refund.status
      }
    });
  } catch (error) {
    console.error('Refund error:', error);
    res.status(500).json({ message: 'Server error processing refund' });
  }
});

module.exports = router;
