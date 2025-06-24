import React from 'react';
import { Link } from 'wouter';

const Header: React.FC = () => {
  return (
    <header className="bg-[#FEE80D] shadow-md">
      <div className="container mx-auto px-4 py-4 flex items-center justify-center">
        <Link href="/">
          <img 
            src="/assets/mercadolibre-logo.png" 
            alt="Mercado Livre Logo" 
            className="h-8 cursor-pointer"
          />
        </Link>
      </div>
    </header>
  );
};

export default Header;