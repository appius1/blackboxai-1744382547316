import Stripe from 'stripe';
import { env } from '../config/env';
import logger from '../utils/logger';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/error';

const prisma = new PrismaClient();
const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-08-16',
});

export interface CreateSubscriptionParams {
  tenantId: string;
  priceId: string;
  email: string;
  paymentMethodId: string;
}

export class StripeService {
  /**
   * Create a new customer in Stripe
   */
  static async createCustomer(email: string): Promise<Stripe.Customer> {
    try {
      return await stripe.customers.create({ email });
    } catch (error) {
      logger.error('Failed to create Stripe customer:', error);
      throw new AppError('Failed to create customer', 500);
    }
  }

  /**
   * Create a new subscription
   */
  static async createSubscription({
    tenantId,
    priceId,
    email,
    paymentMethodId,
  }: CreateSubscriptionParams): Promise<Stripe.Subscription> {
    try {
      // Create or get customer
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        include: { subscription: true },
      });

      if (!tenant) {
        throw new AppError('Tenant not found', 404);
      }

      let stripeCustomerId = tenant.subscription?.stripeCustomerId;

      if (!stripeCustomerId) {
        const customer = await this.createCustomer(email);
        stripeCustomerId = customer.id;
      }

      // Attach payment method to customer
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: stripeCustomerId,
      });

      // Set as default payment method
      await stripe.customers.update(stripeCustomerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      // Create subscription
      const subscription = await stripe.subscriptions.create({
        customer: stripeCustomerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: {
          payment_method_types: ['card'],
          save_default_payment_method: 'on_subscription',
        },
        expand: ['latest_invoice.payment_intent'],
      });

      // Update tenant with subscription info
      await prisma.subscription.upsert({
        where: { tenantId },
        create: {
          tenantId,
          stripeCustomerId,
          stripePriceId: priceId,
          status: 'ACTIVE',
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        },
        update: {
          stripePriceId: priceId,
          status: 'ACTIVE',
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        },
      });

      return subscription;
    } catch (error) {
      logger.error('Failed to create subscription:', error);
      throw new AppError('Failed to create subscription', 500);
    }
  }

  /**
   * Cancel a subscription
   */
  static async cancelSubscription(tenantId: string): Promise<void> {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { tenantId },
      });

      if (!subscription) {
        throw new AppError('Subscription not found', 404);
      }

      // Cancel subscription in Stripe
      const stripeSubscriptions = await stripe.subscriptions.list({
        customer: subscription.stripeCustomerId,
      });

      for (const sub of stripeSubscriptions.data) {
        await stripe.subscriptions.del(sub.id);
      }

      // Update subscription status in database
      await prisma.subscription.update({
        where: { tenantId },
        data: { status: 'CANCELED' },
      });
    } catch (error) {
      logger.error('Failed to cancel subscription:', error);
      throw new AppError('Failed to cancel subscription', 500);
    }
  }

  /**
   * Handle Stripe webhook events
   */
  static async handleWebhookEvent(
    event: Stripe.Event
  ): Promise<void> {
    try {
      switch (event.type) {
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          await this.handleSubscriptionUpdate(subscription);
          break;
        }
        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          await this.handleFailedPayment(invoice);
          break;
        }
      }
    } catch (error) {
      logger.error('Failed to handle webhook event:', error);
      throw new AppError('Webhook processing failed', 500);
    }
  }

  private static async handleSubscriptionUpdate(
    subscription: Stripe.Subscription
  ): Promise<void> {
    const tenantSubscription = await prisma.subscription.findFirst({
      where: { stripeCustomerId: subscription.customer as string },
    });

    if (!tenantSubscription) return;

    await prisma.subscription.update({
      where: { tenantId: tenantSubscription.tenantId },
      data: {
        status: subscription.status === 'active' ? 'ACTIVE' : 'PAST_DUE',
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      },
    });
  }

  private static async handleFailedPayment(
    invoice: Stripe.Invoice
  ): Promise<void> {
    const tenantSubscription = await prisma.subscription.findFirst({
      where: { stripeCustomerId: invoice.customer as string },
    });

    if (!tenantSubscription) return;

    await prisma.subscription.update({
      where: { tenantId: tenantSubscription.tenantId },
      data: { status: 'PAST_DUE' },
    });
  }
}
