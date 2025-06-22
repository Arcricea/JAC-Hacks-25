import { useEffect, useState } from 'react';
import BurgerMenu from '../components/BurgerMenu';
import '../styles/Pages.css';
import catImage from '../cute_cat.png';

interface WaterAnalysis {
  microplastics: string;
  microorganisms: string;
  algae: string;
}

const Results = () => {
  const [images, setImages] = useState<{ [key: string]: string }>({});
  const [averageAnalysis, setAverageAnalysis] = useState<WaterAnalysis | null>(null);

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

    // Load and average analyses from localStorage
    const analysesData = localStorage.getItem('water_analyses');
    if (analysesData) {
      const analyses: WaterAnalysis[] = JSON.parse(analysesData);
      
      // Calculate averages
      const sum = analyses.reduce((acc, analysis) => ({
        microplastics: acc.microplastics + parseFloat(analysis.microplastics),
        microorganisms: acc.microorganisms + parseFloat(analysis.microorganisms),
        algae: acc.algae + parseFloat(analysis.algae)
      }), {
        microplastics: 0,
        microorganisms: 0,
        algae: 0
      });

      const count = analyses.length;
      setAverageAnalysis({
        microplastics: (sum.microplastics / count).toFixed(3),
        microorganisms: (sum.microorganisms / count).toFixed(3),
        algae: (sum.algae / count).toFixed(3)
      });
    }
  }, []);

  return (
    <div className="page-container">
      <img src={catImage} alt="Cute cat" className="corner-cat" />
      <h1 className="site-title">Plastif.ai</h1>
      <BurgerMenu />
      <div className="content-section">
        <h2>Water Analysis Results</h2>
        <div className="samples-grid">
          {Object.entries(images).map(([key, imageData], index) => (
            <div key={key} className="sample-item">
              <h3>Sample {index + 1}</h3>
              <img 
                src={imageData} 
                alt={`Analysis ${index + 1}`}
                className="analysis-image"
              />
            </div>
          ))}
        </div>
        {averageAnalysis && (
          <div className="average-analysis">
            <h3>Average Water Quality Analysis</h3>
            <div className="analysis-card">
              <table>
                <tbody>
                  <tr>
                    <td>Microplastics:</td>
                    <td>{averageAnalysis.microplastics} PPM</td>
                    <td className="interpretation">
                      {parseFloat(averageAnalysis.microplastics) > 50 ? 
                        "⚠️ High concentration" : "✅ Normal levels"}
                    </td>
                  </tr>
                  <tr>
                    <td>Microorganisms:</td>
                    <td>{averageAnalysis.microorganisms} MPN</td>
                    <td className="interpretation">
                      {parseFloat(averageAnalysis.microorganisms) > 50 ? 
                        "⚠️ High concentration" : "✅ Normal levels"}
                    </td>
                  </tr>
                  <tr>
                    <td>Algae:</td>
                    <td>{averageAnalysis.algae} CFU/100mL</td>
                    <td className="interpretation">
                      {parseFloat(averageAnalysis.algae) > 50 ? 
                        "⚠️ High concentration" : "✅ Normal levels"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Results; 