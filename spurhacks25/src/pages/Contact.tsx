import BurgerMenu from '../components/BurgerMenu'
import '../styles/Pages.css'
import catImage from '../cute_cat.png'

const Contact = () => {
  return (
    <div className="page-container">
      <img src={catImage} alt="Cute cat" className="corner-cat" />
      <h1 className="site-title">Plastif.ai</h1>
      <BurgerMenu />
      <div className="content">
        <h2>Contact Us</h2>
        <div className="contact-content">
          <p>
            Have questions about Plastif.ai or want to learn more about our plastic
            recycling technology? We'd love to hear from you!
          </p>
          <div className="contact-info">
            <div className="contact-item">
              <h3>Email</h3>
              <p>aiplastif@gmail.com</p>
            </div>
            <div className="contact-item">
              <h3>Social Media</h3>
              <p>These are just for fun</p>
              <p>Twitter: @plastif_ai</p>
              <p>LinkedIn: plastif-ai</p>
            </div>
            <div className="contact-item">
              <h3>Location</h3>
              <p>Spur Innovation Hub</p>
              <p>Kitchener, On, Canada</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Contact 