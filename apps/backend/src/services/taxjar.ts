import Taxjar from 'taxjar';
import { env } from '../config/env';
import logger from '../utils/logger';
import { Cache } from '../config/redis';
import { AppError } from '../middleware/error';

interface TaxAddress {
  country: string;
  zip: string;
  state: string;
  city: string;
  street: string;
}

interface TaxCalculationParams {
  toAddress: TaxAddress;
  fromAddress: TaxAddress;
  amount: number;
  shipping: number;
}

const client = new Taxjar({
  apiKey: env.TAXJAR_API_KEY,
});

export class TaxService {
  private static CACHE_TTL = 3600; // 1 hour in seconds

  /**
   * Calculate tax for an order
   */
  @Cache.cached(TaxService.CACHE_TTL)
  static async calculateTax({
    toAddress,
    fromAddress,
    amount,
    shipping,
  }: TaxCalculationParams) {
    try {
      const params = {
        from_country: fromAddress.country,
        from_zip: fromAddress.zip,
        from_state: fromAddress.state,
        from_city: fromAddress.city,
        from_street: fromAddress.street,
        to_country: toAddress.country,
        to_zip: toAddress.zip,
        to_state: toAddress.state,
        to_city: toAddress.city,
        to_street: toAddress.street,
        amount,
        shipping,
      };

      const tax = await client.taxForOrder(params);
      return tax;
    } catch (error) {
      logger.error('Failed to calculate tax:', error);
      throw new AppError('Tax calculation failed', 500);
    }
  }

  /**
   * Validate a tax number (VAT number for EU)
   */
  @Cache.cached(TaxService.CACHE_TTL)
  static async validateTaxNumber(vatNumber: string) {
    try {
      const validation = await client.validate({
        vat: vatNumber,
      });
      return validation;
    } catch (error) {
      logger.error('Failed to validate tax number:', error);
      throw new AppError('Tax number validation failed', 500);
    }
  }

  /**
   * Get tax rates for a location
   */
  @Cache.cached(TaxService.CACHE_TTL)
  static async getTaxRates(address: TaxAddress) {
    try {
      const rates = await client.ratesForLocation(address.zip, {
        country: address.country,
        state: address.state,
        city: address.city,
        street: address.street,
      });
      return rates;
    } catch (error) {
      logger.error('Failed to get tax rates:', error);
      throw new AppError('Failed to get tax rates', 500);
    }
  }

  /**
   * Create a tax transaction record
   */
  static async createTransaction(
    orderId: string,
    params: TaxCalculationParams
  ) {
    try {
      const transaction = await client.createOrder({
        transaction_id: orderId,
        transaction_date: new Date().toISOString(),
        to_country: params.toAddress.country,
        to_zip: params.toAddress.zip,
        to_state: params.toAddress.state,
        to_city: params.toAddress.city,
        to_street: params.toAddress.street,
        from_country: params.fromAddress.country,
        from_zip: params.fromAddress.zip,
        from_state: params.fromAddress.state,
        from_city: params.fromAddress.city,
        from_street: params.fromAddress.street,
        amount: params.amount,
        shipping: params.shipping,
      });
      return transaction;
    } catch (error) {
      logger.error('Failed to create tax transaction:', error);
      throw new AppError('Failed to create tax transaction', 500);
    }
  }

  /**
   * Refund a tax transaction
   */
  static async refundTransaction(
    orderId: string,
    refundAmount: number
  ) {
    try {
      const refund = await client.createRefund({
        transaction_id: `${orderId}_refund`,
        transaction_reference_id: orderId,
        transaction_date: new Date().toISOString(),
        amount: refundAmount,
      });
      return refund;
    } catch (error) {
      logger.error('Failed to refund tax transaction:', error);
      throw new AppError('Failed to refund tax transaction', 500);
    }
  }
}
