// utils/iapService.ts
// Apple In-App Purchase service for Corva Pro subscription
// Uses react-native-iap v14+ API

import { Platform } from 'react-native'
import {
  initConnection,
  endConnection,
  fetchProducts,
  requestPurchase,
  getAvailablePurchases,
  finishTransaction,
  purchaseUpdatedListener,
  purchaseErrorListener,
  type Purchase,
  type PurchaseError,
  type EventSubscription,
} from 'react-native-iap'
import { supabase } from './supabaseClient'

// Product IDs - must match App Store Connect
export const PRODUCT_IDS = {
  MONTHLY: 'com.corva.corva.pro.monthly',
} as const

type ProductId = typeof PRODUCT_IDS[keyof typeof PRODUCT_IDS]

// Store listeners for cleanup
let purchaseUpdateSubscription: EventSubscription | null = null
let purchaseErrorSubscription: EventSubscription | null = null

// Define a simplified product type for our use
export interface IAPProduct {
  productId: string
  price: string
  localizedPrice: string
  currency: string
  title: string
  description: string
}

/**
 * Check if IAP is available (iOS only for now)
 */
export function isIAPAvailable(): boolean {
  return Platform.OS === 'ios'
}

/**
 * Initialize IAP connection
 * Call this when the app starts or before showing the paywall
 */
export async function initIAP(): Promise<boolean> {
  if (!isIAPAvailable()) {
    console.log('IAP not available on this platform')
    return false
  }

  try {
    const result = await initConnection()
    console.log('IAP connection initialized:', result)
    return true
  } catch (error) {
    console.error('Failed to initialize IAP:', error)
    return false
  }
}

/**
 * End IAP connection
 * Call this when cleaning up (e.g., component unmount)
 */
export async function endIAP(): Promise<void> {
  if (purchaseUpdateSubscription) {
    purchaseUpdateSubscription.remove()
    purchaseUpdateSubscription = null
  }
  if (purchaseErrorSubscription) {
    purchaseErrorSubscription.remove()
    purchaseErrorSubscription = null
  }
  
  try {
    await endConnection()
    console.log('IAP connection ended')
  } catch (error) {
    console.error('Error ending IAP connection:', error)
  }
}

/**
 * Get available products from App Store
 */
export async function getIAPProducts(): Promise<IAPProduct[]> {
  if (!isIAPAvailable()) {
    return []
  }

  try {
    // Use fetchProducts with type 'subs' for subscriptions
    const products = await fetchProducts({
      skus: Object.values(PRODUCT_IDS),
      type: 'subs',
    })
    console.log('Available IAP products:', products)
    
    // Map to our simplified type
    if (!products) return []
    
    return products.map((p: unknown) => {
      const product = p as Record<string, unknown>
      return {
        productId: (product.productId as string) || (product.id as string) || '',
        price: String(product.price || ''),
        localizedPrice: (product.localizedPrice as string) || (product.priceString as string) || '',
        currency: (product.currency as string) || '',
        title: (product.title as string) || (product.displayName as string) || '',
        description: (product.description as string) || '',
      }
    })
  } catch (error) {
    console.error('Failed to get IAP products:', error)
    return []
  }
}

/**
 * Purchase a subscription
 * Returns the purchase object on success, null on failure/cancel
 */
export async function purchaseSubscription(
  productId: ProductId = PRODUCT_IDS.MONTHLY
): Promise<Purchase | null> {
  if (!isIAPAvailable()) {
    throw new Error('In-App Purchases are not available on this device')
  }

  try {
    console.log('Requesting purchase for:', productId)
    
    // Request the purchase - v14 API
    const result = await requestPurchase({
      request: {
        apple: {
          sku: productId,
          andDangerouslyFinishTransactionAutomatically: false,
        },
      },
      type: 'subs',
    })

    console.log('Purchase result:', result)
    
    // Handle the result - can be single purchase or array
    if (result) {
      if (Array.isArray(result)) {
        return result[0] || null
      }
      return result as Purchase
    }
    
    return null
  } catch (error) {
    const purchaseError = error as PurchaseError
    
    // User cancelled - not an error
    // Check various cancellation indicators
    const errorMessage = purchaseError.message || ''
    const isCancelled = 
      errorMessage.toLowerCase().includes('cancel') ||
      errorMessage.includes('SKError') && errorMessage.includes('2')
    
    if (isCancelled) {
      console.log('User cancelled purchase')
      return null
    }
    
    console.error('Purchase error:', purchaseError)
    throw error
  }
}

/**
 * Get the original transaction ID from a purchase
 * Handles different property names across versions
 */
function getOriginalTransactionId(purchase: Purchase): string | undefined {
  // Cast to access various possible property names
  const p = purchase as unknown as Record<string, unknown>
  const originalId = (p.originalTransactionIdIOS as string | undefined) ||
    (p.originalTransactionId as string | undefined)
  
  if (originalId) return originalId
  
  // Fallback to transaction ID (could be null)
  return purchase.transactionId ?? undefined
}

/**
 * Validate purchase with backend and unlock Pro features
 */
export async function validatePurchaseWithBackend(
  purchase: Purchase
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.access_token) {
      return { success: false, error: 'Not authenticated' }
    }

    console.log('Validating purchase with backend:', purchase.transactionId)

    const originalTransactionId = getOriginalTransactionId(purchase)

    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL}api/apple-iap/verify-receipt`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-access-token': session.access_token,
        },
        body: JSON.stringify({
          transactionId: purchase.transactionId,
          originalTransactionId,
        }),
      }
    )

    const data = await response.json()
    
    if (!response.ok || !data.success) {
      console.error('Backend validation failed:', data)
      return { success: false, error: data.error || 'Validation failed' }
    }

    console.log('Backend validation successful:', data)

    // Finish the transaction after successful validation
    await finishTransaction({ purchase, isConsumable: false })
    console.log('Transaction finished')

    return { success: true }
  } catch (error) {
    console.error('Error validating purchase:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Validation error' 
    }
  }
}

/**
 * Get product ID from a purchase
 */
function getPurchaseProductId(purchase: Purchase): string {
  const p = purchase as unknown as Record<string, unknown>
  return (p.productId as string) || ''
}

/**
 * Restore previous purchases
 * Returns array of valid purchases that were restored
 */
export async function restorePurchases(): Promise<Purchase[]> {
  if (!isIAPAvailable()) {
    return []
  }

  try {
    console.log('Restoring purchases...')
    const purchases = await getAvailablePurchases({
      onlyIncludeActiveItemsIOS: true,
    })
    console.log('Available purchases:', purchases)

    if (!purchases) return []

    // Filter to only our subscription products
    const validPurchases = purchases.filter(p => {
      const productId = getPurchaseProductId(p)
      return Object.values(PRODUCT_IDS).includes(productId as ProductId)
    })

    return validPurchases
  } catch (error) {
    console.error('Failed to restore purchases:', error)
    throw error
  }
}

/**
 * Restore and validate purchases with backend
 * Call this from "Restore Purchases" button
 */
export async function restoreAndValidatePurchases(): Promise<{
  success: boolean
  restored: boolean
  error?: string
}> {
  try {
    const purchases = await restorePurchases()
    
    if (purchases.length === 0) {
      return { success: true, restored: false }
    }

    // Validate the most recent purchase with backend
    // Sort by transaction date descending
    const sortedPurchases = [...purchases].sort((a, b) => {
      const dateA = a.transactionDate ? new Date(Number(a.transactionDate)).getTime() : 0
      const dateB = b.transactionDate ? new Date(Number(b.transactionDate)).getTime() : 0
      return dateB - dateA
    })

    const latestPurchase = sortedPurchases[0]
    
    // Call restore endpoint instead of verify-receipt
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.access_token) {
      return { success: false, restored: false, error: 'Not authenticated' }
    }

    const originalTransactionId = getOriginalTransactionId(latestPurchase)

    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL}api/apple-iap/restore`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-access-token': session.access_token,
        },
        body: JSON.stringify({
          originalTransactionId: originalTransactionId || latestPurchase.transactionId,
        }),
      }
    )

    const data = await response.json()

    if (!response.ok || !data.success) {
      return { 
        success: false, 
        restored: false, 
        error: data.error || 'Restore failed' 
      }
    }

    // Finish the transaction
    await finishTransaction({ purchase: latestPurchase, isConsumable: false })

    return { success: true, restored: data.isActive === true }
  } catch (error) {
    console.error('Error restoring purchases:', error)
    return { 
      success: false, 
      restored: false, 
      error: error instanceof Error ? error.message : 'Restore error' 
    }
  }
}

/**
 * Set up purchase listeners for handling background purchases
 * Call this early in app lifecycle
 */
export function setupPurchaseListeners(
  onPurchaseSuccess: (purchase: Purchase) => void,
  onPurchaseError: (error: PurchaseError) => void
): () => void {
  if (!isIAPAvailable()) {
    return () => {}
  }

  // Clean up existing listeners
  if (purchaseUpdateSubscription) {
    purchaseUpdateSubscription.remove()
  }
  if (purchaseErrorSubscription) {
    purchaseErrorSubscription.remove()
  }

  purchaseUpdateSubscription = purchaseUpdatedListener(async (purchase) => {
    console.log('Purchase updated:', purchase)
    
    // Only handle our products
    const productId = getPurchaseProductId(purchase)
    if (!Object.values(PRODUCT_IDS).includes(productId as ProductId)) {
      return
    }

    // Validate with backend
    const result = await validatePurchaseWithBackend(purchase)
    
    if (result.success) {
      onPurchaseSuccess(purchase)
    } else {
      // Create a simple error object - cast through unknown first
      const errorObj = {
        code: 'E_UNKNOWN',
        message: result.error || 'Validation failed',
      } as unknown as PurchaseError
      onPurchaseError(errorObj)
    }
  })

  purchaseErrorSubscription = purchaseErrorListener((error) => {
    console.error('Purchase error listener:', error)
    // Check if user cancelled
    const msg = error.message || ''
    if (msg.toLowerCase().includes('cancel')) {
      return
    }
    onPurchaseError(error)
  })

  // Return cleanup function
  return () => {
    if (purchaseUpdateSubscription) {
      purchaseUpdateSubscription.remove()
      purchaseUpdateSubscription = null
    }
    if (purchaseErrorSubscription) {
      purchaseErrorSubscription.remove()
      purchaseErrorSubscription = null
    }
  }
}

/**
 * Format price from Product for display
 */
export function formatProductPrice(product: IAPProduct): string {
  if (product.localizedPrice) {
    return product.localizedPrice
  }
  if (product.price && product.currency) {
    return `${product.currency} ${product.price}`
  }
  return 'Price unavailable'
}

/**
 * Get the monthly product
 */
export async function getMonthlyProduct(): Promise<IAPProduct | null> {
  const products = await getIAPProducts()
  return products.find(p => p.productId === PRODUCT_IDS.MONTHLY) || null
}
