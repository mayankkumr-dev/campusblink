import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router';
import { MenuEditorPanel } from './canteen/MenuEditorPanel';
import { MobileMenuManagement } from './canteen/MobileMenuManagement';
import { getMenuItems } from '../../api/canteen';
import { ListSkeleton } from '../../app/components/ui/Skeletons';

export const AdminCanteenMenuPage: React.FC = () => {
  const { shop } = useOutletContext<{ shop: any }>();
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadMenu() {
      if (!shop?.id) return;
      setIsLoading(true);
      const { data } = await getMenuItems(shop.id);
      if (data) setMenuItems(data);
      setIsLoading(false);
    }
    loadMenu();
  }, [shop?.id]);

  if (isLoading) {
    return <div className="p-4 md:p-8 space-y-4"><ListSkeleton rows={5} /></div>;
  }

  return (
    <div className="p-4 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="hidden md:block max-w-5xl mx-auto">
        <MenuEditorPanel shop={shop} menuItems={menuItems} setMenuItems={setMenuItems} />
      </div>
      <div className="md:hidden">
        <MobileMenuManagement shop={shop} menuItems={menuItems} setMenuItems={setMenuItems} />
      </div>
    </div>
  );
};
