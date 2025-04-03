import Stripe from 'stripe';
import { storage } from '../storage';

export interface PaymentIntent {
  id: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: string;
}

export interface SubscriptionInfo {
  id: string;
  clientSecret?: string;
  status: string;
  currentPeriodEnd?: number;
  cancelAtPeriodEnd?: boolean;
}

export class PaymentService {
  private stripe: Stripe | null = null;

  constructor() {
    if (process.env.STRIPE_SECRET_KEY) {
      this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2023-10-16' as any,
      });
    }
  }

  /**
   * Create a PaymentIntent for a one-time payment
   */
  public async createPaymentIntent(
    userId: number,
    planId: number,
    amount: number,
    currency: string = 'usd'
  ): Promise<PaymentIntent> {
    if (!this.stripe) {
      throw new Error('Stripe is not initialized');
    }

    try {
      // Create a PaymentIntent with the order amount and currency
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        metadata: {
          userId: userId.toString(),
          planId: planId.toString(),
          type: 'subscription'
        }
      });

      return {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret || '',
        amount: paymentIntent.amount / 100, // Convert from cents
        currency: paymentIntent.currency,
        status: paymentIntent.status
      };
    } catch (error: any) {
      console.error('Error creating payment intent:', error);
      throw new Error(`Payment processing error: ${error.message}`);
    }
  }

  /**
   * Create or retrieve a customer's subscription
   */
  public async createOrRetrieveSubscription(
    userId: number, 
    planId: number, 
    email: string,
    name: string,
    paymentMethodId?: string
  ): Promise<SubscriptionInfo> {
    if (!this.stripe) {
      throw new Error('Stripe is not initialized');
    }

    // Get the user to check if they already have a subscription
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Get the plan details
    const plan = await storage.getSubscriptionPlan(planId);
    if (!plan) {
      throw new Error('Subscription plan not found');
    }

    // If the user already has a Stripe subscription ID, retrieve it
    if (user.stripeSubscriptionId) {
      try {
        const subscription = await this.stripe.subscriptions.retrieve(
          user.stripeSubscriptionId
        );

        return {
          id: subscription.id,
          status: subscription.status,
          currentPeriodEnd: subscription.current_period_end,
          cancelAtPeriodEnd: subscription.cancel_at_period_end
        };
      } catch (error) {
        console.error('Error retrieving subscription, will create new one:', error);
        // If there's an error (e.g., subscription doesn't exist anymore), proceed to create a new one
      }
    }

    // Get or create a customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email,
        name,
        metadata: {
          userId: userId.toString()
        }
      });
      customerId = customer.id;
      
      // Update the user with the stripe customer ID
      await storage.updateUser(userId, {
        stripeCustomerId: customerId
      } as any);
    }

    // Create the subscription with the payment collection behavior
    const subscription = await this.stripe.subscriptions.create({
      customer: customerId,
      items: [
        {
          price: plan.stripePriceId || 'price_placeholder', // Placeholder for testing
          // In production, you'd have Stripe Price IDs for each plan stored in your database
        },
      ],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        userId: userId.toString(),
        planId: planId.toString()
      }
    });

    // Get the client secret for the subscription's latest invoice
    const latestInvoice = subscription.latest_invoice as Stripe.Invoice;
    const paymentIntent = latestInvoice.payment_intent as Stripe.PaymentIntent;
    
    // Update the user with their subscription ID
    await storage.updateUser(userId, {
      stripeSubscriptionId: subscription.id
    } as any);

    return {
      id: subscription.id,
      clientSecret: paymentIntent.client_secret || undefined,
      status: subscription.status,
      currentPeriodEnd: subscription.current_period_end,
      cancelAtPeriodEnd: subscription.cancel_at_period_end
    };
  }

  /**
   * Cancel a subscription at the end of the current billing period
   */
  public async cancelSubscription(subscriptionId: string): Promise<SubscriptionInfo> {
    if (!this.stripe) {
      throw new Error('Stripe is not initialized');
    }

    const subscription = await this.stripe.subscriptions.update(
      subscriptionId,
      { cancel_at_period_end: true }
    );

    return {
      id: subscription.id,
      status: subscription.status,
      currentPeriodEnd: subscription.current_period_end,
      cancelAtPeriodEnd: subscription.cancel_at_period_end
    };
  }

  /**
   * Handle Stripe webhook events
   */
  public async handleWebhookEvent(event: any): Promise<{ success: boolean, message: string }> {
    if (!this.stripe) {
      throw new Error('Stripe is not initialized');
    }

    try {
      switch (event.type) {
        case 'invoice.payment_succeeded':
          return await this.handleInvoicePaymentSucceeded(event.data.object);
          
        case 'invoice.payment_failed':
          return await this.handleInvoicePaymentFailed(event.data.object);
          
        case 'customer.subscription.updated':
          return await this.handleSubscriptionUpdated(event.data.object);
          
        case 'customer.subscription.deleted':
          return await this.handleSubscriptionDeleted(event.data.object);
          
        default:
          return { success: true, message: `Unhandled event type: ${event.type}` };
      }
    } catch (error: any) {
      console.error('Error handling webhook event:', error);
      return { success: false, message: error.message };
    }
  }

  private async handleInvoicePaymentSucceeded(invoice: any): Promise<{ success: boolean, message: string }> {
    if (invoice.subscription) {
      const subscription = await this.stripe!.subscriptions.retrieve(invoice.subscription);
      const userId = parseInt(subscription.metadata.userId || '0');
      const planId = parseInt(subscription.metadata.planId || '0');
      
      if (userId && planId) {
        // Create a new payment record
        const payment = await storage.createPayment({
          userId,
          subscriptionPlanId: planId,
          amount: (invoice.amount_paid / 100) as any, // Convert from cents with type assertion
          currency: invoice.currency,
          paymentMethod: 'card', // Default to card
          status: 'completed',
          paymentIntentId: invoice.payment_intent,
          invoiceUrl: invoice.hosted_invoice_url || null,
          billingPeriodStart: new Date(subscription.current_period_start * 1000),
          billingPeriodEnd: new Date(subscription.current_period_end * 1000)
        });
        
        // Update the user's subscription status
        await storage.updateUserSubscription(
          userId,
          planId,
          'active',
          new Date(subscription.current_period_end * 1000)
        );
        
        return { success: true, message: `Payment recorded: ${payment.id}` };
      }
    }
    
    return { success: true, message: 'Invoice payment succeeded but no subscription found' };
  }

  private async handleInvoicePaymentFailed(invoice: any): Promise<{ success: boolean, message: string }> {
    if (invoice.subscription) {
      const subscription = await this.stripe!.subscriptions.retrieve(invoice.subscription);
      const userId = parseInt(subscription.metadata.userId || '0');
      
      if (userId) {
        // Update the user's subscription status to past_due
        const user = await storage.getUser(userId);
        if (user && user.subscriptionStatus !== 'past_due') {
          await storage.updateUser(userId, {
            subscriptionStatus: 'past_due'
          } as any);
        }
        
        return { success: true, message: `Subscription status updated to past_due for user ${userId}` };
      }
    }
    
    return { success: true, message: 'Invoice payment failed but no subscription found' };
  }

  private async handleSubscriptionUpdated(subscription: any): Promise<{ success: boolean, message: string }> {
    const userId = parseInt(subscription.metadata.userId || '0');
    const planId = parseInt(subscription.metadata.planId || '0');
    
    if (userId && planId) {
      let status: string;
      
      switch (subscription.status) {
        case 'active':
          status = 'active';
          break;
        case 'past_due':
          status = 'past_due';
          break;
        case 'canceled':
          status = 'canceled';
          break;
        default:
          status = subscription.status;
      }
      
      await storage.updateUser(userId, {
        subscriptionStatus: status
      } as any);
      
      return { success: true, message: `Subscription status updated to ${status} for user ${userId}` };
    }
    
    return { success: true, message: 'Subscription updated but no user found' };
  }

  private async handleSubscriptionDeleted(subscription: any): Promise<{ success: boolean, message: string }> {
    const userId = parseInt(subscription.metadata.userId || '0');
    
    if (userId) {
      await storage.updateUser(userId, {
        subscriptionStatus: 'canceled',
        subscriptionEndsAt: new Date()
      } as any);
      
      return { success: true, message: `Subscription marked as canceled for user ${userId}` };
    }
    
    return { success: true, message: 'Subscription deleted but no user found' };
  }
}

// Export a singleton instance
export const paymentService = new PaymentService();