import { Suspense } from 'react';
import { OrderResult } from '@/components/shop/order-result';

export default function OrderCancelledPage() {
  return (
    <Suspense>
      <OrderResult variant="cancelled" />
    </Suspense>
  );
}
