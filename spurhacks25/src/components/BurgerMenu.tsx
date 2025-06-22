import { useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/BurgerMenu.css';

const BurgerMenu = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="burger-menu-container">
      <button 
        className={`burger-button ${isOpen ? 'open' : ''}`} 
        onClick={toggleMenu}
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      <nav className={`menu-items ${isOpen ? 'open' : ''}`}>
        <ul>
          <li><Link to="/home" onClick={toggleMenu}>Home</Link></li>
          <li><Link to="/test" onClick={toggleMenu}>Test Water</Link></li>
          <li><Link to="/about" onClick={toggleMenu}>About</Link></li>
          <li><Link to="/contact" onClick={toggleMenu}>Contact</Link></li>
        </ul>
      </nav>

      {isOpen && <div className="menu-overlay" onClick={toggleMenu}></div>}
    </div>
  );
};

export default BurgerMenu; 