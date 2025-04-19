import { env } from '../config/env';
import logger from '../utils/logger';
import { AppError } from '../middleware/error';
import fetch from 'node-fetch';

interface DnsRecord {
  type: 'A' | 'CNAME';
  name: string;
  content: string;
  proxied: boolean;
}

export class CloudflareService {
  private static readonly API_URL = 'https://api.cloudflare.com/client/v4';
  private static readonly headers = {
    'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
    'Content-Type': 'application/json',
  };

  /**
   * Create a DNS record
   */
  static async createDnsRecord(record: DnsRecord) {
    try {
      const response = await fetch(
        `${this.API_URL}/zones/${env.CLOUDFLARE_ZONE_ID}/dns_records`,
        {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify(record),
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.errors[0].message);
      }

      logger.info(`Created DNS record: ${record.type} ${record.name}`);
      return data.result;
    } catch (error) {
      logger.error('Failed to create DNS record:', error);
      throw new AppError('Failed to create DNS record', 500);
    }
  }

  /**
   * Delete a DNS record
   */
  static async deleteDnsRecord(recordId: string) {
    try {
      const response = await fetch(
        `${this.API_URL}/zones/${env.CLOUDFLARE_ZONE_ID}/dns_records/${recordId}`,
        {
          method: 'DELETE',
          headers: this.headers,
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.errors[0].message);
      }

      logger.info(`Deleted DNS record: ${recordId}`);
      return true;
    } catch (error) {
      logger.error('Failed to delete DNS record:', error);
      throw new AppError('Failed to delete DNS record', 500);
    }
  }

  /**
   * List DNS records
   */
  static async listDnsRecords() {
    try {
      const response = await fetch(
        `${this.API_URL}/zones/${env.CLOUDFLARE_ZONE_ID}/dns_records`,
        {
          headers: this.headers,
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.errors[0].message);
      }

      return data.result;
    } catch (error) {
      logger.error('Failed to list DNS records:', error);
      throw new AppError('Failed to list DNS records', 500);
    }
  }

  /**
   * Create SSL certificate
   */
  static async createSslCertificate(hostname: string) {
    try {
      const response = await fetch(
        `${this.API_URL}/zones/${env.CLOUDFLARE_ZONE_ID}/ssl/certificate_packs`,
        {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify({
            hostnames: [hostname],
            type: 'advanced',
            validation_method: 'txt',
            validity_days: 365,
          }),
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.errors[0].message);
      }

      logger.info(`Created SSL certificate for: ${hostname}`);
      return data.result;
    } catch (error) {
      logger.error('Failed to create SSL certificate:', error);
      throw new AppError('Failed to create SSL certificate', 500);
    }
  }

  /**
   * Delete SSL certificate
   */
  static async deleteSslCertificate(certificateId: string) {
    try {
      const response = await fetch(
        `${this.API_URL}/zones/${env.CLOUDFLARE_ZONE_ID}/ssl/certificate_packs/${certificateId}`,
        {
          method: 'DELETE',
          headers: this.headers,
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.errors[0].message);
      }

      logger.info(`Deleted SSL certificate: ${certificateId}`);
      return true;
    } catch (error) {
      logger.error('Failed to delete SSL certificate:', error);
      throw new AppError('Failed to delete SSL certificate', 500);
    }
  }

  /**
   * Get SSL certificate status
   */
  static async getSslCertificateStatus(certificateId: string) {
    try {
      const response = await fetch(
        `${this.API_URL}/zones/${env.CLOUDFLARE_ZONE_ID}/ssl/certificate_packs/${certificateId}`,
        {
          headers: this.headers,
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.errors[0].message);
      }

      return data.result;
    } catch (error) {
      logger.error('Failed to get SSL certificate status:', error);
      throw new AppError('Failed to get SSL certificate status', 500);
    }
  }

  /**
   * Setup domain with DNS and SSL
   */
  static async setupDomain(domain: string, targetIp: string) {
    try {
      // Create A record
      const dnsRecord = await this.createDnsRecord({
        type: 'A',
        name: domain,
        content: targetIp,
        proxied: true,
      });

      // Create SSL certificate
      const sslCertificate = await this.createSslCertificate(domain);

      return {
        dnsRecord,
        sslCertificate,
      };
    } catch (error) {
      logger.error('Failed to setup domain:', error);
      throw new AppError('Failed to setup domain', 500);
    }
  }
}
