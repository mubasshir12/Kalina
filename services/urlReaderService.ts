import { getAiClient } from "./aiClient";
import { Type } from "@google/genai";

// TypeScript declaration for the Readability class loaded from the script tag in index.html
declare var Readability: any;

export const fetchAndParseUrlContent = async (url: string): Promise<string> => {
    try {
      // Switched to a different CORS proxy as the previous one might be unreliable.
      // This proxy returns the raw HTML content directly for success, and JSON for errors.
      const response = await fetch(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`);

      if (!response.ok) {
        let errorMessage = `Failed to fetch from proxy with status: ${response.status}`;
        try {
          // The proxy often returns a JSON object with a specific error message.
          const errorData = await response.json();
          if (errorData && errorData.error) {
            errorMessage = `Proxy error: ${errorData.error}`;
          }
        } catch (e) {
          // If parsing the error JSON fails, stick with the original status message.
        }
        throw new Error(errorMessage);
      }

      const htmlContent = await response.text();
      if (!htmlContent) {
        throw new Error("Proxy response was empty.");
      }

      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      
      // Clone the document because Readability mutates it
      const docClone = doc.cloneNode(true) as Document;
      
      // Provide a base URL to help Readability resolve relative links
      const base = docClone.createElement('base');
      base.setAttribute('href', url);
      docClone.head.appendChild(base);

      const reader = new Readability(docClone);
      const article = reader.parse();

      if (!article || !article.textContent) {
        // Fallback: if Readability fails, return the body's text content. 
        // This is still far better than sending the raw HTML.
        const bodyText = doc.body?.textContent?.trim().replace(/\s+/g, ' ');
        if (bodyText && bodyText.length > 100) { // Only return if it seems to have substantial content
            return bodyText;
        }
        throw new Error("Readability could not extract meaningful content from the page.");
      }

      // Return the title and the core text content for the AI to analyze.
      return `Title: ${article.title}\n\n${article.textContent.trim().replace(/\s+/g, ' ')}`;

    } catch (error) {
        console.error("Error in fetchAndParseUrlContent:", error);

        // If the fetch call itself fails (e.g., network error, DNS failure, or the proxy is down),
        // it will throw a TypeError with the message "Failed to fetch". We provide a more user-friendly message for this case.
        if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
             throw new Error("Could not retrieve content from the URL. This may be due to a network issue or the proxy service being temporarily unavailable.");
        }
        
        // For other errors (like the proxy returning an error status or Readability failing), re-throw a comprehensive message.
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Could not parse content from the URL. The page might be a web app, a PDF, or protected. (Details: ${errorMessage})`);
    }
};
