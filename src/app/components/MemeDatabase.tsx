'use client';

import TemplateBrowser from './TemplateBrowser';
import { MemeTemplate } from '@/lib/supabase/types';

export default function MemeDatabase() {
  // This is now just a placeholder function since we're navigating directly to template pages
  const handleSelectTemplate = (template: MemeTemplate) => {
    // No longer needed, but kept for compatibility with TemplateBrowser props
    console.log('Template selected:', template.name);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <TemplateBrowser 
        onSelectTemplate={handleSelectTemplate}
      />
    </div>
  );
} 