import { Suspense } from 'react';
import { OrderResult } from '@/components/shop/order-result';

export default function OrderFailurePage() {
  return (
    <Suspense>
      <OrderResult variant="failure" />
    </Suspense>
  );
}
