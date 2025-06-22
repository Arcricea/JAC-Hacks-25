import { useEffect, useState } from 'react';
import BurgerMenu from '../components/BurgerMenu';
import '../styles/Pages.css';

const Results = () => {
  const [images, setImages] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    // Load images from localStorage
    const loadedImages: { [key: string]: string } = {};
    for (let i = 1; i <= 3; i++) {
      const image = localStorage.getItem(`analysis_${i}`);
      if (image) {
        loadedImages[`analysis_${i}`] = image;
      }
    }
    setImages(loadedImages);
  }, []);

  return (
    <div className="page-container">
      <h1 className="site-title">Plastif.ai</h1>
      <BurgerMenu />
      <div className="content-section">
        <h2>Analysis Results</h2>
        <div className="results-grid">
          {Object.entries(images).map(([key, imageData], index) => (
            <div key={key} className="result-item">
              <h3>Sample {index + 1}</h3>
              <img 
                src={imageData} 
                alt={`Analysis ${index + 1}`}
                className="analysis-image"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Results; 