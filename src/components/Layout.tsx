import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex space-x-7">
              <Link to="/" className="flex items-center py-4 px-2">
                <span className="font-semibold text-gray-500 text-lg">Vibe Apps</span>
              </Link>
            </div>
            <div className="flex items-center space-x-3">
              <Link to="/" className="py-2 px-2 font-medium text-gray-500 hover:text-gray-900">
                Home
              </Link>
              <Link to="/about" className="py-2 px-2 font-medium text-gray-500 hover:text-gray-900">
                About
              </Link>
            </div>
          </div>
        </div>
      </nav>
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
