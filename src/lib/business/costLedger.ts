import { BusinessCategory } from '@/types/business';

export interface RateCard {
  marketing: number;
  utility: number;
  authentication: number;
  service: number;
  currency: string;
}

// Current WhatsApp Business API rates (e.g. India INR and Global USD)
export const WHATSAPP_API_RATES: Record<string, RateCard> = {
  INR: {
    marketing: 0.8631,
    utility: 0.115,
    authentication: 0.115,
    service: 0.115,
    currency: 'INR',
  },
  USD: {
    marketing: 0.055,
    utility: 0.015,
    authentication: 0.032,
    service: 0.015,
    currency: 'USD',
  },
};

export const DELTA_API_RATE = 0.0; // Delta is always ₹0.00 / $0.00

export function getWhatsAppRate(category: BusinessCategory, currency: 'INR' | 'USD' = 'INR'): number {
  const card = WHATSAPP_API_RATES[currency] || WHATSAPP_API_RATES.INR;
  switch (category) {
    case 'MARKETING':
      return card.marketing;
    case 'UTILITY':
      return card.utility;
    case 'AUTHENTICATION':
      return card.authentication;
    case 'SERVICE':
    default:
      return card.service;
  }
}

export function calculateMessageSavings(
  category: BusinessCategory,
  currency: 'INR' | 'USD' = 'INR'
): {
  whatsappRate: number;
  deltaRate: number;
  saved: number;
  formattedSaved: string;
} {
  const whatsappRate = getWhatsAppRate(category, currency);
  const deltaRate = DELTA_API_RATE;
  const saved = whatsappRate - deltaRate;
  const symbol = currency === 'INR' ? '₹' : '$';

  return {
    whatsappRate,
    deltaRate,
    saved,
    formattedSaved: `${symbol}${saved.toFixed(4)}`,
  };
}
