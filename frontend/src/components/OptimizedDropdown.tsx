import React, { useState, useRef, useEffect } from 'react';

interface DropdownItem {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  danger?: boolean;
}

interface OptimizedDropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right';
  className?: string;
}

export const OptimizedDropdown: React.FC<OptimizedDropdownProps> = ({
  trigger,
  items,
  align = 'right',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Détection mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fermer au clic extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      // Délai pour éviter la fermeture immédiate sur mobile
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
      }, 100);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Fermer avec Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleItemClick = (item: DropdownItem) => {
    item.onClick();
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {trigger}
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Overlay pour mobile */}
          {isMobile && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-25 z-40"
              onClick={() => setIsOpen(false)}
            />
          )}

          {/* Menu */}
          <div
            className={`
              ${isMobile 
                ? 'fixed bottom-0 left-0 right-0 z-50 w-full max-h-[50vh] rounded-t-xl'
                : `absolute ${align === 'left' ? 'left-0' : 'right-0'} z-50 w-56 mt-2 rounded-md`
              }
              bg-white shadow-lg ring-1 ring-black ring-opacity-5 overflow-hidden
              animate-fadeIn
            `}
            role="menu"
            aria-orientation="vertical"
          >
            {/* Header mobile */}
            {isMobile && (
              <div className="flex items-center justify-between p-4 border-b">
                <span className="font-medium">Options</span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-full hover:bg-gray-100"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* Menu Items */}
            <div className={`py-1 ${isMobile ? 'overflow-y-auto' : ''}`}>
              {items.map((item, index) => (
                <button
                  key={index}
                  onClick={() => handleItemClick(item)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 text-sm text-left
                    ${item.danger ? 'text-red-600' : 'text-gray-700'}
                    ${isMobile ? 'min-h-[48px]' : ''}
                    hover:bg-gray-100 transition-colors
                    focus:outline-none focus:bg-gray-100
                  `}
                  role="menuitem"
                >
                  {item.icon && (
                    <span className="flex-shrink-0">{item.icon}</span>
                  )}
                  <span className="flex-1">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Style animations à ajouter au CSS global
const styles = `
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fadeIn {
  animation: fadeIn 0.2s ease-out;
}

/* Pour mobile, animation depuis le bas */
@media (max-width: 768px) {
  @keyframes slideUp {
    from {
      transform: translateY(100%);
    }
    to {
      transform: translateY(0);
    }
  }
  
  .animate-fadeIn {
    animation: slideUp 0.3s ease-out;
  }
}
`;

// Composant d'exemple d'utilisation
export const DropdownExample: React.FC = () => {
  const menuItems: DropdownItem[] = [
    {
      label: 'Profil',
      icon: '👤',
      onClick: () => console.log('Profil cliqué')
    },
    {
      label: 'Paramètres',
      icon: '⚙️',
      onClick: () => console.log('Paramètres cliqué')
    },
    {
      label: 'Aide',
      icon: '❓',
      onClick: () => console.log('Aide cliqué')
    },
    {
      label: 'Déconnexion',
      icon: '🚪',
      danger: true,
      onClick: () => console.log('Déconnexion cliqué')
    }
  ];

  return (
    <div className="p-4">
      <OptimizedDropdown
        trigger="Menu"
        items={menuItems}
        align="right"
      />
    </div>
  );
};