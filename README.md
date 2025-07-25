# Phantom Lightning Animation

An immersive audio-visual experience inspired by "The Phantom of the Opera" that synchronizes dynamic lightning effects with musical peaks and crescendos.

## Features

🎭 **Audio-Synchronized Lightning**: Lightning flashes correspond to the loudest parts of the music
⚡ **Dynamic Effects**: Multiple types of lightning with different colors and intensities
🎵 **Real-time Audio Analysis**: Uses Web Audio API for frequency analysis
🎨 **Atmospheric Rendering**: Dark, dramatic background with fog effects
🎛️ **Interactive Controls**: Adjustable lightning sensitivity and playback controls
📱 **Responsive Design**: Works on desktop and mobile browsers

## Technology Stack

- **HTML5 Canvas** - For rendering graphics and animations
- **Web Audio API** - For real-time audio frequency analysis
- **JavaScript ES6+** - Main application logic
- **CSS3** - Styling and effects

## Setup & Running

### Method 1: Local Web Server (Recommended)

Due to browser security restrictions with local files, it's best to run a local web server:

```bash
# If you have Python 3 installed:
python3 -m http.server 8000

# If you have Python 2 installed:
python -m SimpleHTTPServer 8000

# If you have Node.js installed:
npx serve .

# If you have PHP installed:
php -S localhost:8000
```

Then open your browser and navigate to `http://localhost:8000`

### Method 2: Direct File Opening

Some modern browsers allow direct file opening:

1. Open `index.html` directly in your browser
2. If you encounter issues with audio loading, use Method 1 instead

## How to Use

1. **Start the Experience**: Click "Start Experience" to begin audio playback and lightning synchronization
2. **Adjust Sensitivity**: Use the lightning sensitivity slider (50%-200%) to control how reactive the lightning is to music
3. **Playback Controls**: Use Pause/Reset buttons to control the experience
4. **Full Screen**: Press F11 for a more immersive full-screen experience

## Audio Analysis Details

The application analyzes audio in real-time using the Web Audio API:

- **Bass Frequencies** (0-10): Trigger purple lightning bolts and phantom scaling
- **Mid Frequencies** (10-50): Contribute to overall lightning intensity
- **Treble Frequencies** (50-100): Trigger white lightning and phantom opacity changes
- **Overall Volume**: Controls background atmosphere and lightning frequency

## Visual Effects

- **Lightning Branches**: Procedurally generated with random branching patterns
- **Color Coding**: Purple lightning for bass-heavy sections, white for treble-heavy sections
- **Phantom Animation**: Subtle scaling and opacity changes based on audio frequencies
- **Background Glow**: Dynamic atmospheric lighting that pulses with the music
- **Fog Effects**: Subtle mist effects for atmosphere

## File Structure

```
phantom-animation/
├── index.html                     # Main HTML file
├── phantom-animation.js           # Main JavaScript application
├── phantom.png                    # Phantom image (transparent background)
├── Overture (From 'The Phantom Of The Opera' Motion Picture).mp3  # Audio file
└── README.md                      # This file
```

## Browser Compatibility

- ✅ Chrome 66+ (recommended)
- ✅ Firefox 60+
- ✅ Safari 14+
- ✅ Edge 79+

**Note**: Requires browsers with Web Audio API support for audio analysis features.

## Customization

You can easily customize the experience by modifying `phantom-animation.js`:

- **Lightning Colors**: Modify `getLightningColor()` method
- **Lightning Patterns**: Adjust `generateLightningBranches()` for different shapes
- **Audio Sensitivity**: Change `minLightningThreshold` for different trigger points
- **Visual Effects**: Modify rendering methods for different atmospheric effects

## Performance Notes

- The application uses requestAnimationFrame for smooth 60fps animations
- Lightning flashes are limited to 20 simultaneous bolts for performance
- Canvas operations are optimized for real-time rendering

## Troubleshooting

**Audio won't play:**

- Ensure you're running from a web server (not file://)
- Check browser console for error messages
- Verify audio file is accessible

**No lightning effects:**

- Check lightning sensitivity slider
- Verify audio is playing and has volume
- Try adjusting sensitivity to lower values (50-75%)

**Performance issues:**

- Try reducing lightning sensitivity
- Close other browser tabs
- Use Chrome for best performance

## Future Enhancements

- Multiple audio track support
- Recording/export functionality
- Additional visual effects (rain, wind, etc.)
- Customizable phantom positions and animations
- MIDI controller support for live performances

Enjoy your spooky audio-visual journey! 🎭⚡
# phantom-lightning-show
