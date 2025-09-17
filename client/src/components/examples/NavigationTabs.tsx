import { useState } from 'react';
import NavigationTabs from '../NavigationTabs';

export default function NavigationTabsExample() {
  const [activeTab, setActiveTab] = useState('conversation');

  return (
    <div className="fixed bottom-0 left-0 right-0">
      <NavigationTabs 
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    </div>
  );
}