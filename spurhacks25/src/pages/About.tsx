import BurgerMenu from '../components/BurgerMenu'
import '../styles/Pages.css'
import catImage from '../cute_cat.png'

const About = () => {
  return (
    <div className="page-container">
      <img src={catImage} alt="Cute cat" className="corner-cat" />
      <h1 className="site-title">Plastif.ai</h1>
      <BurgerMenu />
      <div className="content">
        <h2>About Us</h2>
        <div className="about-content">
          <p>
            Welcome to Plastif.ai! We are dedicated to making plastic recycling easier and more
            efficient through the power of artificial intelligence and computer vision.
          </p>
          <p>
            Our application helps identify and categorize different types of plastics,
            making recycling more accessible and accurate for everyone.
          </p>
          <p>
            Using advanced machine learning algorithms, Plastif.ai can analyze photos of
            plastic items and provide instant feedback about their recyclability and
            proper disposal methods.
          </p>
        </div>
      </div>
    </div>
  )
}

export default About 