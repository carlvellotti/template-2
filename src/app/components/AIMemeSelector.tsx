'use client';

import { useState } from 'react';
import { MemeTemplate } from '@/lib/supabase/types';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';

interface AIMemeSelector {
  onSelectTemplate: (template: MemeTemplate, caption: string, allOptions: SelectedMeme) => void;
  isGreenscreenMode: boolean;
  onToggleMode: () => void;
}

interface AIResponse {
  templates: {
    template: number;
    captions: string[];
  }[];
}

interface SelectedMeme {
  templates: {
    template: MemeTemplate;
    captions: string[];
  }[];
  selectedTemplate?: MemeTemplate;
  selectedCaption?: string;
}

// Add type for template with indices
interface TemplateWithIndex extends MemeTemplate {
  originalIndex: number;
}

// Add this interface to properly type the template data from AI
interface TemplateResponse {
  template: number;
  captions: string[];
}

export default function AIMemeSelector({ onSelectTemplate, isGreenscreenMode, onToggleMode }: AIMemeSelector) {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [audience, setAudience] = useState('');
  const [selectedModel, setSelectedModel] = useState<'openai' | 'anthropic'>('anthropic');
  const [meme, setMeme] = useState<SelectedMeme | null>(null);
  const [showInitialForm, setShowInitialForm] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsLoading(true);
    setShowInitialForm(false);
    try {
      // Get relevant templates using vector similarity
      const response = await fetch('/api/meme-selection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt,
          audience,
          isGreenscreenMode
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.details || 'Failed to get templates');
      }

      const { templates: fetchedTemplates } = await response.json();
      
      const templatesWithIndices = fetchedTemplates.map((template: MemeTemplate, index: number) => ({
        ...template,
        originalIndex: index + 1
      }));

      const templatesText = templatesWithIndices.map((template: MemeTemplate & { originalIndex: number }) => 
        `${template.originalIndex}. ${template.name}\nInstructions: ${template.instructions || 'No specific instructions'}`
      ).join('\n');

      // Make API call for templates and captions
      const aiResponse = await fetch('/api/anthropic/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `I want to create a meme with this idea: "${prompt}"\n\nAvailable templates:\n${templatesText}`,
            audience: audience || 'general audience'
          }]
        }),
      });

      if (!aiResponse.ok) {
        throw new Error('Failed to get AI response');
      }

      const data: AIResponse = await aiResponse.json();
      
      // Map both templates to their full data
      const selectedTemplates = data.templates.map((templateData: TemplateResponse) => {
        console.log('Looking for template number:', templateData.template);
        console.log('Available templates:', templatesWithIndices.map((t: TemplateWithIndex) => ({
          index: t.originalIndex,
          name: t.name
        })));

        const selectedTemplate = templatesWithIndices.find(
          (t: TemplateWithIndex) => t.originalIndex === templateData.template
        );
        
        if (!selectedTemplate) {
          throw new Error(`Could not find template ${templateData.template}`);
        }

        console.log('Found template:', selectedTemplate.name);

        return {
          template: selectedTemplate,
          captions: templateData.captions
        };
      });

      console.log('Selected templates:', selectedTemplates.map(t => ({
        name: t.template.name,
        captions: t.captions
      })));

      setMeme({
        templates: selectedTemplates
      });
    } catch (error) {
      console.error('Error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate meme');
      setShowInitialForm(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCaptionSelect = (template: MemeTemplate, caption: string) => {
    if (meme) {
      onSelectTemplate(template, caption, meme);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Generating meme options...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showInitialForm ? (
        // Phase 1: Initial Form
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Audience
            </label>
            <input
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              className="w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Software developers, gamers, crypto traders..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Describe your meme idea
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              className="w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Describe what kind of meme you want to create... (Press Enter to submit, Shift+Enter for new line)"
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isGreenscreenMode}
                onChange={onToggleMode}
                className="w-4 h-4"
              />
              <span>Greenscreen Mode</span>
            </label>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select AI Model
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value as 'openai' | 'anthropic')}
              className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="anthropic">Claude</option>
              <option value="openai">GPT-4</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={!prompt.trim()}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            Generate with AI
          </button>
        </form>
      ) : meme && (
        // Phase 2 & 3: Generated Options
        <div className="grid gap-4 md:grid-cols-2">
          {meme.templates.map((templateData, templateIndex) => (
            <div key={templateIndex} className="p-4 border rounded-lg bg-gray-50">
              <h3 className="font-medium mb-4">{templateData.template.name}</h3>
              
              <div className="space-y-3 mb-6">
                <h4 className="font-medium text-blue-600">Captions:</h4>
                {templateData.captions.map((caption, captionIndex) => (
                  <button
                    key={captionIndex}
                    onClick={() => handleCaptionSelect(templateData.template, caption)}
                    className="w-full p-3 text-left border rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors flex items-center gap-2"
                  >
                    <span className="w-6 h-6 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 text-sm">
                      {captionIndex + 1}
                    </span>
                    <span>{caption}</span>
                  </button>
                ))}
              </div>

              <div className="border rounded-lg overflow-hidden">
                <video 
                  src={templateData.template.video_url}
                  className="w-full aspect-video object-cover"
                  controls
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 