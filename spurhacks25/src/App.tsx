import { useEffect, useRef, useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import BurgerMenu from './components/BurgerMenu'
import About from './pages/About'
import Contact from './pages/Contact'
import './App.css'

// Type for the AI response
interface GemmaResponse {
  candidates: Array<{
    content: {
      text: string;
    };
  }>;
}

// Rename the camera component
const Camera = () => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string>('')
  const [photoTaken, setPhotoTaken] = useState<boolean>(false)
  const [signalStatus, setSignalStatus] = useState<string>('')
  const [aiColors, setAiColors] = useState<string>('')

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

  const getAiColors = async () => {
    try {
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemma-3n-e4b:generateText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_GOOGLE_AI_KEY}`
        },
        body: JSON.stringify({
          prompt: {
            text: "give 3 colours that would be good for testing water quality. Return the RGB values as comma seperated values without spaces, and seperate the colours by using a period. An example of what would be returned would be '150,255,255.255,150,255.255,255,150'"
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data: GemmaResponse = await response.json();
      const colors = data.candidates[0].content.text.trim();
      localStorage.setItem('ai_colors', colors);
      setAiColors(colors);
      return colors;
    } catch (err) {
      console.error('Error getting AI colors:', err);
      setError('Failed to get color recommendations from AI');
      return null;
    }
  };

  const takePhoto = async () => {
    if (!videoRef.current) return;

    // Create a temporary canvas for the full image
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = videoRef.current.videoWidth;
    tempCanvas.height = videoRef.current.videoHeight;
    
    const tempContext = tempCanvas.getContext('2d');
    if (tempContext) {
      // Draw the full image
      tempContext.drawImage(videoRef.current, 0, 0, tempCanvas.width, tempCanvas.height);
      
      // Calculate the center crop coordinates
      const cropSize = 256;
      const startX = (tempCanvas.width - cropSize) / 2;
      const startY = (tempCanvas.height - cropSize) / 2;

      // Create the final 256x256 canvas
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = cropSize;
      finalCanvas.height = cropSize;
      
      const finalContext = finalCanvas.getContext('2d');
      if (finalContext) {
        // Draw the cropped portion
        finalContext.drawImage(
          tempCanvas,
          startX, startY, cropSize, cropSize,  // Source coordinates
          0, 0, cropSize, cropSize             // Destination coordinates
        );
        
        try {
          // Save the cropped image
          localStorage.setItem('image_1', finalCanvas.toDataURL('image/png'));
          setPhotoTaken(true);
          
          // Get and store AI colors
          await getAiColors();
        } catch (err) {
          setError('Failed to save photo. The image might be too large.');
          console.error('Error saving to localStorage:', err);
        }
      }
    }
  };

  const sendSignal = async () => {
    try {
      setSignalStatus('Sending signal...')
      const response = await fetch('http://10.200.13.110:8000', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: '150,255,255'
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
      <h1 className="site-title">Plastif.ai</h1>
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
            <>
              <p className="success-message">
                Photo has been saved!
              </p>
              {aiColors && (
                <p className="ai-colors">
                  Recommended test colors: {aiColors}
                </p>
              )}
            </>
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
