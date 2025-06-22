import { useEffect, useRef, useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import BurgerMenu from './components/BurgerMenu'
import About from './pages/About'
import Contact from './pages/Contact'
import './App.css'

// Rename the camera component
const Camera = () => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string>('')
  const [photoTaken, setPhotoTaken] = useState<boolean>(false)
  const [signalStatus, setSignalStatus] = useState<string>('')

  useEffect(() => {
    // Request camera access when component mounts
    async function setupCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user' } 
        })
        setStream(mediaStream)
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
        }
      } catch (err) {
        setError('Failed to access camera. Please make sure you have granted camera permissions.')
        console.error('Error accessing camera:', err)
      }
    }

    setupCamera()

    // Cleanup function to stop the camera when component unmounts
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const takePhoto = () => {
    if (!videoRef.current) return

    // Create a canvas element to capture the photo
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    
    // Draw the current video frame onto the canvas
    const context = canvas.getContext('2d')
    if (context) {
      context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
      
      // Convert the canvas to a data URL
      const photoUrl = canvas.toDataURL('image/png')
      
      // Save to localStorage
      try {
        localStorage.setItem('image_1', photoUrl)
        setPhotoTaken(true)
      } catch (err) {
        setError('Failed to save photo. The image might be too large.')
        console.error('Error saving to localStorage:', err)
      }
    }
  }

  const sendSignal = async () => {
    try {
      setSignalStatus('Sending signal...')
      const response = await fetch('http://10.200.13.110:8000', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: 'testing'
      })
      
      if (response.ok) {
        setSignalStatus('Signal sent successfully!')
        setTimeout(() => setSignalStatus(''), 3000) // Clear status after 3 seconds
      } else {
        throw new Error('Failed to send signal')
      }
    } catch (err) {
      setSignalStatus('Failed to send signal. Please try again.')
      console.error('Error sending signal:', err)
    }
  }

  return (
    <div className="camera-container">
      <BurgerMenu />
      {error ? (
        <div className="error-message">{error}</div>
      ) : (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="camera-preview"
          />
          <button onClick={takePhoto} className="capture-button">
            {photoTaken ? 'Photo Saved!' : 'Take Photo'}
          </button>
          {photoTaken && (
            <p className="success-message">
              Photo has been saved!
            </p>
          )}
          <button onClick={sendSignal} className="signal-button">
            Send Signal
          </button>
          {signalStatus && (
            <p className={signalStatus.includes('success') ? 'success-message' : 'status-message'}>
              {signalStatus}
            </p>
          )}
        </>
      )}
    </div>
  )
}

// Main App component with routing
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Camera />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
      </Routes>
    </Router>
  )
}

export default App
