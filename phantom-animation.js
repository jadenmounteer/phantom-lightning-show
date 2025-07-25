class PhantomLightningShow {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");

    // Initialize logical dimensions for Safari compatibility
    this.logicalWidth = 1200;
    this.logicalHeight = 800;

    this.setupResponsiveCanvas();
    this.audio = document.getElementById("phantomAudio");

    // Audio analysis setup
    this.audioContext = null;
    this.analyser = null;
    this.dataArray = null;
    this.source = null;

    // Assets
    this.phantomImage = new Image();
    this.imageLoaded = false;

    // Animation properties
    this.animationId = null;
    this.isPlaying = false;
    this.lightningFlashes = [];
    this.backgroundLightning = 0;
    this.phantomScale = 1;
    this.smoothedIllumination = 0; // Smoothed lighting for phantom - starts in complete darkness

    // Settings
    this.lightningsensitivity = 100;
    this.minLightningThreshold = 100;

    // Audio processing for better instrument detection
    this.audioHistory = {
      bass: [],
      mid: [],
      treble: [],
      overall: [],
    };
    this.historyLength = 10; // Frames to remember for peak detection

    // UI elements
    this.loadingEl = document.getElementById("loading");
    this.startBtn = document.getElementById("startBtn");
    this.pauseBtn = document.getElementById("pauseBtn");
    this.resetBtn = document.getElementById("resetBtn");
    this.audioStatusEl = document.getElementById("audioStatus");
    this.sensitivitySlider = document.getElementById("sensitivitySlider");
    this.sensitivityValueEl = document.getElementById("sensitivityValue");

    this.init();
  }

  async init() {
    await this.loadAssets();
    this.setupEventListeners();
    this.setupAudioAnalysis();
    this.render();
    this.hideLoading();
  }

  setupResponsiveCanvas() {
    const resizeCanvas = () => {
      const container = this.canvas.parentElement;
      const containerWidth = container.clientWidth - 4; // Account for border
      const aspectRatio = 3 / 2; // 1200:800 ratio
      const canvasHeight = containerWidth / aspectRatio;

      // Use device pixel ratio for crisp rendering on high-DPI displays (Safari mobile fix)
      const devicePixelRatio = window.devicePixelRatio || 1;

      // Set actual canvas resolution (multiply by device pixel ratio for crisp rendering)
      this.canvas.width = containerWidth * devicePixelRatio;
      this.canvas.height = canvasHeight * devicePixelRatio;

      // Set canvas display size (CSS pixels)
      this.canvas.style.width = containerWidth + "px";
      this.canvas.style.height = canvasHeight + "px";

      // Scale the context to match device pixel ratio
      this.ctx.scale(devicePixelRatio, devicePixelRatio);

      // Store logical dimensions for calculations
      this.logicalWidth = containerWidth;
      this.logicalHeight = canvasHeight;

      // Re-render if needed
      if (this.imageLoaded) {
        this.render();
      }
    };

    // Initial setup
    resizeCanvas();

    // Handle window resize with debouncing
    let resizeTimeout;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(resizeCanvas, 100);
    });

    // Store resize function for cleanup if needed
    this.resizeCanvas = resizeCanvas;
  }

  async loadAssets() {
    return new Promise((resolve) => {
      this.phantomImage.onload = () => {
        this.imageLoaded = true;
        console.log("Phantom image loaded");
        resolve();
      };
      this.phantomImage.src = "phantom.png";
    });
  }

  setupEventListeners() {
    this.startBtn.addEventListener("click", () => this.startExperience());
    this.pauseBtn.addEventListener("click", () => this.pauseExperience());
    this.resetBtn.addEventListener("click", () => this.resetExperience());

    this.sensitivitySlider.addEventListener("input", (e) => {
      this.lightningsensitivity = parseInt(e.target.value);
      this.sensitivityValueEl.textContent = this.lightningsensitivity + "%";
    });

    this.audio.addEventListener("ended", () => {
      this.resetExperience();
    });
  }

  async setupAudioAnalysis() {
    try {
      this.audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;

      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);

      this.source = this.audioContext.createMediaElementSource(this.audio);
      this.source.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);

      console.log("Audio analysis setup complete");
    } catch (error) {
      console.error("Error setting up audio analysis:", error);
    }
  }

  async startExperience() {
    if (this.audioContext && this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }

    try {
      await this.audio.play();
      this.isPlaying = true;
      this.startBtn.disabled = true;
      this.pauseBtn.disabled = false;
      this.audioStatusEl.textContent = "Playing";

      this.animate();
    } catch (error) {
      console.error("Error starting audio:", error);
      alert(
        "Error playing audio. Please check if the file exists and is accessible."
      );
    }
  }

  pauseExperience() {
    if (this.isPlaying) {
      this.audio.pause();
      this.isPlaying = false;
      this.startBtn.disabled = false;
      this.pauseBtn.disabled = true;
      this.audioStatusEl.textContent = "Paused";

      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
      }
    } else {
      this.startExperience();
    }
  }

  resetExperience() {
    this.audio.pause();
    this.audio.currentTime = 0;
    this.isPlaying = false;
    this.startBtn.disabled = false;
    this.pauseBtn.disabled = true;
    this.audioStatusEl.textContent = "Stopped";

    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    this.lightningFlashes = [];
    this.backgroundLightning = 0;
    this.phantomScale = 1;
    this.smoothedIllumination = 0; // Reset to complete darkness

    // Clear audio history
    this.audioHistory = {
      bass: [],
      mid: [],
      treble: [],
      overall: [],
    };

    this.render();
  }

  animate() {
    if (!this.isPlaying) return;

    this.analyzeAudio();
    this.updateEffects();
    this.render();

    this.animationId = requestAnimationFrame(() => this.animate());
  }

  analyzeAudio() {
    if (!this.analyser || !this.dataArray) return;

    this.analyser.getByteFrequencyData(this.dataArray);

    // Improved frequency separation for better instrument detection
    const bassRange = this.dataArray.slice(0, 8); // 0-688Hz (kick drums, bass)
    const lowMidRange = this.dataArray.slice(8, 20); // 688-1719Hz (bass guitar, low brass)
    const midRange = this.dataArray.slice(20, 40); // 1719-3438Hz (horns, vocals, guitars)
    const highMidRange = this.dataArray.slice(40, 70); // 3438-6016Hz (trumpets, high brass, piano)
    const trebleRange = this.dataArray.slice(70, 100); // 6016-8594Hz (high piano, strings, cymbals)
    const airRange = this.dataArray.slice(100, 128); // 8594Hz+ (harmonics, air)

    // Calculate weighted averages with lower noise gating for better sensitivity
    const noiseFloor = 8; // Lower noise floor for more sensitivity to horns and keyboard
    const bassAvg = this.calculateCleanAverage(bassRange, noiseFloor);
    const lowMidAvg = this.calculateCleanAverage(lowMidRange, noiseFloor);
    const midAvg = this.calculateCleanAverage(midRange, noiseFloor);
    const highMidAvg = this.calculateCleanAverage(highMidRange, noiseFloor);
    const trebleAvg = this.calculateCleanAverage(trebleRange, noiseFloor);
    const airAvg = this.calculateCleanAverage(airRange, noiseFloor);

    // Better combinations that emphasize horns and keyboard
    const combinedBass = (bassAvg * 2 + lowMidAvg) / 3; // Drums and bass
    const combinedMid = (midAvg * 3 + highMidAvg * 2) / 5; // Horns and brass (more sensitive)
    const combinedTreble = (highMidAvg + trebleAvg * 3 + airAvg) / 5; // High piano and strings (more sensitive)

    const averageVolume = (combinedBass + combinedMid + combinedTreble) / 3;

    // Store in history for peak detection
    this.updateAudioHistory(
      combinedBass,
      combinedMid,
      combinedTreble,
      averageVolume
    );

    // Detect actual musical peaks (not just high volume)
    const bassIncrease = this.detectPeakIncrease("bass", combinedBass);
    const midIncrease = this.detectPeakIncrease("mid", combinedMid);
    const trebleIncrease = this.detectPeakIncrease("treble", combinedTreble);
    const overallIncrease = this.detectPeakIncrease("overall", averageVolume);

    // More balanced threshold that doesn't get stuck high
    const recentAverage = this.getRecentAverage("overall");
    const baseThreshold =
      (this.minLightningThreshold * this.lightningsensitivity) / 100;

    // Cap the dynamic threshold so it doesn't become unreachable
    const dynamicThreshold = Math.min(
      Math.max(recentAverage * 1.15, baseThreshold), // Only 15% above recent average
      baseThreshold * 2 // Never more than 2x the base threshold
    );

    // Highly sensitive peak detection specifically tuned for horns and keyboard
    const isMusicalPeak =
      (bassIncrease > 8 && combinedBass > 25) || // Bass drum hits
      (midIncrease > 4 && combinedMid > 15) || // Horn sections and brass - very sensitive!
      (trebleIncrease > 5 && combinedTreble > 12) || // High piano and strings - very sensitive!
      (overallIncrease > 6 && averageVolume > 25) || // General musical peaks - more sensitive
      // Special detection for subtle instrument entries
      (midIncrease > 2 && combinedMid > 20) || // Gentle horn entries
      (trebleIncrease > 3 && combinedTreble > 18) || // Gentle keyboard entries
      // Fallback - any decent volume with small increases
      (averageVolume > 30 &&
        (bassIncrease > 3 || midIncrease > 2 || trebleIncrease > 3));

    if (isMusicalPeak) {
      this.triggerLightning(
        averageVolume,
        combinedBass,
        combinedMid,
        combinedTreble
      );
    }

    // Update background lighting based on overall volume (more subtle)
    this.backgroundLightning = Math.min(averageVolume / 400, 0.6);

    // Keep phantom scale stable to prevent jumping/movement
    // Removed dynamic scaling to maintain solid, unchanging presence
    this.phantomScale = 1; // Fixed scale - no movement
  }

  calculateCleanAverage(frequencyArray, noiseFloor) {
    // Apply noise gating and calculate weighted average
    const cleanedValues = frequencyArray.map((val) =>
      val > noiseFloor ? val - noiseFloor : 0
    );
    const sum = cleanedValues.reduce((a, b) => a + b, 0);
    return sum / frequencyArray.length;
  }

  updateAudioHistory(bass, mid, treble, overall) {
    // Add to history
    this.audioHistory.bass.push(bass);
    this.audioHistory.mid.push(mid);
    this.audioHistory.treble.push(treble);
    this.audioHistory.overall.push(overall);

    // Keep only recent history
    Object.keys(this.audioHistory).forEach((key) => {
      if (this.audioHistory[key].length > this.historyLength) {
        this.audioHistory[key].shift();
      }
    });
  }

  detectPeakIncrease(frequencyType, currentValue) {
    const history = this.audioHistory[frequencyType];
    if (history.length < 3) return 0;

    // Use a shorter window for more responsive peak detection
    const recentWindow = history.slice(-3);
    const recentAverage =
      recentWindow.reduce((a, b) => a + b, 0) / recentWindow.length;

    // Also compare to the previous frame for immediate responsiveness
    const previousValue = history[history.length - 1] || 0;
    const immediateIncrease = currentValue - previousValue;

    // Use the larger of the two increases for better detection
    const gradualIncrease = currentValue - recentAverage;
    return Math.max(immediateIncrease, gradualIncrease);
  }

  getRecentAverage(frequencyType) {
    const history = this.audioHistory[frequencyType];
    if (history.length === 0) return 50;

    // Use weighted average that favors more recent values
    const recent = history.slice(-8);
    let weightedSum = 0;
    let totalWeight = 0;

    recent.forEach((value, index) => {
      const weight = index + 1; // More recent values get higher weight
      weightedSum += value * weight;
      totalWeight += weight;
    });

    return weightedSum / totalWeight;
  }

  triggerLightning(volume, bass, mid, treble) {
    const total = bass + mid + treble;
    const bassRatio = bass / total;
    const midRatio = mid / total;
    const trebleRatio = treble / total;

    // Determine number of bolts based on intensity and frequency content
    const baseBolts = Math.ceil((bass / 255) * 2);
    const midBolts = Math.ceil((mid / 255) * 1.5);
    const trebleBolts = Math.ceil((treble / 255) * 2);
    const numBolts = Math.min(baseBolts + midBolts + trebleBolts, 8); // Cap at 8 bolts

    for (let i = 0; i < numBolts; i++) {
      // Position lightning based on dominant frequency using logical dimensions
      const canvasWidth = this.logicalWidth || this.canvas.width;
      const canvasHeight = this.logicalHeight || this.canvas.height;
      let yPosition, intensity, duration;

      if (bassRatio > 0.5) {
        // Bass lightning - lower on screen, thicker, longer lasting
        yPosition = canvasHeight * 0.4 + Math.random() * canvasHeight * 0.3;
        intensity = (volume + bass) / 400;
        duration = 20 + Math.random() * 15; // Longer lasting
      } else if (trebleRatio > 0.4) {
        // Treble lightning - higher on screen, thinner, faster
        yPosition = Math.random() * canvasHeight * 0.4;
        intensity = (volume + treble) / 350;
        duration = 8 + Math.random() * 8; // Faster
      } else {
        // Mid lightning - middle area, medium properties
        yPosition = canvasHeight * 0.2 + Math.random() * canvasHeight * 0.4;
        intensity = (volume + mid) / 380;
        duration = 15 + Math.random() * 10; // Medium
      }

      this.lightningFlashes.push({
        x: Math.random() * canvasWidth,
        y: yPosition,
        intensity: Math.min(intensity, 1),
        age: 0,
        maxAge: duration,
        branches: this.generateLightningBranches(bassRatio, trebleRatio),
        color: this.getLightningColor(bass, mid, treble),
        frequencyType:
          bassRatio > 0.5 ? "bass" : trebleRatio > 0.4 ? "treble" : "mid",
      });
    }

    // Limit the number of lightning flashes
    if (this.lightningFlashes.length > 25) {
      this.lightningFlashes = this.lightningFlashes.slice(-25);
    }
  }

  generateLightningBranches(bassRatio = 0.33, trebleRatio = 0.33) {
    const branches = [];

    // Adjust branch characteristics based on frequency
    let numBranches, segmentLength, spread, verticalStep;

    if (bassRatio > 0.5) {
      // Bass lightning - fewer, thicker, more vertical branches
      numBranches = 2 + Math.floor(Math.random() * 3);
      segmentLength = 12 + Math.floor(Math.random() * 8);
      spread = 60; // Wider spread
      verticalStep = 35; // Larger vertical steps
    } else if (trebleRatio > 0.4) {
      // Treble lightning - many thin, jagged branches
      numBranches = 4 + Math.floor(Math.random() * 6);
      segmentLength = 6 + Math.floor(Math.random() * 8);
      spread = 25; // Narrower spread
      verticalStep = 15; // Smaller vertical steps
    } else {
      // Mid lightning - balanced characteristics
      numBranches = 3 + Math.floor(Math.random() * 4);
      segmentLength = 8 + Math.floor(Math.random() * 10);
      spread = 40;
      verticalStep = 25;
    }

    for (let i = 0; i < numBranches; i++) {
      const branch = [];
      let x = 0;
      let y = 0;

      for (let j = 0; j < segmentLength; j++) {
        branch.push({ x, y });
        x += (Math.random() - 0.5) * spread;
        y += Math.random() * verticalStep + 10;
      }
      branches.push(branch);
    }

    return branches;
  }

  getLightningColor(bass, mid, treble) {
    const total = bass + mid + treble;
    const bassRatio = bass / total;
    const midRatio = mid / total;
    const trebleRatio = treble / total;

    // Determine dominant frequency range
    if (bassRatio > 0.5) {
      // Bass dominant - deep, dark colors (drums, low instruments)
      const colors = [
        `rgba(75, 0, 130, ${0.8 + Math.random() * 0.2})`, // Deep purple
        `rgba(139, 0, 0, ${0.8 + Math.random() * 0.2})`, // Dark red
        `rgba(25, 25, 112, ${0.8 + Math.random() * 0.2})`, // Midnight blue
        `rgba(72, 61, 139, ${0.8 + Math.random() * 0.2})`, // Dark slate blue
      ];
      return colors[Math.floor(Math.random() * colors.length)];
    } else if (trebleRatio > 0.4) {
      // Treble dominant - bright, electric colors (cymbals, high notes)
      const colors = [
        `rgba(255, 255, 255, ${0.9 + Math.random() * 0.1})`, // Bright white
        `rgba(135, 206, 250, ${0.8 + Math.random() * 0.2})`, // Light sky blue
        `rgba(0, 255, 255, ${0.8 + Math.random() * 0.2})`, // Electric cyan
        `rgba(173, 216, 230, ${0.8 + Math.random() * 0.2})`, // Light blue
      ];
      return colors[Math.floor(Math.random() * colors.length)];
    } else {
      // Mid dominant - medium colors (vocals, guitars, strings)
      const colors = [
        `rgba(138, 43, 226, ${0.8 + Math.random() * 0.2})`, // Blue violet
        `rgba(147, 0, 211, ${0.8 + Math.random() * 0.2})`, // Dark violet
        `rgba(123, 104, 238, ${0.8 + Math.random() * 0.2})`, // Medium slate blue
        `rgba(106, 90, 205, ${0.8 + Math.random() * 0.2})`, // Slate blue
      ];
      return colors[Math.floor(Math.random() * colors.length)];
    }
  }

  updateEffects() {
    // Update lightning flashes
    this.lightningFlashes = this.lightningFlashes.filter((flash) => {
      flash.age++;
      return flash.age < flash.maxAge;
    });

    // Gradually reduce background lightning
    this.backgroundLightning *= 0.95;
  }

  render() {
    // Clear canvas
    this.ctx.fillStyle = "#000";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Apply background lightning glow
    if (this.backgroundLightning > 0.05) {
      const gradient = this.ctx.createRadialGradient(
        this.canvas.width / 2,
        this.canvas.height / 2,
        0,
        this.canvas.width / 2,
        this.canvas.height / 2,
        this.canvas.width / 2
      );
      gradient.addColorStop(
        0,
        `rgba(75, 0, 130, ${this.backgroundLightning * 0.3})`
      );
      gradient.addColorStop(
        0.7,
        `rgba(25, 25, 112, ${this.backgroundLightning * 0.15})`
      );
      gradient.addColorStop(1, "transparent");

      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // Draw lightning flashes
    this.drawLightning();

    // Draw phantom image
    this.drawPhantom();

    // Add atmospheric effects
    this.drawAtmosphere();
  }

  drawLightning() {
    // Account for device pixel ratio to prevent blurry lightning on mobile
    const devicePixelRatio = window.devicePixelRatio || 1;
    const scale = 1 / devicePixelRatio; // Compensate for canvas scaling

    this.lightningFlashes.forEach((flash) => {
      const alpha = 1 - flash.age / flash.maxAge;

      flash.branches.forEach((branch) => {
        this.ctx.save();
        this.ctx.translate(flash.x, flash.y);
        this.ctx.globalAlpha = alpha * flash.intensity;

        // Adjust visual properties based on frequency type with DPR compensation
        let lineWidth, glowWidth, shadowBlur;

        switch (flash.frequencyType) {
          case "bass":
            // Bass lightning - thick, bold strokes with heavy glow
            lineWidth = (3 + flash.intensity * 5) * scale;
            glowWidth = (10 + flash.intensity * 12) * scale;
            shadowBlur = 25 * scale;
            break;
          case "treble":
            // Treble lightning - thin, sharp strokes with bright glow
            lineWidth = (1 + flash.intensity * 2) * scale;
            glowWidth = (4 + flash.intensity * 6) * scale;
            shadowBlur = 10 * scale;
            break;
          default: // mid
            // Mid lightning - medium properties
            lineWidth = (2 + flash.intensity * 3) * scale;
            glowWidth = (6 + flash.intensity * 8) * scale;
            shadowBlur = 15 * scale;
            break;
        }

        // Draw main lightning bolt
        this.ctx.strokeStyle = flash.color;
        this.ctx.lineWidth = lineWidth;
        this.ctx.lineCap = "round";
        this.ctx.shadowBlur = shadowBlur;
        this.ctx.shadowColor = flash.color;

        this.ctx.beginPath();
        if (branch.length > 0) {
          this.ctx.moveTo(branch[0].x, branch[0].y);
          for (let i = 1; i < branch.length; i++) {
            this.ctx.lineTo(branch[i].x, branch[i].y);
          }
        }
        this.ctx.stroke();

        // Draw lightning glow (more intense for bass, subtle for treble)
        this.ctx.lineWidth = glowWidth;
        this.ctx.globalAlpha =
          alpha *
          flash.intensity *
          (flash.frequencyType === "bass" ? 0.4 : 0.3);
        this.ctx.stroke();

        this.ctx.restore();
      });
    });
  }

  drawPhantom() {
    if (!this.imageLoaded) return;

    this.ctx.save();

    // Calculate phantom position and size - true portrait that fills the frame
    // Use logical dimensions for proper scaling across devices
    const canvasWidth = this.logicalWidth || this.canvas.width;
    const canvasHeight = this.logicalHeight || this.canvas.height;

    // Use full canvas height for dramatic portrait effect
    const portraitHeight = canvasHeight * 0.95; // 95% of canvas height for full portrait
    const phantomHeight = portraitHeight * this.phantomScale;
    const phantomWidth =
      (this.phantomImage.width / this.phantomImage.height) * phantomHeight;

    // If width would be too wide for the canvas, scale down proportionally
    const maxWidth = canvasWidth * 0.95; // Max 95% of canvas width
    let finalWidth = phantomWidth;
    let finalHeight = phantomHeight;

    if (phantomWidth > maxWidth) {
      const scale = maxWidth / phantomWidth;
      finalWidth = maxWidth;
      finalHeight = phantomHeight * scale;
    }

    const phantomX = (canvasWidth - finalWidth) / 2;
    // Position like a traditional portrait - completely bottom aligned
    const phantomY = canvasHeight - finalHeight; // No bottom margin - fills frame completely
    const phantomCenterX = phantomX + finalWidth / 2;
    const phantomCenterY = phantomY + finalHeight / 2;

    // Calculate lightning-based illumination
    let maxIllumination = 0;
    let lightningTint = { r: 255, g: 255, b: 255 }; // Default white

    this.lightningFlashes.forEach((flash) => {
      if (flash.age < flash.maxAge) {
        // Calculate distance from lightning to phantom center
        const distance = Math.sqrt(
          Math.pow(flash.x - phantomCenterX, 2) +
            Math.pow(flash.y - phantomCenterY, 2)
        );

        // Maximum illumination distance
        const maxDistance = 400;
        const flashAlpha = 1 - flash.age / flash.maxAge;

        if (distance < maxDistance) {
          // Calculate illumination based on distance and flash intensity
          const proximityFactor = 1 - distance / maxDistance;
          const illumination = proximityFactor * flash.intensity * flashAlpha;

          if (illumination > maxIllumination) {
            maxIllumination = illumination;

            // Extract RGB from lightning color for tinting
            const colorMatch = flash.color.match(
              /rgba?\((\d+),\s*(\d+),\s*(\d+)/
            );
            if (colorMatch) {
              lightningTint = {
                r: parseInt(colorMatch[1]),
                g: parseInt(colorMatch[2]),
                b: parseInt(colorMatch[3]),
              };
            }
          }
        }
      }
    });

    // Complete darkness to light - phantom fully disappears without lightning
    const targetIllumination = Math.min(maxIllumination, 1); // No base brightness - complete darkness possible
    const smoothingFactor = 0.04; // Much slower transitions to reduce flashiness
    this.smoothedIllumination +=
      (targetIllumination - this.smoothedIllumination) * smoothingFactor;

    // Calculate brightness level using smoothed values
    const finalBrightness = this.smoothedIllumination;

    // Apply brightness filter - allow complete darkness for dramatic effect
    const brightnessPercent = Math.max(finalBrightness * 100, 0); // Allow complete darkness
    const contrastPercent = Math.min(100 + this.smoothedIllumination * 80, 180); // Add contrast when illuminated

    // Safari-compatible solid phantom with darkness overlay
    // Add dramatic glow only when there's actual lightning nearby AND active flashes
    // Use glow without offset to prevent jumping
    if (maxIllumination > 0.2 && this.lightningFlashes.length > 0) {
      this.ctx.shadowColor = `rgba(${lightningTint.r}, ${lightningTint.g}, ${
        lightningTint.b
      }, ${maxIllumination * 0.7})`;
      this.ctx.shadowBlur = 25 * maxIllumination;
      this.ctx.shadowOffsetX = 0; // No offset to prevent jumping
      this.ctx.shadowOffsetY = 0; // No offset to prevent jumping
    } else {
      // No shadow when no lightning
      this.ctx.shadowColor = "transparent";
      this.ctx.shadowBlur = 0;
      this.ctx.shadowOffsetX = 0;
      this.ctx.shadowOffsetY = 0;
    }

    // Safari-compatible approach using temporary canvas to preserve transparency
    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d");
    tempCanvas.width = finalWidth;
    tempCanvas.height = finalHeight;

    // Draw phantom to temp canvas
    tempCtx.drawImage(
      this.phantomImage,
      0,
      0,
      this.phantomImage.width,
      this.phantomImage.height,
      0,
      0,
      finalWidth,
      finalHeight
    );

    // Apply darkness only to existing pixels (preserves transparency)
    if (finalBrightness < 1) {
      tempCtx.globalCompositeOperation = "source-atop"; // Only affects existing pixels
      const darknessLevel = 1 - finalBrightness;
      tempCtx.fillStyle = `rgba(0, 0, 0, ${darknessLevel})`;
      tempCtx.fillRect(0, 0, finalWidth, finalHeight);
    }

    // Draw the processed phantom to main canvas
    this.ctx.globalAlpha = 1;
    this.ctx.drawImage(tempCanvas, phantomX, phantomY);

    this.ctx.restore();
  }

  drawAtmosphere() {
    // Add some subtle fog/mist effect
    const gradient = this.ctx.createLinearGradient(
      0,
      this.canvas.height,
      0,
      this.canvas.height - 200
    );
    gradient.addColorStop(0, "rgba(70, 70, 70, 0.1)");
    gradient.addColorStop(1, "transparent");

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  hideLoading() {
    this.loadingEl.style.display = "none";
  }
}

// Initialize the application when the page loads
document.addEventListener("DOMContentLoaded", () => {
  new PhantomLightningShow();
});
