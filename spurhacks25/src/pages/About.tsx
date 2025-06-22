import BurgerMenu from '../components/BurgerMenu'
import '../styles/Pages.css'

const About = () => {
  return (
    <div className="page-container">
      <BurgerMenu />
      <div className="content">
        <h1>About Us</h1>
        <div className="about-content">
          <p>
            Welcome to our innovative photo capture application! We are passionate about creating
            simple yet powerful tools that make capturing and storing memories easier than ever.
          </p>
          <p>
            Our team is dedicated to developing user-friendly applications that leverage modern
            web technologies to provide seamless experiences across all devices.
          </p>
          <p>
            This application was built using React and modern web APIs, allowing you to take
            photos directly from your browser and store them locally for easy access.
          </p>
        </div>
      </div>
    </div>
  )
}

export default About 