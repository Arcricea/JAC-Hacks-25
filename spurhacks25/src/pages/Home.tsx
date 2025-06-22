import { useNavigate } from 'react-router-dom';
import BurgerMenu from '../components/BurgerMenu';
import '../styles/Pages.css';
import catImage from '../cute_cat.png';

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="page-container home-page">
      <BurgerMenu />
      <div className="home-content">
        <div className="logo-section">
          <img src={catImage} alt="Plastif.ai Logo" className="home-logo" />
          <h1 className="home-title">Plastif.Ai</h1>
        </div>
        
        <p className="main-tagline">
          Verifying the safety of our most important resource
        </p>
        
        <p className="description">
          We're experimenting with cutting edge technology to bring water testing straight to the home. 
          With our attachment, any phone camera can become a microscope to view water down to an intricate level of detail.
        </p>

        <div className="how-it-works">
          <h2>How it works</h2>
          <p>
            Only 4 images are needed for microplastics detection. The first one to find the optimal colours 
            for the next 3 analysis photos. And then after all 3, our custom trained AI will detect the amount 
            of suspected microplastics, microorganisms, and algae!
          </p>
        </div>

        <button 
          className="try-it-button"
          onClick={() => navigate('/test')}
        >
          Try it out!
        </button>
      </div>
    </div>
  );
};

export default Home; 