// Add type declaration at the top of the file
declare global {
  interface HTMLVideoElement {
    captureStream(): MediaStream;
  }
  interface HTMLCanvasElement {
    captureStream(frameRate?: number): MediaStream;
  }
  interface HTMLAudioElement {
    captureStream(): MediaStream;
  }
}

import { TextSettings } from '@/lib/types/meme';

// Add Label interface at the top
interface Label {
  id: string;
  text: string;
  horizontalPosition: number;
  verticalPosition: number;
  size: number;
  font: string;
}

export async function createMemeVideo(
  videoUrl: string,
  caption: string,
  backgroundImage?: string,
  isGreenscreen?: boolean,
  textSettings?: TextSettings,
  labels?: Label[],
  labelSettings?: {
    font: string;
    size: number;
    color: 'white' | 'black';
    strokeWeight: number;
    backgroundColor?: 'black' | 'white' | 'transparent';
    backgroundOpacity?: number;
  },
  isCropped?: boolean
): Promise<Blob> {
  // Create a container to hold and control all media elements
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '-9999px';
  container.style.left = '-9999px';
  document.body.appendChild(container);
  
  try {
    // Step 1: Load all media resources first
    const videoElement = await loadVideo(videoUrl);
    videoElement.muted = true; // Mute the original video element to prevent double audio
    container.appendChild(videoElement);
    
    let backgroundImageElement = null;
    if (isGreenscreen && backgroundImage) {
      backgroundImageElement = await loadImage(backgroundImage);
    }

    // Step 2: Set up canvas with proper dimensions
    const canvas = document.createElement('canvas');
    
    // Standard canvas dimensions
    const standardWidth = 1080;
    const standardHeight = 1920;
    
    // Calculate video dimensions and position
    const videoAspect = videoElement.videoWidth / videoElement.videoHeight;
    const targetWidth = standardWidth;
    const targetHeight = targetWidth / videoAspect;
    const yOffset = (standardHeight - targetHeight) / 2;
    
    // If crop mode is enabled and we're not in greenscreen mode
    if (isCropped && !isGreenscreen) {
      // For height calculation, we need to estimate the text height first
      const fontSize = textSettings?.size || 78;
      const estimatedLineHeight = fontSize * 1.1;
      
      // Assuming worst case of 3 lines of text, calculate estimated text height
      // This is just for initial canvas sizing, exact positioning will be done in render
      const estimatedTextLines = 3;
      const estimatedTextHeight = estimatedTextLines * estimatedLineHeight;
      
      // Calculate canvas height to include:
      // - 30px top padding
      // - Estimated text height
      // - 15px gap between text and video
      // - Video height
      // - 15px bottom padding
      const textTop = 30;
      const estimatedTextBottom = textTop + estimatedTextHeight;
      const estimatedVideoTop = estimatedTextBottom + 15;
      const newHeight = estimatedVideoTop + targetHeight + 15;
      
      // Set initial canvas dimensions for cropped mode - will be refined in renderFrame
      canvas.width = standardWidth;
      canvas.height = newHeight;
    } else {
      // Standard dimensions for non-cropped mode
      canvas.width = standardWidth;
      canvas.height = standardHeight;
    }
    
    const ctx = canvas.getContext('2d')!;
    container.appendChild(canvas);

    // Step 4: Create a rendering function
    const renderFrame = () => {
      // Clear canvas with black background
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw background if in greenscreen mode
      if (isGreenscreen && backgroundImageElement) {
        // For greenscreen mode, we don't apply crop (as per requirements)
        ctx.drawImage(backgroundImageElement, 0, 0, canvas.width, canvas.height);
        
        // Process video frame with greenscreen removal
        const processedFrame = processGreenscreen(videoElement, targetWidth, targetHeight);
        ctx.drawImage(processedFrame, 0, yOffset, targetWidth, targetHeight);
      } else {
        // Regular video drawing
        if (isCropped) {
          // First measure the text height
          const fontSize = textSettings?.size || 78;
          const font = textSettings?.font || 'Impact';
          const lineHeight = fontSize * 1.1; // Line height multiplier
          
          // Set up text for measurement
          ctx.font = `${fontSize}px ${font}`;
          
          // Handle text wrapping to determine actual text height
          const maxWidth = canvas.width - 80;
          const lines = wrapText(ctx, caption, maxWidth);
          const totalTextHeight = lines.length * lineHeight;
          
          // Calculate text position and spacing
          const textTop = 30; // 30px from top of cropped canvas (increased from 20px)
          const textBottom = textTop + totalTextHeight;
          
          // Position video 15px below the text
          const videoTop = textBottom + 15;
          
          // Calculate total height with 15px bottom padding
          const totalHeight = videoTop + targetHeight + 15;
          
          // If the canvas height doesn't match our calculation, resize it
          // This ensures consistency between preview and downloaded video
          if (Math.abs(canvas.height - totalHeight) > 2) { // Allow small rounding differences
            canvas.height = totalHeight;
            // Clear canvas since size changed
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
          
          // Draw the video at the position below the text
          ctx.drawImage(videoElement, 0, videoTop, targetWidth, targetHeight);
        } else {
          // Standard video drawing
          ctx.drawImage(videoElement, 0, yOffset, targetWidth, targetHeight);
        }
      }

      // Draw caption
      if (caption) {
        if (isCropped) {
          // In cropped mode, caption is positioned at fixed 30px from the top
          const fontSize = textSettings?.size || 78;
          const font = textSettings?.font || 'Impact';
          const strokeWeight = textSettings?.strokeWeight || 0.08;
          const color = textSettings?.color || 'white';
          const alignment = textSettings?.alignment || 'center';
          const lineHeight = fontSize * 1.1; // Line height for consistency
          
          // Set caption properties - match preview generator (no "bold")
          ctx.font = `${fontSize}px ${font}`;
          ctx.textBaseline = 'top';
          
          // Set text alignment
          if (alignment === 'left') ctx.textAlign = 'left';
          else if (alignment === 'right') ctx.textAlign = 'right';
          else ctx.textAlign = 'center';
          
          // Calculate position (same calculation as preview generator)
          const x = alignment === 'left' ? 40 : (alignment === 'right' ? canvas.width - 40 : canvas.width / 2);
          const y = 30; // 30px from top in cropped mode
          
          // Handle text wrapping
          const maxWidth = canvas.width - 80;
          const lines = wrapText(ctx, caption, maxWidth);
          
          // Draw each line
          lines.forEach((line, index) => {
            const lineY = y + (index * lineHeight);
            
            // Draw text stroke
            ctx.lineWidth = fontSize * strokeWeight;
            ctx.strokeStyle = color === 'white' ? 'black' : 'white';
            ctx.strokeText(line, x, lineY);
            
            // Draw text fill
            ctx.fillStyle = color;
            ctx.fillText(line, x, lineY);
          });
        } else {
          // Standard caption drawing for non-cropped mode
          drawCaption(ctx, caption, canvas.width, canvas.height, textSettings);
        }
      }
      
      // Draw labels only in non-cropped mode
      if (labels?.length && !isCropped) {
        drawLabels(ctx, labels, canvas.width, canvas.height, labelSettings);
      }
      // Handle labels in cropped mode
      else if (labels?.length && isCropped) {
        // Filter and translate labels for cropped mode
        labels.forEach(label => {
          if (!label.text.trim()) return;
          
          // Calculate original position in full canvas 
          const originalX = (label.horizontalPosition / 100) * standardWidth;
          const originalY = (label.verticalPosition / 100) * standardHeight;
          
          // Only display labels that were originally within the video area
          if (originalY >= yOffset && originalY <= (yOffset + targetHeight)) {
            // Calculate position relative to video
            const relativeY = originalY - yOffset;
            
            // Since we can't access the variables directly, recalculate them
            const cropTextTop = 30; // Same as defined earlier
            
            // Estimate text height based on caption
            const captionFontSize = textSettings?.size || 78;
            const captionLineHeight = captionFontSize * 1.1;
            const captionLines = wrapText(ctx, caption, canvas.width - 80);
            const captionTextHeight = captionLines.length * captionLineHeight;
            
            // Video starts at: top padding + caption height + gap
            const videoY = cropTextTop + captionTextHeight + 15;
            
            // Translate to new position
            const newY = videoY + relativeY;
            
            // Draw label at translated position
            // Use custom font and size for label
            const fontSize = label.size;
            ctx.font = `${fontSize}px ${label.font}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
  
            // Calculate approximate label width
            const metrics = ctx.measureText(label.text);
            const textWidth = metrics.width;
            
            // Get background settings from labelSettings, with defaults
            const bgColor = labelSettings?.backgroundColor || 'black';
            const bgOpacity = labelSettings?.backgroundOpacity !== undefined ? labelSettings.backgroundOpacity : 0.5;
            
            // Draw a background rectangle if not transparent
            if (bgColor !== 'transparent') {
              const padding = 10;
              // Set background color and opacity
              if (bgColor === 'black') {
                ctx.fillStyle = `rgba(0, 0, 0, ${bgOpacity})`;
              } else if (bgColor === 'white') {
                ctx.fillStyle = `rgba(255, 255, 255, ${bgOpacity})`;
              }
              
              ctx.fillRect(
                originalX - textWidth / 2 - padding,
                newY - fontSize / 2 - padding / 2,
                textWidth + padding * 2,
                fontSize + padding
              );
            }
  
            // Set stroke and draw text
            ctx.lineWidth = fontSize * (labelSettings?.strokeWeight || 0.08);
            ctx.strokeStyle = labelSettings?.color === 'black' ? 'white' : 'black';
            ctx.strokeText(label.text, originalX, newY);
            
            // Fill text
            ctx.fillStyle = labelSettings?.color === 'black' ? 'black' : 'white';
            ctx.fillText(label.text, originalX, newY);
          }
        });
      }
    };

    // Step 5: Set up media recorder with proper audio handling
    const canvasStream = canvas.captureStream(30);
    
    // Create a separate audio element to handle audio properly
    const audioElement = document.createElement('audio');
    audioElement.src = videoUrl;
    audioElement.crossOrigin = 'anonymous';
    container.appendChild(audioElement);
    
    // Wait for audio to be ready
    await new Promise<void>((resolve) => {
      audioElement.onloadedmetadata = () => resolve();
      audioElement.onerror = () => resolve(); // Continue even if audio fails
    });
    
    // Get audio stream from the audio element
    let audioStream;
    try {
      audioStream = audioElement.captureStream();
    } catch (e) {
      console.warn('Could not capture audio stream, falling back to video audio');
      // Fallback to video audio if audio element capture fails
      audioStream = videoElement.captureStream();
    }
    
    // Add audio track to canvas stream
    const audioTracks = audioStream.getAudioTracks();
    if (audioTracks.length > 0) {
      canvasStream.addTrack(audioTracks[0]);
    }
    
    // Find supported mime type
    const mimeType = [
      'video/mp4;codecs=h264,aac',
      'video/mp4',
      'video/webm;codecs=vp8,opus',
      'video/webm'
    ].find(type => MediaRecorder.isTypeSupported(type)) || 'video/webm';
    
    // Create media recorder
    const recorder = new MediaRecorder(canvasStream, {
      mimeType,
      videoBitsPerSecond: 8000000,
    });

    // Step 6: Start recording and return promise that resolves with the final video blob
    return new Promise<Blob>((resolve) => {
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        resolve(blob);
      };
      
      // Set up animation frame loop
      let animationFrameId: number;
      const updateCanvas = () => {
        renderFrame();
        animationFrameId = requestAnimationFrame(updateCanvas);
      };
      
      // Get video duration to calculate early stop time
      const videoDuration = videoElement.duration;
      const earlyStopTime = Math.max(0, videoDuration - 0.1); // Stop 0.2s before the end
      
      // Set up a timeupdate listener to stop recording before the video ends
      const handleTimeUpdate = () => {
        if (videoElement.currentTime >= earlyStopTime) {
          // Remove the listener to prevent multiple calls
          videoElement.removeEventListener('timeupdate', handleTimeUpdate);
          
          // Cancel animation frame to stop rendering
          cancelAnimationFrame(animationFrameId);
          
          // Render one final frame to ensure we have a clean frame
          renderFrame();
          
          // Stop the recorder immediately
          recorder.stop();
          
          // Stop all media
          videoElement.pause();
          audioElement.pause();
          
          // Stop all tracks
          canvasStream.getTracks().forEach(track => track.stop());
          if (audioStream) {
            audioStream.getTracks().forEach(track => track.stop());
          }
        }
      };
      
      // Add timeupdate listener to check current time
      videoElement.addEventListener('timeupdate', handleTimeUpdate);
      
      // Start at a specific time to ensure stable frame
      videoElement.currentTime = 0.1;
      audioElement.currentTime = 0.1;
      
      // When video has seeked to the right position
      videoElement.onseeked = () => {
        // Remove event listener to prevent multiple calls
        videoElement.onseeked = null;
        
        // Start recording
        recorder.start(100); // Capture in 100ms chunks for smoother recording
        
        // Start animation frame loop
        animationFrameId = requestAnimationFrame(updateCanvas);
        
        // Play both video and audio in sync
        const playPromises = [
          videoElement.play(),
          audioElement.play()
        ];
        
        // Handle any play errors
        Promise.all(playPromises).catch(error => {
          console.error('Error playing media:', error);
          // Try to continue anyway
        });
      };
    }).finally(() => {
      // Clean up all resources
      if (container && container.parentNode) {
        container.parentNode.removeChild(container);
      }
    });
  } catch (error) {
    // Clean up on error
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    throw error;
  }
}

// Helper function to load video and return a promise
function loadVideo(url: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.preload = 'auto';
    
    video.onloadedmetadata = () => {
      resolve(video);
    };
    
    video.onerror = (e) => {
      reject(new Error('Failed to load video'));
    };
    
    video.src = url;
  });
}

// Helper function to load image and return a promise
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      resolve(img);
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    img.src = url;
  });
}

// Helper function to process greenscreen
function processGreenscreen(video: HTMLVideoElement, width: number, height: number): HTMLCanvasElement {
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d')!;
  tempCanvas.width = width;
  tempCanvas.height = height;
  
  // Draw video frame to temp canvas
  tempCtx.drawImage(video, 0, 0, width, height);
  
  // Get image data for processing
  const imageData = tempCtx.getImageData(0, 0, width, height);
  const pixels = imageData.data;

  // Green screen removal with improved thresholds
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    
    // Improved green screen detection
    if (g > 100 && g > 1.4 * r && g > 1.4 * b) {
      pixels[i + 3] = 0; // Make pixel transparent
    }
  }

  // Put processed frame back
  tempCtx.putImageData(imageData, 0, 0);
  
  return tempCanvas;
}

// Helper function to draw caption
function drawCaption(
  ctx: CanvasRenderingContext2D, 
  caption: string, 
  canvasWidth: number, 
  canvasHeight: number,
  textSettings?: TextSettings
) {
  const fontSize = textSettings ? textSettings.size : Math.floor(canvasWidth * 0.078);
  ctx.font = `${fontSize}px ${textSettings?.font || 'Impact'}`;
  ctx.textAlign = textSettings?.alignment || 'center';
  ctx.textBaseline = 'bottom';
  
  const maxWidth = canvasWidth - 80;
  const lines = wrapText(ctx, caption, maxWidth);
  const lineHeight = fontSize * 1.1;

  // Calculate vertical position
  const textY = canvasHeight * (textSettings?.verticalPosition || 25) / 100;

  // Use same x position calculation as preview generator
  const x = textSettings?.alignment === 'left' 
    ? 40
    : textSettings?.alignment === 'right' 
      ? canvasWidth - 40 
      : canvasWidth / 2;

  // Get text color and stroke weight from settings or use defaults
  const textColor = textSettings?.color || 'white';
  const strokeWeight = textSettings?.strokeWeight !== undefined 
    ? fontSize * textSettings.strokeWeight 
    : fontSize * 0.08;

  // Calculate the total height of all text lines
  const totalTextHeight = (lines.length - 1) * lineHeight;

  // Draw each line of text, positioning the BOTTOM of the LAST line at the specified vertical position
  lines.forEach((line, index) => {
    // Adjust position so the BOTTOM of the LAST line is at the specified vertical position
    const y = textY - (lines.length - 1 - index) * lineHeight;
    
    // Set stroke color to be opposite of text color for better visibility
    ctx.strokeStyle = textColor === 'white' ? '#000000' : '#FFFFFF';
    ctx.lineWidth = strokeWeight;
    ctx.strokeText(line, x, y);
    
    ctx.fillStyle = textColor === 'white' ? '#FFFFFF' : '#000000';
    ctx.fillText(line, x, y);
  });
}

// Helper function to draw labels
function drawLabels(
  ctx: CanvasRenderingContext2D,
  labels: Label[],
  canvasWidth: number,
  canvasHeight: number,
  labelSettings?: {
    font: string;
    size: number;
    color: 'white' | 'black';
    strokeWeight: number;
    backgroundColor?: 'black' | 'white' | 'transparent';
    backgroundOpacity?: number;
  }
) {
  if (!labels || !labels.length) return;

  labels.forEach(label => {
    if (!label.text.trim()) return;

    const x = canvasWidth * (label.horizontalPosition / 100);
    const y = canvasHeight * (label.verticalPosition / 100);
    
    // Use label's font and size - remove "bold" to match preview generator
    ctx.font = `${label.size}px ${label.font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Get text color and stroke weight from global settings
    const textColor = labelSettings?.color || 'white';
    const strokeWeight = labelSettings?.strokeWeight !== undefined 
      ? label.size * labelSettings.strokeWeight 
      : label.size * 0.08;
      
    // Get background settings from labelSettings, with defaults
    const bgColor = labelSettings?.backgroundColor || 'black';
    const bgOpacity = labelSettings?.backgroundOpacity !== undefined ? labelSettings.backgroundOpacity : 0.5;
    
    // Calculate approximate label width
    const metrics = ctx.measureText(label.text);
    const textWidth = metrics.width;
    
    // Draw a background rectangle if not transparent
    if (bgColor !== 'transparent') {
      const padding = 10;
      // Set background color and opacity
      if (bgColor === 'black') {
        ctx.fillStyle = `rgba(0, 0, 0, ${bgOpacity})`;
      } else if (bgColor === 'white') {
        ctx.fillStyle = `rgba(255, 255, 255, ${bgOpacity})`;
      }
      
      ctx.fillRect(
        x - textWidth / 2 - padding,
        y - label.size / 2 - padding / 2,
        textWidth + padding * 2,
        label.size + padding
      );
    }

    // Set stroke color to be opposite of text color for better visibility
    ctx.strokeStyle = textColor === 'white' ? '#000000' : '#FFFFFF';
    ctx.lineWidth = strokeWeight;
    ctx.strokeText(label.text, x, y);
    
    ctx.fillStyle = textColor === 'white' ? '#FFFFFF' : '#000000';
    ctx.fillText(label.text, x, y);
  });
}

// Helper function to wrap text
function wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  // Split text into lines based on user's line breaks first
  const userLines = text.split('\n');
  const lines: string[] = [];

  // Then handle word wrapping within each line
  userLines.forEach(userLine => {
    if (userLine.trim() === '') {
      // Preserve empty lines
      lines.push('');
      return;
    }

    const words = userLine.split(' ');
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = context.measureText(currentLine + " " + word).width;
      if (width < maxWidth) {
        currentLine += " " + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
  });

  return lines;
}
