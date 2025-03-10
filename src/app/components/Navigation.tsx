'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const routes = [
    { path: '/', label: 'Home' },
    { path: '/template-library', label: 'Template Library' },
    { path: '/upload', label: 'Upload Template' },
  ];

  // Check if the current path is a template-specific page
  const isTemplatePage = pathname.startsWith('/template/');
  
  // If on a template page, show "Template Library" as the current page in mobile view
  const currentPage = isTemplatePage 
    ? 'Template Library' 
    : (routes.find(route => route.path === pathname)?.label || 'Home');

  return (
    <nav className="border-b border-gray-800 bg-black">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-6xl">
        <Link href="/" className="text-2xl font-bold text-white">
          Meme Mage
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex space-x-6">
          {routes.map(route => (
            <Link
              key={route.path}
              href={route.path}
              className={`relative py-2 text-sm font-medium transition-colors
                ${(pathname === route.path || (isTemplatePage && route.path === '/template-library'))
                  ? 'text-blue-400' 
                  : 'text-gray-300 hover:text-white'
                }
                ${(pathname === route.path || (isTemplatePage && route.path === '/template-library'))
                  ? 'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-400' 
                  : ''
                }
              `}
            >
              {route.label}
            </Link>
          ))}
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center space-x-1 text-gray-300"
          >
            <span>{currentPage}</span>
            <svg
              className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {isOpen && (
            <div className="absolute right-0 mt-2 py-2 w-48 bg-gray-800 rounded-lg shadow-lg border border-gray-700">
              {routes.map(route => (
                <Link
                  key={route.path}
                  href={route.path}
                  className={`block px-4 py-2 text-sm ${
                    (pathname === route.path || (isTemplatePage && route.path === '/template-library'))
                      ? 'bg-gray-700 text-white font-medium'
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  {route.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
} 