import { useState, type FormEvent } from 'react';
import {
  CheckCircle2,
  CreditCard,
  Download,
  Lock,
  Minus,
  Plus,
  ShieldCheck,
  Smartphone,
  Trash2,
  X,
} from 'lucide-react';
import type { CartItem, OrderRecord } from '../types';
import { submitCheckoutOrder } from '../lib/api';
import { formatINR } from '../lib/geo';
import { ResilientPhoto } from './ResilientPhoto';

interface CartCheckoutDrawerProps {
  isOpen: boolean;
  items: CartItem[];
  onClose: () => void;
  onUpdateQty: (itemId: string, delta: number) => void;
  onRemoveItem: (itemId: string) => void;
  onClearCart: () => void;
}

export function CartCheckoutDrawer({
  isOpen,
  items,
  onClose,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
}: CartCheckoutDrawerProps) {
  const [step, setStep] = useState<'cart' | 'checkout' | 'receipt'>('cart');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'express' | 'bank'>('upi');
  const [upiId, setUpiId] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState<OrderRecord | null>(null);

  if (!isOpen) return null;

  const hasPrints = items.some((i) => i.kind === 'print');
  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const shippingFee = hasPrints ? (subtotal >= 7500 ? 0 : 350) : 0;
  const total = subtotal + shippingFee;
  const photographerPayout = Math.round(subtotal * 0.85);

  const formatCardInput = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const handlePlaceOrder = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (paymentMethod === 'upi') {
      if (!upiId.trim().includes('@')) {
        setError('Please enter a valid UPI ID (e.g., ananya@okicici).');
        return;
      }
    } else if (paymentMethod === 'card') {
      const digits = cardNumber.replace(/\D/g, '');
      if (digits.length < 12 || !cardExpiry.trim() || cardCvc.trim().length < 3) {
        setError('Please enter complete card number, expiry (MM/YY), and CVC.');
        return;
      }
    }

    try {
      setProcessing(true);
      const createdOrder = await submitCheckoutOrder({
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        shippingAddress: hasPrints ? shippingAddress.trim() : undefined,
        paymentMethod,
        cardNumber: paymentMethod === 'card' ? cardNumber : undefined,
        upiId: paymentMethod === 'upi' ? upiId.trim() : undefined,
        items,
      });
      setOrder(createdOrder);
      onClearCart();
      setStep('receipt');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to complete checkout.');
    } finally {
      setProcessing(false);
    }
  };

  const downloadLicenseCertificate = (rec: OrderRecord) => {
    const lines = [
      'MERIDIAN TRAVEL PHOTOGRAPHY — OFFICIAL LICENSE & ORDER CERTIFICATE',
      `Order Reference: ${rec.orderId}`,
      `Issued: ${new Date(rec.createdAt).toUTCString()}`,
      `Licensee / Collector: ${rec.customerName} (${rec.customerEmail})`,
      '',
      'ITEMS & RIGHTS GRANTED:',
      ...rec.items.map(
        (i) =>
          `- ${i.spotTitle} by ${i.photographerName} | ${i.optionLabel} x${i.quantity} (${formatINR(i.unitPrice)})`
      ),
      '',
      ...(rec.licenseKeys.length
        ? [
            'DIGITAL LICENSE KEYS:',
            ...rec.licenseKeys.map(
              (k) => `* ${k.spotTitle} (${k.licenseLabel}): ${k.certificateCode}`
            ),
            '',
          ]
        : []),
      `Total Paid: ${formatINR(rec.total)} INR`,
      `Direct Photographer Payout (85%): ${formatINR(rec.photographerPayout)} INR`,
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${rec.orderId}-certificate.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Collector cart and secure checkout"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex justify-end"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg bg-[#141821] text-zinc-100 h-full shadow-2xl border-l border-zinc-800 flex flex-col">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-editorial text-xl font-semibold text-zinc-100">
              {step === 'cart' && `Collector Cart (${items.length})`}
              {step === 'checkout' && 'Secure INR Payment Gateway'}
              {step === 'receipt' && 'Order & License Confirmed'}
            </h2>
            <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
              <Lock className="w-3 h-3 text-zinc-500" aria-hidden="true" />
              <span>85% direct photographer payout · UPI, Card &amp; NetBanking</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (step === 'receipt') setStep('cart');
              onClose();
            }}
            aria-label="Close cart drawer"
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 'cart' && (
            <>
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-16">
                  <p className="text-sm font-medium text-zinc-100">Your cart is empty</p>
                  <p className="text-xs text-zinc-400 mt-1 max-w-xs">
                    Open any geotagged photography gallery to order museum-grade archival prints or
                    license high-resolution images in Indian Rupees.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex gap-4 pb-4 border-b border-zinc-800/80 last:border-none"
                    >
                      <div className="w-20 h-16 rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800 shrink-0">
                        <ResilientPhoto
                          src={item.coverUrl}
                          alt={item.spotTitle}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium text-blue-400">
                          {item.kind === 'print' ? 'Fine Art Print' : 'Digital License'}
                        </p>
                        <h3 className="text-sm font-semibold text-zinc-100 truncate">
                          {item.spotTitle}
                        </h3>
                        <p className="text-xs text-zinc-400 truncate">{item.optionLabel}</p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          Photographer: {item.photographerName}
                        </p>

                        <div className="mt-2.5 flex items-center justify-between gap-2">
                          <div className="inline-flex items-center border border-zinc-700 bg-[#1A1F2B] rounded-md">
                            <button
                              type="button"
                              aria-label="Decrease quantity"
                              onClick={() => onUpdateQty(item.id, -1)}
                              className="p-1.5 text-zinc-300 hover:text-white cursor-pointer"
                            >
                              <Minus className="w-3 h-3" aria-hidden="true" />
                            </button>
                            <span className="px-2.5 text-xs font-mono text-zinc-100 tabular-nums">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              aria-label="Increase quantity"
                              onClick={() => onUpdateQty(item.id, 1)}
                              className="p-1.5 text-zinc-300 hover:text-white cursor-pointer"
                            >
                              <Plus className="w-3 h-3" aria-hidden="true" />
                            </button>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-sm font-mono font-semibold text-zinc-100 tabular-nums">
                              {formatINR(item.unitPrice * item.quantity)}
                            </span>
                            <button
                              type="button"
                              onClick={() => onRemoveItem(item.id)}
                              aria-label={`Remove ${item.spotTitle}`}
                              className="p-1 text-zinc-500 hover:text-rose-400 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {step === 'checkout' && (
            <form id="checkout-form" onSubmit={handlePlaceOrder} className="space-y-5">
              <div className="p-3.5 rounded-lg bg-[#1A1F2B] border border-zinc-800 flex items-center gap-2.5 text-xs text-zinc-300">
                <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" aria-hidden="true" />
                <span>
                  256-bit TLS encrypted payment · Direct artist settlement ({formatINR(photographerPayout)} to photographers)
                </span>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-zinc-100">1. Collector &amp; Delivery</h3>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Full name"
                  className="w-full px-3.5 py-2.5 text-sm bg-[#1A1F2B] border border-zinc-700 text-zinc-100 placeholder:text-zinc-500 rounded-lg focus:outline-none focus:border-blue-500"
                />
                <input
                  type="email"
                  required
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="Email for license certificates & tracking"
                  className="w-full px-3.5 py-2.5 text-sm bg-[#1A1F2B] border border-zinc-700 text-zinc-100 placeholder:text-zinc-500 rounded-lg focus:outline-none focus:border-blue-500"
                />
                {hasPrints && (
                  <textarea
                    rows={2}
                    required
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    placeholder="Full shipping address with PIN code for insured print delivery"
                    className="w-full px-3.5 py-2.5 text-sm bg-[#1A1F2B] border border-zinc-700 text-zinc-100 placeholder:text-zinc-500 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                )}
              </div>

              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-semibold text-zinc-100">2. Payment Method (INR)</h3>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'upi', label: 'UPI / QR' },
                    { id: 'card', label: 'Card' },
                    { id: 'bank', label: 'NetBanking' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id as 'upi' | 'card' | 'bank')}
                      className={`py-2 px-3 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                        paymentMethod === m.id
                          ? 'border-blue-500 bg-blue-950/60 text-blue-200'
                          : 'border-zinc-700 bg-[#1A1F2B] text-zinc-300 hover:border-zinc-500'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {paymentMethod === 'upi' && (
                  <div className="space-y-2 pt-1">
                    <div className="relative">
                      <Smartphone
                        className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                        aria-hidden="true"
                      />
                      <input
                        type="text"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="UPI ID (e.g. yourname@okicici or @ybl)"
                        className="w-full pl-9 pr-3 py-2.5 text-sm font-mono bg-[#1A1F2B] border border-zinc-700 text-zinc-100 placeholder:text-zinc-500 rounded-lg focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      Supports Google Pay, PhonePe, Paytm, and BHIM UPI instant settlement.
                    </p>
                  </div>
                )}

                {paymentMethod === 'card' && (
                  <div className="space-y-2.5 pt-1">
                    <div className="relative">
                      <CreditCard
                        className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                        aria-hidden="true"
                      />
                      <input
                        type="text"
                        inputMode="numeric"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(formatCardInput(e.target.value))}
                        placeholder="4242 4242 4242 4242"
                        className="w-full pl-9 pr-3 py-2.5 text-sm font-mono bg-[#1A1F2B] border border-zinc-700 text-zinc-100 placeholder:text-zinc-500 rounded-lg focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value.slice(0, 5))}
                        placeholder="MM/YY"
                        className="px-3.5 py-2.5 text-sm font-mono bg-[#1A1F2B] border border-zinc-700 text-zinc-100 placeholder:text-zinc-500 rounded-lg focus:outline-none focus:border-blue-500"
                      />
                      <input
                        type="text"
                        inputMode="numeric"
                        value={cardCvc}
                        onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="CVC"
                        className="px-3.5 py-2.5 text-sm font-mono bg-[#1A1F2B] border border-zinc-700 text-zinc-100 placeholder:text-zinc-500 rounded-lg focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}

                {paymentMethod === 'bank' && (
                  <p className="text-xs text-zinc-300 p-3 rounded-lg border border-zinc-800 bg-[#1A1F2B]">
                    NEFT / IMPS / NetBanking instant clearing reference will be generated with your
                    order receipt.
                  </p>
                )}
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-rose-950/70 border border-rose-800 text-xs text-rose-200">
                  {error}
                </div>
              )}
            </form>
          )}

          {step === 'receipt' && order && (
            <div className="space-y-6">
              <div className="p-5 rounded-xl bg-emerald-950/60 border border-emerald-800 space-y-2">
                <div className="flex items-center gap-2 text-emerald-200 font-semibold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" aria-hidden="true" />
                  <span>
                    Order {order.orderId} Confirmed — {order.status}
                  </span>
                </div>
                <p className="text-xs text-emerald-300">
                  Receipt sent to {order.customerEmail}. Photographers receive{' '}
                  {formatINR(order.photographerPayout)} directly via Meridian Artist Settlement.
                </p>
              </div>

              {order.licenseKeys.length > 0 && (
                <div className="space-y-2.5">
                  <h3 className="text-xs font-semibold text-zinc-100">
                    Issued Digital License Certificates
                  </h3>
                  {order.licenseKeys.map((k) => (
                    <div
                      key={k.certificateCode}
                      className="p-3.5 rounded-lg border border-zinc-800 bg-[#1A1F2B] space-y-1"
                    >
                      <p className="text-xs font-semibold text-zinc-100">{k.spotTitle}</p>
                      <p className="text-[11px] text-zinc-400">{k.licenseLabel}</p>
                      <p className="text-xs font-mono text-blue-400 pt-1">{k.certificateCode}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2 pt-2 border-t border-zinc-800 text-xs">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between gap-2 text-zinc-300">
                    <span className="truncate">
                      {item.spotTitle} ({item.optionLabel}) × {item.quantity}
                    </span>
                    <span className="font-mono tabular-nums shrink-0 text-zinc-100">
                      {formatINR(item.unitPrice * item.quantity)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t border-zinc-800 font-semibold text-zinc-100">
                  <span>Total Paid (INR)</span>
                  <span className="font-mono tabular-nums">{formatINR(order.total)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => downloadLicenseCertificate(order)}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                <span>Download Order &amp; License Certificate</span>
              </button>
            </div>
          )}
        </div>

        {step !== 'receipt' && items.length > 0 && (
          <div className="p-6 border-t border-zinc-800 bg-[#0F1218] space-y-3">
            <div className="space-y-1.5 text-xs text-zinc-400">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-mono tabular-nums text-zinc-100">{formatINR(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Archival Print Shipping (Free above ₹7,500)</span>
                <span className="font-mono tabular-nums text-zinc-100">
                  {shippingFee === 0 ? 'Free' : formatINR(shippingFee)}
                </span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Direct Photographer Payout (85%)</span>
                <span className="font-mono tabular-nums text-zinc-200">{formatINR(photographerPayout)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-zinc-800 text-sm font-semibold text-zinc-100">
                <span>Total (INR)</span>
                <span className="font-mono tabular-nums">{formatINR(total)}</span>
              </div>
            </div>

            {step === 'cart' ? (
              <button
                type="button"
                onClick={() => setStep('checkout')}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
              >
                Proceed to Secure Checkout
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep('cart')}
                  className="px-4 py-3 text-xs font-medium text-zinc-200 bg-[#1A1F2B] border border-zinc-700 rounded-lg hover:bg-zinc-800 cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  form="checkout-form"
                  disabled={processing}
                  className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
                >
                  {processing ? 'Authorizing Payment...' : `Pay ${formatINR(total)} Securely`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
