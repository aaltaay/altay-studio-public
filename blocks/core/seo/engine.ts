// blocks/seo/engine.ts
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase'; // Assumes @altaystudio/core or similar provides this

export interface SEOData {
  meta_title: string;
  meta_description: string;
  keywords?: string[];
  og_image_url?: string;
  structured_data?: Record<string, any>; // JSON-LD
}

export function useDynamicSEO(route: string, defaultData: SEOData) {
  const [seoData, setSeoData] = useState<SEOData>(defaultData);
  const [loading, setLoading] = useState(true);

  // Fetch SEO overrides from the database
  useEffect(() => {
    async function fetchSEO() {
      try {
        const { data, error } = await supabase
          .from('seo_settings')
          .select('*')
          .eq('page_route', route)
          .single();

        if (data && !error) {
          setSeoData({
            meta_title: data.meta_title,
            meta_description: data.meta_description,
            keywords: data.keywords,
            og_image_url: data.og_image_url,
            structured_data: data.structured_data,
          });
        }
      } catch (err) {
        console.error('Failed to fetch dynamic SEO:', err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchSEO();
  }, [route]);

  // Inject Meta Tags and JSON-LD
  useEffect(() => {
    // Title
    document.title = seoData.meta_title;

    // Description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', seoData.meta_description);

    // OpenGraph Image
    if (seoData.og_image_url) {
      let ogImage = document.querySelector('meta[property="og:image"]');
      if (!ogImage) {
        ogImage = document.createElement('meta');
        ogImage.setAttribute('property', 'og:image');
        document.head.appendChild(ogImage);
      }
      ogImage.setAttribute('content', seoData.og_image_url);
    }

    // JSON-LD Structured Data
    if (seoData.structured_data) {
      const scriptId = 'schema-org-jsonld';
      let scriptTag = document.getElementById(scriptId) as HTMLScriptElement;
      if (!scriptTag) {
        scriptTag = document.createElement('script');
        scriptTag.id = scriptId;
        scriptTag.type = 'application/ld+json';
        document.head.appendChild(scriptTag);
      }
      scriptTag.textContent = JSON.stringify(seoData.structured_data);
    }

    // Cleanup not strictly necessary for single page apps if overwriting, 
    // but good practice if routes change frequently
    return () => {
      // Depending on architecture, you might want to remove specific tags on unmount.
    };
  }, [seoData]);

  return { seoData, loading };
}
