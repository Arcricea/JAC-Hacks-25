import BurgerMenu from '../components/BurgerMenu'
import '../styles/Pages.css'

const Contact = () => {
  return (
    <div className="page-container">
      <BurgerMenu />
      <div className="content">
        <h1>Contact Us</h1>
        <div className="contact-content">
          <p>
            We'd love to hear from you! Whether you have questions, feedback, or just want to say hello,
            feel free to reach out to us.
          </p>
          <div className="contact-info">
            <div className="contact-item">
              <h3>Email</h3>
              <p>contact@example.com</p>
            </div>
            <div className="contact-item">
              <h3>Social Media</h3>
              <p>Follow us on Twitter: @example</p>
              <p>Connect on LinkedIn: example-company</p>
            </div>
            <div className="contact-item">
              <h3>Location</h3>
              <p>123 Tech Street</p>
              <p>Innovation City, IC 12345</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Contact 