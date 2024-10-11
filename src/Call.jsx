import React, { useState, useRef, useEffect } from "react"
import { db } from "./firebaseConfig"
import {
    collection,
    doc,
    addDoc,
    setDoc,
    getDoc,
    onSnapshot,
} from "firebase/firestore"

const Call = () => {
    const [callId, setCallId] = useState("")
    const [gyroData, setGyroData] = useState({ alpha: 0, beta: 0, gamma: 0 }) // State to store gyro data
    const [dotPosition, setDotPosition] = useState({ x: 400, y: 400 }) // Initial dot position
    const canvasRef = useRef(null)
    const peerConnection = useRef(null)
    const dataChannel = useRef(null)
    const callDocRef = useRef(null)

    const servers = {
        iceServers: [
            {
                urls: "stun:stun.l.google.com:19302", // Google's public STUN server
            },
        ],
    }

    // Function to create a new call (offer)
    const createCall = async () => {
        peerConnection.current = new RTCPeerConnection(servers)

        // Create the data channel for gyroscope data transfer
        dataChannel.current =
            peerConnection.current.createDataChannel("gyroData")
        dataChannel.current.onopen = () => {
            console.log("Data channel is open")
        }
        dataChannel.current.onclose = () => {
            console.log("Data channel is closed")
        }

        // Create a Firestore document for the call
        const callDoc = doc(collection(db, "calls"))
        callDocRef.current = callDoc
        const offerCandidates = collection(callDoc, "offerCandidates")
        const answerCandidates = collection(callDoc, "answerCandidates")

        // Listen for ICE candidates from the local peer
        peerConnection.current.onicecandidate = (event) => {
            if (event.candidate) {
                addDoc(offerCandidates, event.candidate.toJSON())
            }
        }

        // Create an SDP offer
        const offerDescription = await peerConnection.current.createOffer()
        await peerConnection.current.setLocalDescription(offerDescription)

        // Save the offer to Firestore
        const offer = {
            sdp: offerDescription.sdp,
            type: offerDescription.type,
        }
        await setDoc(callDoc, { offer })
        setCallId(callDoc.id)

        // Listen for the SDP answer
        onSnapshot(callDoc, (snapshot) => {
            const data = snapshot.data()
            if (
                !peerConnection.current.currentRemoteDescription &&
                data?.answer
            ) {
                const answerDescription = new RTCSessionDescription(data.answer)
                peerConnection.current.setRemoteDescription(answerDescription)
            }
        })

        // Listen for ICE candidates from the remote peer
        onSnapshot(answerCandidates, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    const candidate = new RTCIceCandidate(change.doc.data())
                    peerConnection.current.addIceCandidate(candidate)
                }
            })
        })
    }

    // Function to answer an existing call (answer)
    const answerCall = async (id) => {
        const callDoc = doc(db, "calls", id)
        callDocRef.current = callDoc
        const offerCandidates = collection(callDoc, "offerCandidates")
        const answerCandidates = collection(callDoc, "answerCandidates")

        peerConnection.current = new RTCPeerConnection(servers)

        // Listen for data channel events (from remote peer)
        peerConnection.current.ondatachannel = (event) => {
            dataChannel.current = event.channel
            dataChannel.current.onmessage = (event) => {
                const receivedGyroData = JSON.parse(event.data)
                setGyroData(receivedGyroData) // Update gyro data
            }
        }

        // Listen for ICE candidates from the local peer
        peerConnection.current.onicecandidate = (event) => {
            if (event.candidate) {
                addDoc(answerCandidates, event.candidate.toJSON())
            }
        }

        // Get the offer from Firestore and set it as remote description
        const callData = (await getDoc(callDoc)).data()
        const offerDescription = callData.offer
        await peerConnection.current.setRemoteDescription(
            new RTCSessionDescription(offerDescription)
        )

        // Create an SDP answer and save it to Firestore
        const answerDescription = await peerConnection.current.createAnswer()
        await peerConnection.current.setLocalDescription(answerDescription)

        const answer = {
            type: answerDescription.type,
            sdp: answerDescription.sdp,
        }
        await setDoc(callDoc, { answer }, { merge: true })

        // Listen for ICE candidates from the remote peer
        onSnapshot(offerCandidates, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    const candidate = new RTCIceCandidate(change.doc.data())
                    peerConnection.current.addIceCandidate(candidate)
                }
            })
        })
    }

    // Send Gyroscope Data
    const sendGyroData = (data) => {
        if (dataChannel.current && dataChannel.current.readyState === "open") {
            dataChannel.current.send(JSON.stringify(data))
        }
    }

    // Set up Gyroscope event listener on the phone
    const startGyroTransmission = () => {
        if (window.DeviceOrientationEvent) {
            window.addEventListener("deviceorientation", (event) => {
                const gyroData = {
                    alpha: Math.round(event.alpha * 1000) / 1000, // Round alpha to 3 decimal places
                    beta: Math.round(event.beta * 1000) / 1000, // Round beta to 3 decimal places
                    gamma: Math.round(event.gamma * 1000) / 1000, // Round gamma to 3 decimal places
                }
                sendGyroData(gyroData)
            })
        } else {
            alert("Device Orientation API not supported on this device")
        }
    }

    // Function to update the position of the dot based on gyroData
    useEffect(() => {
        const canvas = canvasRef.current
        const ctx = canvas.getContext("2d")

        // Clear the canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        // Calculate new dot position based on gyroscope data
        const newX = 400 + gyroData.gamma * 20 // Adjust gamma for x-axis movement
        const newY = 400 + gyroData.beta * 20 // Adjust beta for y-axis movement

        setDotPosition({ x: newX, y: newY })

        // Draw the dot on the canvas
        ctx.beginPath()
        ctx.arc(dotPosition.x, dotPosition.y, 10, 0, 2 * Math.PI) // Draw a circle (dot)
        ctx.fillStyle = "red"
        ctx.fill()
        ctx.closePath()
    }, [gyroData]) // Re-run effect when gyroData changes

    return (
        <div>
            <h1>Gyroscope Data Transfer</h1>

            <button onClick={createCall}>Create Call</button>

            <input
                value={callId}
                onChange={(e) => setCallId(e.target.value)}
                placeholder="Enter call ID"
            />
            <button onClick={() => answerCall(callId)}>Answer Call</button>

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

            <canvas
                ref={canvasRef}
                width={800} // Increased width
                height={800} // Increased height
                style={{ border: "1px solid black" }}
            />
        </div>
    )
}

export default Call
