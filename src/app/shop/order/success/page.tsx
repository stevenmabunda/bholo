import { Suspense } from 'react';
import { OrderResult } from '@/components/shop/order-result';

export default function OrderSuccessPage() {
  return (
    <Suspense>
      <OrderResult variant="success" />
    </Suspense>
  );
}
