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

export async function createMemePreview(
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
    backgroundColor?: string;
    backgroundOpacity?: number;
  },
  isCropped?: boolean
): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const backgroundImg = new Image();
    let isBackgroundLoaded = false;
    
    if (isGreenscreen && backgroundImage) {
      backgroundImg.crossOrigin = 'anonymous';
      backgroundImg.onload = () => {
        isBackgroundLoaded = true;
        if (video.readyState >= 2) {
          processFrame();
        }
      };
      backgroundImg.src = backgroundImage;
    }

    video.src = videoUrl;
    video.crossOrigin = 'anonymous';

    const processFrame = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      let canvasWidth = 1080;
      let canvasHeight = 1920;
      
      // Set up initial variables for video dimensions
      const videoAspect = video.videoWidth / video.videoHeight;
      const targetWidth = canvasWidth;
      const targetHeight = targetWidth / videoAspect;
      const yOffset = (canvasHeight - targetHeight) / 2;

      // If cropped mode is enabled (and not in greenscreen mode), adjust the canvas
      if (isCropped && !isGreenscreen) {
        // Calculate the position of the text above the video (15px above video top)
        const textPositionY = yOffset - 15;
        
        // Calculate font size and get ready to measure text dimensions
        const fontSize = textSettings?.size || 78;
        const font = textSettings?.font || 'Impact';
        const lineHeight = fontSize * 1.1; // Line height multiplier
        
        // Set up text for measurement
        ctx.font = `${fontSize}px ${font}`;
        
        // Handle text wrapping to determine actual text height
        const maxWidth = canvasWidth - 80;
        const lines = wrapText(ctx, caption, maxWidth);
        const totalTextHeight = lines.length * lineHeight;
        
        // We want to create a cropped canvas that:
        // 1. Has 20px padding above the text
        // 2. Has the full text height (now properly calculated)
        // 3. Has 15px padding between text and video
        // 4. Has the full video height
        // 5. Has 15px padding below the video
        
        // Calculate top crop line (we crop everything above this point)
        const topCrop = textPositionY - 20;
        
        // Calculate bottom of video
        const videoBottom = yOffset + targetHeight;
        
        // Calculate text bottom - where the text ends
        const textTop = 30; // 30px from top of cropped canvas (increased from 20px)
        const textBottom = textTop + totalTextHeight;
        
        // Position video 15px below the text
        const videoTop = textBottom + 15;
        
        // Calculate the new canvas height to include:
        // - 30px top padding (increased from 20px)
        // - Text height
        // - 15px gap between text and video
        // - Video height
        // - 15px bottom padding
        const newHeight = 30 + totalTextHeight + 15 + targetHeight + 15;
        
        // Make sure the canvas dimensions match our calculations exactly
        canvas.width = canvasWidth;
        canvas.height = newHeight;
        
        // Clear canvas with black background
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw video at the calculated position
        ctx.drawImage(video, 0, videoTop, targetWidth, targetHeight);
        
        // Draw caption above video
        if (caption) {
          // Set the caption drawing properties
          ctx.textAlign = 'center' as CanvasTextAlign;
          ctx.textBaseline = 'top';
          
          // Use defaults if no textSettings provided
          const color = textSettings?.color || 'white';
          const strokeWeight = textSettings?.strokeWeight || 0.08;
          
          // Configure text alignment
          const alignment = textSettings?.alignment || 'center';
          if (alignment === 'left') ctx.textAlign = 'left';
          else if (alignment === 'right') ctx.textAlign = 'right';
          else ctx.textAlign = 'center';
          
          // Calculate x position based on alignment
          const x = alignment === 'left' ? 40 : (alignment === 'right' ? canvas.width - 40 : canvas.width / 2);
          
          // Fixed position 20px from top of cropped canvas
          const y = textTop;
          
          // Configure text style
          ctx.font = `${fontSize}px ${font}`;
          
          // Draw each line of text with stroke and fill
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
        }
      } else {
        // Non-cropped mode - original canvas dimensions
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        // Clear canvas
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (isGreenscreen && isBackgroundLoaded) {
          // First draw the background
          ctx.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height);
          
          // Create a temporary canvas for the video frame
          const tempCanvas = document.createElement('canvas');
          const tempCtx = tempCanvas.getContext('2d')!;
          tempCanvas.width = targetWidth;
          tempCanvas.height = targetHeight;
          
          // Draw video frame to temp canvas
          tempCtx.drawImage(video, 0, 0, targetWidth, targetHeight);
          
          // Get image data for processing
          const imageData = tempCtx.getImageData(0, 0, targetWidth, targetHeight);
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
          
          // Draw processed frame onto main canvas
          ctx.drawImage(tempCanvas, 0, yOffset, targetWidth, targetHeight);
        } else {
          // Regular video drawing
          ctx.drawImage(video, 0, yOffset, targetWidth, targetHeight);
        }
        
        // Draw caption
        if (caption) {
          // Set the caption drawing properties
          ctx.textAlign = 'center' as CanvasTextAlign; // Default to center
          ctx.textBaseline = 'bottom';
          
          // Use defaults if no textSettings provided
          const font = textSettings?.font || 'Impact';
          const size = textSettings?.size || 78;
          const color = textSettings?.color || 'white';
          const strokeWeight = textSettings?.strokeWeight || 0.08;
          const verticalPosition = textSettings?.verticalPosition || 25;
          
          // Configure text alignment
          const alignment = textSettings?.alignment || 'center';
          if (alignment === 'left') ctx.textAlign = 'left';
          else if (alignment === 'right') ctx.textAlign = 'right';
          else ctx.textAlign = 'center';
          
          // Calculate x position based on alignment
          const x = alignment === 'left' ? 40 : (alignment === 'right' ? canvas.width - 40 : canvas.width / 2);
          
          // Calculate y position based on percentage of canvas height
          // This ensures the BOTTOM of the text is at the specified vertical position
          const y = (verticalPosition / 100) * canvas.height;
          
          // Configure text style
          ctx.font = `${size}px ${font}`;
          
          // Handle text wrapping
          const maxWidth = canvas.width - 80;
          const lines = wrapText(ctx, caption, maxWidth);
          
          // Calculate the total height of all text lines to properly position multi-line text
          const lineHeight = size * 1.1;
          const totalTextHeight = (lines.length - 1) * lineHeight;
          
          // Draw each line of text with stroke and fill
          // Adjust position so the BOTTOM of the LAST line is at the specified vertical position
          lines.forEach((line, index) => {
            const lineY = y - (lines.length - 1 - index) * lineHeight;
            
            // Draw text stroke
            ctx.lineWidth = size * strokeWeight;
            ctx.strokeStyle = color === 'white' ? 'black' : 'white';
            ctx.strokeText(line, x, lineY);
            
            // Draw text fill
            ctx.fillStyle = color;
            ctx.fillText(line, x, lineY);
          });
        }
      }
      
      // Draw custom labels if provided (and not in cropped mode)
      if (labels?.length && !isCropped) {
        labels.forEach(label => {
          if (!label.text.trim()) return;

          // Use custom font and size for label, or fall back to defaults
          const fontSize = label.size;
          ctx.font = `${fontSize}px ${label.font}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          // Calculate pixel coordinates based on percentage position
          const x = (label.horizontalPosition / 100) * canvas.width;
          const y = (label.verticalPosition / 100) * canvas.height;

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
              x - textWidth / 2 - padding,
              y - fontSize / 2 - padding / 2,
              textWidth + padding * 2,
              fontSize + padding
            );
          }

          // Set stroke and draw text
          ctx.lineWidth = fontSize * (labelSettings?.strokeWeight || 0.08);
          ctx.strokeStyle = labelSettings?.color === 'black' ? 'white' : 'black';
          ctx.strokeText(label.text, x, y);
          
          // Fill text
          ctx.fillStyle = labelSettings?.color === 'black' ? 'black' : 'white';
          ctx.fillText(label.text, x, y);
        });
      }
      // Draw labels in cropped mode with translated positions
      else if (labels?.length && isCropped) {
        labels.forEach(label => {
          if (!label.text.trim()) return;
          
          // Calculate original position in full canvas
          const originalX = (label.horizontalPosition / 100) * canvasWidth;
          const originalY = (label.verticalPosition / 100) * canvasHeight;
          
          // Check if label is within the video area in the original canvas
          if (originalY >= yOffset && originalY <= (yOffset + targetHeight)) {
            // Calculate the label's position relative to the video
            const relativeY = originalY - yOffset;
            
            // Calculate video top position in cropped canvas
            // Hard-code values to match the calculations done earlier (30px top + text height + 15px gap)
            // Since we can't access those variables directly, recalculate them
            const cropTextTop = 30; // From earlier in the file
            
            // Estimate text height based on caption
            const fontSizeForCaption = textSettings?.size || 78;
            const captionLineHeight = fontSizeForCaption * 1.1;
            const captionLines = wrapText(ctx, caption, canvas.width - 80);
            const captionTextHeight = captionLines.length * captionLineHeight;
            
            // Video starts at: top padding + caption height + gap
            const videoY = cropTextTop + captionTextHeight + 15;
            
            // Translate to new position in cropped canvas
            // New y-position = video's y-position + the label's relative position within video
            const newY = videoY + relativeY;
            
            // Use custom font and size for label, or fall back to defaults
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
          // If label is outside the video area, we don't show it in cropped mode
        });
      }

      resolve(canvas);
    };

    video.onloadeddata = () => {
      video.currentTime = 0.1;
    };

    video.onseeked = () => {
      if (!isGreenscreen || (isGreenscreen && isBackgroundLoaded)) {
        processFrame();
      }
    };

    video.onerror = (e) => {
      reject(e);
    };
  });
}

// Helper function to wrap text
function wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const userLines = text.split('\n');
  const lines: string[] = [];

  userLines.forEach(userLine => {
    if (userLine.trim() === '') {
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