// src/PhoneApp.jsx
import React, { useState } from "react"
import QrReader from "react-qr-reader" // Import the QR Reader library
import { db } from "./firebaseConfig" // Import your Firebase config
import { doc, getDoc } from "firebase/firestore" // Firestore methods

const PhoneApp = () => {
    const [callId, setCallId] = useState("")
    const [gyroData, setGyroData] = useState({ alpha: 0, beta: 0, gamma: 0 }) // State for gyro data
    const [isConnected, setIsConnected] = useState(false) // State to manage connection status

    const handleScan = async (data) => {
        if (data) {
            const url = new URL(data)
            const id = url.pathname.split("/").pop()
            setCallId(id) // Set the call ID

            // Connect to the call by fetching data from Firestore
            const callDoc = doc(db, "calls", id)
            const callData = (await getDoc(callDoc)).data()

            if (callData) {
                // Call the answer function here with the callData if needed
                setIsConnected(true)
                console.log(`Connected to call ID: ${id}`)
            } else {
                console.error("Call ID does not exist")
            }
        }
    }

    const handleError = (err) => {
        console.error(err)
    }

    // Function to start gyroscope data transmission
    const startGyroTransmission = () => {
        if (window.DeviceOrientationEvent) {
            window.addEventListener("deviceorientation", (event) => {
                const gyroData = {
                    alpha: event.alpha,
                    beta: event.beta,
                    gamma: event.gamma,
                }
                // Send gyro data to the server or directly to the laptop
                // Implement data transfer logic here
                console.log("Gyro data:", gyroData)
                setGyroData(gyroData) // Update gyro data state
            })
        } else {
            alert("Device Orientation API not supported on this device")
        }
    }

    return (
        <div>
            <h1>Phone App</h1>
            <QrReader
                delay={300}
                onError={handleError}
                onScan={handleScan}
                style={{ width: "100%" }}
            />
            {isConnected && <p>Connected to call ID: {callId}</p>}
            <button onClick={startGyroTransmission}>
                Start Gyro Transmission
            </button>
            <h2>Gyroscope Data</h2>
            <div>
                <p>
                    <strong>Alpha (Z-axis):</strong> {gyroData.alpha}
                </p>
                <p>
                    <strong>Beta (X-axis):</strong> {gyroData.beta}
                </p>
                <p>
                    <strong>Gamma (Y-axis):</strong> {gyroData.gamma}
                </p>
            </div>
        </div>
    )
}

export default PhoneApp
