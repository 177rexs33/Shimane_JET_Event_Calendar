import React from 'react';

const URL_REGEX = /(https?:\/\/[^\s<]+|(?:www\.)[^\s<]+|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/[^\s<]*)?)/gi;

interface EventDescriptionProps {
  text: string;
  className?: string;
}

export const EventDescription: React.FC<EventDescriptionProps> = ({ text, className = '' }) => {
  if (!text) return null;

  const parts = text.split(URL_REGEX);

  return (
    <div className={`whitespace-pre-wrap leading-relaxed ${className}`}>
      {parts.map((part, i) => {
        if (!part) return null;

        // Check if part matches the regex to be processed as a URL
        // (Even indices in split with a single capturing group are non-matches, odd indices are matches)
        if (i % 2 === 1) {
          let href = part;
          let plainTextPart = part;
          let trailingPunctuation = '';

          // Remove trailing punctuation that might be caught accidentally by the regex
          const trailingMatch = href.match(/[.,;:!?)]+$/);
          if (trailingMatch) {
            trailingPunctuation = trailingMatch[0];
            href = href.slice(0, -trailingPunctuation.length);
            plainTextPart = plainTextPart.slice(0, -trailingPunctuation.length);
          }

          if (href.toLowerCase().startsWith('javascript:')) {
            // Render javascript: links as plain text (ignored securely)
            return <span key={i}>{part}</span>;
          }

          if (!href.toLowerCase().startsWith('http://') && !href.toLowerCase().startsWith('https://')) {
            href = 'https://' + href;
          }

          let isYouTube = false;
          let youtubeId = '';
          let isGoogleMaps = false;

          try {
            const urlObj = new URL(href);
            
            // Check YouTube
            if (urlObj.hostname.includes('youtube.com') && urlObj.searchParams.has('v')) {
              isYouTube = true;
              youtubeId = urlObj.searchParams.get('v') || '';
            } else if (urlObj.hostname === 'youtu.be' || urlObj.hostname === 'www.youtu.be') {
              isYouTube = true;
              youtubeId = urlObj.pathname.slice(1);
            }

            // Check Google Maps
            if (urlObj.hostname.includes('google.com') && urlObj.pathname.startsWith('/maps')) {
              isGoogleMaps = true;
              // Try to safely embed google maps
              if (!urlObj.searchParams.has('output')) {
                urlObj.searchParams.set('output', 'embed');
              }
              href = urlObj.toString();
            }

            if (isYouTube && youtubeId) {
              return (
                <React.Fragment key={i}>
                  <div className="my-3 w-full max-w-2xl rounded-lg overflow-hidden relative" style={{ paddingBottom: '56.25%', height: 0 }}>
                    <iframe 
                      className="absolute top-0 left-0 w-full h-full border-0"
                      src={`https://www.youtube.com/embed/${youtubeId}`} 
                      title="YouTube video player" 
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                      allowFullScreen
                    ></iframe>
                  </div>
                  {trailingPunctuation && <span>{trailingPunctuation}</span>}
                </React.Fragment>
              );
            }

            if (isGoogleMaps) {
              return (
                <React.Fragment key={i}>
                  <div className="my-3 w-full max-w-2xl h-64 rounded-lg overflow-hidden relative">
                    <iframe 
                      className="absolute top-0 left-0 w-full h-full border-0"
                      src={href} 
                      title="Google Maps"
                      loading="lazy"
                      allowFullScreen
                    ></iframe>
                  </div>
                  {trailingPunctuation && <span>{trailingPunctuation}</span>}
                </React.Fragment>
              );
            }

          } catch (e) {
            // Invalid URL object creation, fallback to standard link or text
          }

          return (
            <React.Fragment key={i}>
              <a 
                href={href} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-blue-600 hover:text-blue-800 underline break-all"
              >
                {plainTextPart}
              </a>
              {trailingPunctuation && <span>{trailingPunctuation}</span>}
            </React.Fragment>
          );
        }

        // Standard text, no match
        return <span key={i}>{part}</span>;
      })}
    </div>
  );
}
