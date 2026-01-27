import React, { useState, useRef } from 'react';
import { View, Modal, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedView } from './ThemedView';
import { ThemedText } from './ThemedText';
import { Button } from './Button';
import { useTheme } from '@/hooks/useTheme';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { Feather } from '@expo/vector-icons';
import { apiRequest, getApiUrl } from '@/lib/query-client';

interface RazorpayPaymentProps {
  visible: boolean;
  onClose: () => void;
  amount: number;
  clientName: string;
  stageName: string;
  clientId: string;
  stageId: string;
  userId?: string;
  onPaymentSuccess: (paymentId: string, orderId: string) => void;
  onPaymentFailure: (error: string) => void;
}

export function RazorpayPayment({
  visible,
  onClose,
  amount,
  clientName,
  stageName,
  clientId,
  stageId,
  userId = 'user_1',
  onPaymentSuccess,
  onPaymentFailure,
}: RazorpayPaymentProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<{
    orderId: string;
    keyId: string;
    amount: number;
  } | null>(null);
  const webViewRef = useRef<WebView>(null);

  const createOrder = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiRequest('POST', '/api/razorpay/create-order', {
        amount,
        currency: 'INR',
        receipt: `receipt_${clientId}_${stageId}_${Date.now()}`,
        notes: {
          clientId,
          stageId,
          stageName,
          clientName,
        },
      });

      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
        setLoading(false);
        return;
      }

      setOrderData({
        orderId: data.orderId,
        keyId: data.keyId,
        amount: data.amount,
      });
      setLoading(false);
    } catch (err) {
      setError('Failed to initialize payment. Please try again.');
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (visible) {
      createOrder();
    } else {
      setOrderData(null);
      setError(null);
      setLoading(true);
    }
  }, [visible]);

  const getCheckoutHTML = () => {
    if (!orderData) return '';

    const apiUrl = getApiUrl();
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .container {
            text-align: center;
            padding: 20px;
          }
          .loading {
            color: #666;
            font-size: 16px;
          }
          .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid #e0e0e0;
            border-top-color: #528FF0;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 16px;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="spinner"></div>
          <p class="loading">Opening payment options...</p>
        </div>
        <script>
          var options = {
            key: '${orderData.keyId}',
            amount: ${orderData.amount},
            currency: 'INR',
            name: 'Sri Sai Sumathi Builders',
            description: '${stageName} - ${clientName}',
            order_id: '${orderData.orderId}',
            prefill: {
              name: '${clientName}',
              contact: ''
            },
            config: {
              display: {
                blocks: {
                  utib: {
                    name: "Pay using UPI",
                    instruments: [
                      { method: "upi" }
                    ]
                  },
                  card: {
                    name: "Pay using Card",
                    instruments: [
                      { method: "card" }
                    ]
                  },
                  netbanking: {
                    name: "Pay using Netbanking",
                    instruments: [
                      { method: "netbanking" }
                    ]
                  }
                },
                sequence: ["block.utib", "block.card", "block.netbanking"],
                preferences: {
                  show_default_blocks: false
                }
              }
            },
            handler: function (response) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'success',
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature
              }));
            },
            theme: {
              color: '#528FF0',
              backdrop_color: 'rgba(0,0,0,0.6)'
            },
            modal: {
              ondismiss: function() {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'cancelled'
                }));
              },
              escape: true,
              animation: true
            }
          };
          
          var rzp = new Razorpay(options);
          
          rzp.on('payment.failed', function (response) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'failed',
              error: response.error.description || 'Payment failed'
            }));
          });
          
          setTimeout(function() {
            rzp.open();
          }, 500);
        </script>
      </body>
      </html>
    `;
  };

  const handleWebViewMessage = async (event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      if (data.type === 'success') {
        const verifyResponse = await apiRequest('POST', '/api/razorpay/verify-payment', {
          razorpay_order_id: data.razorpay_order_id,
          razorpay_payment_id: data.razorpay_payment_id,
          razorpay_signature: data.razorpay_signature,
          amount,
          userId,
          clientId,
          stageId,
        });

        const verifyData = await verifyResponse.json();
        
        if (verifyData.success) {
          onPaymentSuccess(data.razorpay_payment_id, data.razorpay_order_id);
        } else {
          onPaymentFailure(verifyData.error || 'Payment verification failed');
        }
      } else if (data.type === 'failed') {
        onPaymentFailure(data.error || 'Payment failed');
      } else if (data.type === 'cancelled') {
        onClose();
      }
    } catch (err) {
      onPaymentFailure('Error processing payment response');
    }
  };

  const formatAmount = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Feather name="x" size={24} color={theme.text} />
          </Pressable>
          <View style={styles.headerContent}>
            <ThemedText type="body" style={{ fontWeight: '600' }}>Payment</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {formatAmount(amount)}
            </ThemedText>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <View style={[styles.paymentInfo, { backgroundColor: theme.backgroundSecondary }]}>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>Paying for</ThemedText>
          <ThemedText type="body" style={{ fontWeight: '600', marginTop: Spacing.xs }}>
            {stageName}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
            {clientName}
          </ThemedText>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.light.primary} />
            <ThemedText type="body" style={{ marginTop: Spacing.lg, color: theme.textSecondary }}>
              Initializing payment...
            </ThemedText>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <View style={[styles.errorIcon, { backgroundColor: Colors.light.error + '15' }]}>
              <Feather name="alert-circle" size={32} color={Colors.light.error} />
            </View>
            <ThemedText type="body" style={{ textAlign: 'center', marginTop: Spacing.lg }}>
              {error}
            </ThemedText>
            <Button onPress={createOrder} style={{ marginTop: Spacing.xl }}>
              Try Again
            </Button>
          </View>
        ) : orderData ? (
          <WebView
            ref={webViewRef}
            source={{ html: getCheckoutHTML() }}
            onMessage={handleWebViewMessage}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            scalesPageToFit={true}
            style={styles.webview}
            renderLoading={() => (
              <View style={styles.webviewLoading}>
                <ActivityIndicator size="large" color={Colors.light.primary} />
              </View>
            )}
          />
        ) : null}

        <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg }]}>
          <View style={styles.securePayment}>
            <Feather name="lock" size={14} color={theme.textSecondary} />
            <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: Spacing.xs }}>
              Secured by Razorpay
            </ThemedText>
          </View>
        </View>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  headerContent: {
    alignItems: 'center',
  },
  paymentInfo: {
    padding: Spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  errorIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webview: {
    flex: 1,
  },
  webviewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  footer: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  securePayment: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
