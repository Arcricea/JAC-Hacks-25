import BurgerMenu from '../components/BurgerMenu'
import '../styles/Pages.css'

const Contact = () => {
  return (
    <div className="page-container">
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
              <p>contact@plastif.ai</p>
            </div>
            <div className="contact-item">
              <h3>Social Media</h3>
              <p>Twitter: @plastif_ai</p>
              <p>LinkedIn: plastif-ai</p>
            </div>
            <div className="contact-item">
              <h3>Location</h3>
              <p>Innovation Hub</p>
              <p>Vancouver, BC, Canada</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Contact 