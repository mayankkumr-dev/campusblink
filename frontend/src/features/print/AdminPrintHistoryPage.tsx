import React from 'react';
import { useOutletContext } from 'react-router';
import { ShopOrderHistoryList } from '../../shared/components/OrderHistory/ShopOrderHistoryList';

export const AdminPrintHistoryPage: React.FC = () => {
  const { shop } = useOutletContext<{ shop: any }>();

  if (!shop?.id) return null;

  return (
    <div className="p-4 md:p-8 pb-32 w-full max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="mb-6 px-1">
        <h1 className="font-syne text-2xl font-extrabold text-gray-900 dark:text-shop-text-primary tracking-tight">
          Print History
        </h1>
        <p className="text-sm font-medium text-gray-500 dark:text-shop-text-secondary mt-1">
          Review past orders and performance
        </p>
      </header>

      <ShopOrderHistoryList shopId={shop.id} type="print" />
    </div>
  );
};
