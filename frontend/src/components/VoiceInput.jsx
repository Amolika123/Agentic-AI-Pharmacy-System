import { useState, useEffect } from 'react'

function VoiceInput({ onTranscript }) {
    const [isRecording, setIsRecording] = useState(false)
    const [isSupported, setIsSupported] = useState(false)
    const [recognition, setRecognition] = useState(null)

    useEffect(() => {
        // Check for Web Speech API support
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

        if (SpeechRecognition) {
            setIsSupported(true)
            const recognitionInstance = new SpeechRecognition()
            recognitionInstance.continuous = false
            recognitionInstance.interimResults = false
            recognitionInstance.lang = 'en-US'

            recognitionInstance.onresult = (event) => {
                const transcript = event.results[0][0].transcript
                onTranscript(transcript)
                setIsRecording(false)
            }

            recognitionInstance.onerror = (event) => {
                console.error('Speech recognition error:', event.error)
                setIsRecording(false)
            }

            recognitionInstance.onend = () => {
                setIsRecording(false)
            }

            setRecognition(recognitionInstance)
        }
    }, [onTranscript])

    const toggleRecording = () => {
        if (!recognition) return

        if (isRecording) {
            recognition.stop()
            setIsRecording(false)
        } else {
            recognition.start()
            setIsRecording(true)
        }
    }

    if (!isSupported) {
        return (
            <button className="voice-btn" disabled title="Voice input not supported">
                🎤
            </button>
        )
    }

    return (
        <button
            className={`voice-btn ${isRecording ? 'recording' : ''}`}
            onClick={toggleRecording}
            title={isRecording ? 'Stop recording' : 'Start voice input'}
        >
            {isRecording ? '⏹' : '🎤'}
        </button>
    )
}

export default VoiceInput
