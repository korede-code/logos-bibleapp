// src/components/VerseImageCreator.tsx
import React, { useState, useRef, useEffect } from 'react';
import { X, Share2, Download, RefreshCw, Palette } from 'lucide-react';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';


interface VerseImageCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  verse: {
    reference: string;
    text: string;
  };
  theme: any;
}

const BACKGROUNDS = [
  { name: 'Sunrise', colors: ['#FF6B35', '#F7C948', '#FF8C42'] },
  { name: 'Ocean', colors: ['#1a3a5c', '#2d6a9f', '#4a90d9'] },
  { name: 'Forest', colors: ['#1a3a1a', '#2d5a2d', '#4a7a4a'] },
  { name: 'Sunset', colors: ['#8B3A62', '#C44D7A', '#E884A6'] },
  { name: 'Royal', colors: ['#1a1a2e', '#2d2d5e', '#4a4a8a'] },
  { name: 'Warm', colors: ['#7B4F2E', '#A0522D', '#C47A3A'] },
];

const FONTS = [
  { name: 'Serif', family: 'Georgia, serif' },
  { name: 'Sans', family: 'Arial, sans-serif' },
  { name: 'Script', family: "'Crimson Pro', Georgia, serif" },
];

const VerseImageCreator: React.FC<VerseImageCreatorProps> = ({ isOpen, onClose, verse, theme }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bgIndex, setBgIndex] = useState(0);
  const [fontIndex, setFontIndex] = useState(0);
  const [size, setSize] = useState(40);

  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure canvas is rendered
      setTimeout(() => drawImage(), 100);
    }
  }, [isOpen, bgIndex, fontIndex, size]);

  const drawImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = 1080, h = 1920;
    canvas.width = w;
    canvas.height = h;

    const bg = BACKGROUNDS[bgIndex];
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, bg.colors[0]);
    grad.addColorStop(0.5, bg.colors[1]);
    grad.addColorStop(1, bg.colors[2]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Cross decoration
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.font = '200px serif';
    ctx.fillText('✝', w / 2 - 100, 400);

    // Text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `${size}px ${FONTS[fontIndex].family}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const words = (verse.text || 'Select a verse').split(' ');
    const lines: string[] = [];
    let line = '';
    const maxW = w - 200;

    words.forEach(word => {
      const test = line + (line ? ' ' : '') + word;
      if (ctx.measureText(test).width > maxW && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    });
    if (line) lines.push(line);

    const startY = h / 2 - (lines.length * (size + 12)) / 2;
    lines.forEach((l, i) => ctx.fillText(l, w / 2, startY + i * (size + 12)));

    // Reference
    ctx.font = `${size * 0.55}px ${FONTS[fontIndex].family}`;
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillText(`— ${verse.reference || ''}`, w / 2, startY + lines.length * (size + 12) + 50);

    // Brand
    ctx.font = '24px Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillText('Synthesis Bible', w / 2, h - 60);
  };

  const download = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    try {
      // Convert canvas to blob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/png');
      });
      
      if (!blob) {
        alert('Could not create image');
        return;
      }
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `logos-verse-${Date.now()}.png`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
      
      console.log('✅ Image downloaded');
    } catch (e) {
      console.error('Download failed:', e);
      alert('Download failed. Please try again.');
    }
  };

  const shareVerseImage = async () => {
    try {
      console.log("Platform URL:", window.location.href);
      const canvas = canvasRef.current;
      if (!canvas) return;

      const dataUrl = canvas.toDataURL('image/png');

      const base64Data = dataUrl.replace(
        'data:image/png;base64,',
        ''
      );

      const fileName = `verse-${Date.now()}.png`;

      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache
      });

      console.log("Saved:", savedFile.uri);

      await Share.share({

        url: savedFile.uri,
        dialogTitle: 'Share Verse Image'
        //title: verse.reference || 'Bible Verse',
        //text: verse.text,
        //url: savedFile.uri
      });

    } catch (error) {
      console.error("Share error:", error);
      alert("Share failed: " + JSON.stringify(error));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: 'rgba(0,0,0,0.95)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <h3 className="text-white font-bold text-sm">Verse Image</h3>
        <button onClick={onClose} className="text-white p-2">
          <X size={20} />
        </button>
      </div>

      {/* Canvas Preview - Scrollable on mobile */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-2">
        <canvas
          ref={canvasRef}
          className="rounded-xl shadow-2xl"
          style={{ width: 'auto', maxWidth: '100%', maxHeight: '70vh', height: 'auto' }}
        />
      </div>

      {/* Controls - Fixed at bottom */}
      <div className="flex-shrink-0 px-3 py-2 space-y-2" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
        {/* Backgrounds */}
        <div className="flex gap-1.5 justify-center overflow-x-auto py-1">
          {BACKGROUNDS.map((bg, i) => (
            <button
              key={i}
              onClick={() => setBgIndex(i)}
              className="w-7 h-7 rounded-lg flex-shrink-0 border-2 transition-all"
              style={{
                background: `linear-gradient(135deg, ${bg.colors[0]}, ${bg.colors[2]})`,
                borderColor: bgIndex === i ? 'white' : 'transparent',
                transform: bgIndex === i ? 'scale(1.15)' : 'scale(1)',
              }}
            />
          ))}
        </div>

        {/* Fonts + Size */}
        <div className="flex items-center gap-2 justify-center flex-wrap">
          {FONTS.map((f, i) => (
            <button
              key={i}
              onClick={() => setFontIndex(i)}
              className="px-2 py-1 rounded text-xs"
              style={{
                backgroundColor: fontIndex === i ? 'white' : 'rgba(255,255,255,0.2)',
                color: fontIndex === i ? '#000' : '#fff',
                fontFamily: f.family,
              }}
            >
              {f.name}
            </button>
          ))}
          <input
            type="range"
            min="24"
            max="60"
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="w-20"
            style={{ accentColor: 'white' }}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const canvas = canvasRef.current;
              if (!canvas) return;
              
              try {
                canvas.toBlob((blob) => {
                  if (!blob) return;
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `synthesis-verse-${Date.now()}.png`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  URL.revokeObjectURL(url);
                  alert('✅ Image saved to your device!');
                }, 'image/png');
              } catch (e) {
                alert('Save failed. Please try again.');
              }
            }}
            className="flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 text-white" 
            style={{ backgroundColor: 'rgba(255,255,255,0.2)', minHeight: '48px', cursor: 'pointer' }}
          >
            <Download size={20} /> Save
          </button>
          <button
            onClick={shareVerseImage}
            className="flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5"
            style={{
              backgroundColor: '#4CAF50',
              color: 'white',
              minHeight: '48px'
            }}
          >
            <Share2 size={20} /> Share
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerseImageCreator;