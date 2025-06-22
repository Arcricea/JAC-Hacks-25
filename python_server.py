import http.server
import socketserver
import json
from urllib.parse import urlparse, parse_qs
import serial
import time
import threading

# Server configuration
HOST = '0.0.0.0'
PORT = 8000

# Arduino configuration
ARDUINO_PORT = 'COM5'  # Change this to your Arduino port
ARDUINO_BAUD = 9600

class ArduinoController:
    def __init__(self, port, baud_rate):
        self.port = port
        self.baud_rate = baud_rate
        self.ser = None
        self.connected = False
        self.connect()
    
    def connect(self):
        try:
            self.ser = serial.Serial(self.port, self.baud_rate, timeout=2)
            time.sleep(2)  # Give Arduino time to initialize
            self.connected = True
            print(f"✓ Connected to Arduino on {self.port}")
        except serial.SerialException as e:
            print(f"✗ Failed to connect to Arduino: {e}")
            self.connected = False
    
    def send_color(self, red, green, blue):
        if not self.connected:
            print("Arduino not connected, attempting to reconnect...")
            self.connect()
            if not self.connected:
                return False
        
        try:
            # Ensure values are within 0-255 range
            red = max(0, min(255, int(red)))
            green = max(0, min(255, int(green)))
            blue = max(0, min(255, int(blue)))
            
            color_string = f"{red},{green},{blue}\n"
            self.ser.write(color_string.encode('utf-8'))
            print(f"✓ Sent to Arduino: R={red}, G={green}, B={blue}")
            return True
        except Exception as e:
            print(f"✗ Error sending to Arduino: {e}")
            self.connected = False
            return False
    
    def close(self):
        if self.ser and self.ser.is_open:
            self.ser.close()
            print("Arduino connection closed")

# Global Arduino controller instance
arduino = ArduinoController(ARDUINO_PORT, ARDUINO_BAUD)

def extract_color_from_data(data):
    """Extract RGB values from various data formats"""
    if isinstance(data, dict):
        # JSON format: {"red": 255, "green": 128, "blue": 64}
        # or {"r": 255, "g": 128, "b": 64}
        # or {"color": "255,128,64"}
        if 'red' in data and 'green' in data and 'blue' in data:
            return data['red'], data['green'], data['blue']
        elif 'r' in data and 'g' in data and 'b' in data:
            return data['r'], data['g'], data['b']
        elif 'color' in data:
            try:
                parts = data['color'].split(',')
                if len(parts) == 3:
                    return int(parts[0]), int(parts[1]), int(parts[2])
            except:
                pass
    elif isinstance(data, str):
        # String format: "255,128,64"
        try:
            parts = data.split(',')
            if len(parts) == 3:
                return int(parts[0]), int(parts[1]), int(parts[2])
        except:
            pass
    
    return None

class MyHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Parse URL for query parameters
        parsed_url = urlparse(self.path)
        query_params = parse_qs(parsed_url.query)
        
        print(f"\nReceived GET request from {self.client_address[0]}:{self.client_address[1]}")
        print(f"Path: {self.path}")
        print(f"Query Parameters: {query_params}")
        
        # Check for color parameters in GET request
        # Format: http://localhost:8000/?red=255&green=128&blue=64
        # or: http://localhost:8000/?color=255,128,64
        color_changed = False
        if 'red' in query_params and 'green' in query_params and 'blue' in query_params:
            try:
                red = int(query_params['red'][0])
                green = int(query_params['green'][0])
                blue = int(query_params['blue'][0])
                arduino.send_color(red, green, blue)
                color_changed = True
            except ValueError:
                print("Invalid color values in GET parameters")
        elif 'color' in query_params:
            color_data = extract_color_from_data(query_params['color'][0])
            if color_data:
                arduino.send_color(*color_data)
                color_changed = True
        
        self.send_response(200)
        self.send_header("Content-type", "text/html")
        self.end_headers()
        
        response_message = f"""
        <html>
        <body>
        <h2>Arduino RGB Controller Server</h2>
        <p>Hello from your server! You sent a GET request.</p>
        <p>Your data: {query_params}</p>
        {'<p style="color: green;">✓ Color sent to Arduino!</p>' if color_changed else ''}
        
        <h3>Test Color Control:</h3>
        <p><a href="/?red=255&green=0&blue=0">Red</a></p>
        <p><a href="/?red=0&green=255&blue=0">Green</a></p>
        <p><a href="/?red=0&green=0&blue=255">Blue</a></p>
        <p><a href="/?color=255,255,0">Yellow</a></p>
        <p><a href="/?color=255,0,255">Magenta</a></p>
        <p><a href="/?color=0,255,255">Cyan</a></p>
        </body>
        </html>
        """
        self.wfile.write(bytes(response_message, "utf-8"))
    
    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        print(f"\nReceived POST request from {self.client_address[0]}:{self.client_address[1]}")
        print(f"Path: {self.path}")
        print(f"Raw POST Data: {post_data.decode('utf-8')}")
        
        color_changed = False
        response_data = {"status": "success", "received_data": post_data.decode('utf-8')}
        
        try:
            json_data = json.loads(post_data)
            print(f"Parsed JSON Data: {json_data}")
            
            # Try to extract color from JSON
            color_data = extract_color_from_data(json_data)
            if color_data:
                arduino.send_color(*color_data)
                color_changed = True
                response_data["arduino_status"] = "color_sent"
            else:
                response_data["arduino_status"] = "no_color_data"
                
        except json.JSONDecodeError:
            print("POST data is not valid JSON. Checking for color string...")
            # Try to parse as color string
            color_data = extract_color_from_data(post_data.decode('utf-8'))
            if color_data:
                arduino.send_color(*color_data)
                color_changed = True
                response_data["arduino_status"] = "color_sent"
        
        self.send_response(200)
        self.send_header("Content-type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")  # Allow CORS
        self.end_headers()
        
        self.wfile.write(bytes(json.dumps(response_data), "utf-8"))

def cleanup():
    """Cleanup function to close Arduino connection"""
    arduino.close()

if __name__ == "__main__":
    try:
        with socketserver.TCPServer((HOST, PORT), MyHandler) as httpd:
            print(f"🚀 Arduino RGB Controller Server starting...")
            print(f"📡 Serving HTTP on {HOST}:{PORT}")
            print(f"🏠 Access locally: http://localhost:{PORT}")
            print(f"🌐 Access from network: http://[YOUR_IP]:{PORT}")
            print(f"🎨 Arduino on: {ARDUINO_PORT}")
            print("\n💡 Color control examples:")
            print(f"   GET: http://localhost:{PORT}/?red=255&green=0&blue=0")
            print(f"   POST JSON: {{\"red\": 255, \"green\": 128, \"blue\": 64}}")
            print(f"   POST String: \"255,128,64\"")
            print("\n🛑 Press Ctrl+C to stop the server.")
            
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except Exception as e:
        print(f"❌ Server error: {e}")
    finally:
        cleanup()