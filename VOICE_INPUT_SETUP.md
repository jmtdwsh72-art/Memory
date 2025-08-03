# Voice Input Setup Guide

This document outlines the voice input functionality that has been implemented in the Memory Agent system.

## Overview

The voice input feature allows users to record audio messages using their microphone and automatically transcribe them to text using OpenAI's Whisper API.

## Backend Setup

### Environment Variables Required

Add to your `.env` file:
```env
OPENAI_API_KEY=your-openai-api-key-here
```

### API Endpoints

- `POST /api/transcribe` - Transcribe audio to text
- `GET /api/transcribe/status` - Check transcription service status

### Audio Support

- **Max Duration**: 20 seconds (configurable)
- **Max File Size**: 25MB
- **Supported Formats**: webm, wav, mp3, mp4, m4a, ogg
- **Audio Processing**: Automatic format detection and conversion

## Frontend Components

### VoiceRecorder Component

Located in `/frontend/components/voice-recorder.tsx`

**Features:**
- MediaRecorder API integration
- Real-time recording feedback
- Automatic permission handling
- Error handling and recovery
- Cross-browser compatibility

**States:**
- `idle` - Ready to record
- `recording` - Currently recording
- `transcribing` - Processing audio
- `error` - Error occurred

### Integration

The voice recorder is integrated into the `ChatInput` component and automatically:
1. Records audio when mic button is clicked
2. Sends audio to transcription API
3. Inserts transcribed text into the input field
4. Allows user to edit before sending

## Browser Compatibility

### Supported Browsers
- Chrome 47+
- Firefox 47+
- Safari 14+
- Edge 79+

### Required Permissions
- Microphone access (`navigator.mediaDevices.getUserMedia`)

### Fallback Behavior
- Graceful degradation when MediaRecorder is not supported
- Clear error messages for permission issues
- Alternative text input always available

## Usage Instructions

1. Click the microphone button in the chat input
2. Allow microphone permission when prompted
3. Speak your message (max 20 seconds)
4. Click the stop button or wait for auto-stop
5. Review the transcribed text
6. Edit if needed and send

## Technical Details

### Audio Processing Pipeline

1. **Capture**: MediaRecorder with optimized settings
   - Echo cancellation: enabled
   - Noise suppression: enabled
   - Sample rate: 16kHz
   - Bit rate: 64kbps

2. **Format**: Automatic MIME type detection
   - Prefers: `audio/webm;codecs=opus`
   - Fallback: `audio/mp4`, `audio/wav`

3. **Transmission**: Base64 encoded via JSON
4. **Transcription**: OpenAI Whisper API
5. **Response**: Sanitized and validated text

### Security Considerations

- Audio data is not stored on the server
- Transcription happens in real-time
- No persistent audio files created
- Input sanitization and length limits applied

### Error Handling

- **Permission Denied**: Clear instructions to enable mic access
- **Network Issues**: Retry mechanism with user feedback
- **Transcription Failures**: Fallback to text input
- **Browser Compatibility**: Feature detection and graceful degradation

## Troubleshooting

### Common Issues

1. **Microphone Not Working**
   - Check browser permissions
   - Ensure microphone is connected
   - Test in browser settings

2. **Transcription Errors**
   - Verify OpenAI API key is set
   - Check network connectivity
   - Ensure audio quality is good

3. **Browser Compatibility**
   - Update to latest browser version
   - Enable microphone permissions
   - Check HTTPS requirement for mic access

### Development Tips

- Test on HTTPS (required for microphone access)
- Monitor browser console for detailed error messages
- Use transcription status endpoint to verify API connectivity
- Test across different audio input devices

## Future Enhancements

Potential improvements:
- Language selection for transcription
- Voice activity detection
- Audio preprocessing (noise reduction)
- Offline transcription capabilities
- Voice shortcuts for common commands