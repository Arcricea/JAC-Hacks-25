import serial
import time

try:
    ser = serial.Serial('COM5', 9600, timeout=2)  # Added timeout
    time.sleep(2)  # Give Arduino time to initialize
    
    print("Connected to Arduino. Enter RGB values as: red,green,blue (e.g., 255,128,64)")
    
    while True:
        new_color = input("Enter a new color (or 'quit' to exit): ")
        
        if new_color.lower() == 'quit':
            break
            
        print(f"Sending: {new_color}")
        
        # Add newline character - this is crucial!
        data_to_send = (new_color + '\n').encode(encoding='utf-8')
        ser.write(data_to_send)
        
        # Wait a moment for Arduino to process
        time.sleep(0.1)
        
        # Read any response from Arduino
        while ser.in_waiting > 0:
            try:
                line = ser.readline().decode('utf-8').strip()
                if line:  # Only print non-empty lines
                    print(f"Arduino says: {line}")
            except UnicodeDecodeError:
                print("Received non-UTF8 data")
        
        print("Data sent successfully")

except serial.SerialException as e:
    print(f"Error opening serial port: {e}")
    print("Make sure:")
    print("1. Arduino is connected to COM5")
    print("2. No other program is using COM5")
    print("3. Arduino IDE Serial Monitor is closed")

except KeyboardInterrupt:
    print("\nProgram interrupted by user")

finally:
    if 'ser' in locals() and ser.is_open:
        ser.close()
        print("Serial connection closed")