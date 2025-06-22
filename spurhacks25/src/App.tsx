import { useEffect, useRef, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom'
import BurgerMenu from './components/BurgerMenu'
import About from './pages/About'
import Contact from './pages/Contact'
import Results from './pages/Results'
import './App.css'

const Camera = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string>('')
  const [photoCount, setPhotoCount] = useState<number>(0)
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [signalStatus, setSignalStatus] = useState<string>('')
  const [aiColors, setAiColors] = useState<string[]>([])
  const [hasInitialPhoto, setHasInitialPhoto] = useState<boolean>(false)

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

  const generateRandomColors = () => {
    const generateColor = () => {
      const r = Math.floor(Math.random() * 256);
      const g = Math.floor(Math.random() * 256);
      const b = Math.floor(Math.random() * 256);
      return `${r},${g},${b}`;
    };

    const colors = [
      generateColor(),
      generateColor(),
      generateColor()
    ];
    console.log('Generated test colors:', colors);
    setAiColors(colors);
    return colors;
  };

  const sendSignal = async (colorValues: string) => {
    try {
      setSignalStatus('Sending signal...');
      const response = await fetch('http://10.200.13.110:8000', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: colorValues
      });
      
      if (response.ok) {
        setSignalStatus('Signal sent successfully!');
        setTimeout(() => setSignalStatus(''), 3000);
      } else {
        throw new Error('Failed to send signal');
      }
    } catch (err) {
      setSignalStatus('Failed to send signal. Please try again.');
      console.error('Error sending signal:', err);
    }
  };

  const takePhoto = async () => {
    if (!videoRef.current) return;
    setIsProcessing(true);

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
          if (!hasInitialPhoto) {
            // Save initial photo and generate colors
            localStorage.setItem('initial_photo', finalCanvas.toDataURL('image/png'));
            setHasInitialPhoto(true);
            generateRandomColors();
            // Wait for 2 seconds to show processing state
            await new Promise(resolve => setTimeout(resolve, 2000));
            setIsProcessing(false);
            return;
          }

          // Save the analysis photo with the appropriate name
          const photoNumber = photoCount + 1;
          localStorage.setItem(`analysis_${photoNumber}`, finalCanvas.toDataURL('image/png'));
          
          // Send the appropriate color signal
          if (aiColors.length > 0) {
            await sendSignal(aiColors[photoCount]);
          }

          // Wait for 2 seconds to show processing state
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const newPhotoCount = photoCount + 1;
          setPhotoCount(newPhotoCount);
          setIsProcessing(false);

          // If all photos are taken, navigate to results
          if (newPhotoCount >= 3) {
            // Stop the camera stream
            if (stream) {
              stream.getTracks().forEach(track => track.stop());
            }
            // Navigate to results page
            setTimeout(() => navigate('/results'), 1000);
          }
        } catch (err) {
          setError('Failed to save photo. The image might be too large.');
          console.error('Error saving to localStorage:', err);
          setIsProcessing(false);
        }
      }
    }
  };

  const getButtonText = () => {
    if (isProcessing) return "Processing...";
    if (!hasInitialPhoto) return "Take Photo";
    switch (photoCount) {
      case 0: return "Take 1st Photo";
      case 1: return "Take 2nd Photo";
      case 2: return "Take 3rd Photo";
      default: return "Analysis Complete";
    }
  };

  return (
    <div className="camera-container">
      <h1 className="site-title">Plastif.ai</h1>
      <BurgerMenu />
      {error ? (
        <div className="error-message">{error}</div>
      ) : (
        <>
          <div className="instructions">
            <h2>Check your water quality!</h2>
            <p>Line up your camera with the magnifier, center your camera, then click take photo!</p>
          </div>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="camera-preview"
          />
          <button 
            onClick={takePhoto} 
            className={`capture-button ${isProcessing ? 'processing' : ''} ${photoCount >= 3 ? 'disabled' : ''}`}
            disabled={photoCount >= 3 || isProcessing}
          >
            {getButtonText()}
          </button>
          {signalStatus && (
            <p className={signalStatus.includes('success') ? 'success-message' : 'status-message'}>
              {signalStatus}
            </p>
          )}
        </>
      )}
    </div>
  );
};

// Main App component with routing
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Camera />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/results" element={<Results />} />
      </Routes>
    </Router>
  )
}

export default App
