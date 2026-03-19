/**
 * Calculate audio amplitude from PCM audio data
 * @param int16Array - Int16Array of PCM audio samples
 * @returns Amplitude value between 0 and 1
 */
export function calculateAmplitude(int16Array: Int16Array): number {
  if (int16Array.length === 0) return 0;

  let sum = 0;
  for (let i = 0; i < int16Array.length; i++) {
    sum += int16Array[i] * int16Array[i];
  }
  
  const rms = Math.sqrt(sum / int16Array.length);
  // Normalize to 0-1 range (32768 is max Int16 value)
  const normalized = Math.min(rms / 32768, 1);
  
  // Apply smoothing to avoid jittery animations
  return normalized;
}

/**
 * Calculate amplitude from base64 PCM audio
 * @param base64Audio - Base64 encoded PCM audio data
 * @returns Amplitude value between 0 and 1
 */
export function calculateAmplitudeFromBase64(base64Audio: string): number {
  try {
    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Convert to Int16Array (assuming 16-bit PCM)
    const int16Array = new Int16Array(bytes.buffer);
    return calculateAmplitude(int16Array);
  } catch (error) {
    console.error('Error calculating amplitude:', error);
    return 0;
  }
}


