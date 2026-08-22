import React from 'react';
import { Helmet } from 'react-helmet-async';

interface Author {
  name: string;
  url?: string;
}

interface OGImage {
  url: string;
  secure_url?: string;
  type?: string;
  width?: number;
  height?: number;
  alt?: string;
}

interface TwitterMetadata {
  card: 'summary' | 'summary_large_image' | 'player' | 'app';
  site?: string;
  creator?: string;
  title?: string;
  description?: string;
  image?: string;
  image_alt?: string;
}

interface MetaTagsProps {
  title: string;
  description: string;
  keywords?: string[];
  authors?: Author[];
  canonicalUrl?: string;
  ogType?: 'website' | 'article' | 'business.business' | 'profile';
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: OGImage;
  ogUrl?: string;
  twitter?: TwitterMetadata;
  structuredData?: object;
}

const MetaTags: React.FC<MetaTagsProps> = ({
  title,
  description,
  keywords = [],
  authors = [],
  canonicalUrl,
  ogType = 'website',
  ogTitle,
  ogDescription,
  ogImage,
  ogUrl,
  twitter,
  structuredData,
}) => {
  const finalTitle = `${title} | Avante Maps`;
  const finalOgTitle = ogTitle || title;
  const finalOgDescription = ogDescription || description;
  const currentUrl = typeof window !== 'undefined' ? (window.location.href.split('?')[0] ?? '').split('#')[0] ?? '' : '';
  const finalOgUrl = ogUrl || currentUrl;
  const finalCanonical = canonicalUrl || currentUrl;
  
  const defaultTwitter: TwitterMetadata = {
    card: 'summary_large_image',
    site: '@AvanteMap',
    title: finalOgTitle,
    description: finalOgDescription,
    ...twitter,
  };

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{finalTitle}</title>
      <meta name="title" content={finalTitle} />
      <meta name="description" content={description} />
      {keywords.length > 0 && <meta name="keywords" content={keywords.join(', ')} />}
      
      {/* Authors */}
      {authors.map((author, index) => (
        <meta key={index} name="author" content={author.name} />
      ))}
      
      {/* Canonical URL (self-referencing by default) */}
      {finalCanonical && <link rel="canonical" href={finalCanonical} />}
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={finalOgUrl} />
      <meta property="og:title" content={finalOgTitle} />
      <meta property="og:description" content={finalOgDescription} />
      <meta property="og:site_name" content="Avante Maps" />
      
      {/* Open Graph Image */}
      {ogImage && (
        <>
          <meta property="og:image" content={ogImage.url} />
          {ogImage.secure_url && <meta property="og:image:secure_url" content={ogImage.secure_url} />}
          {ogImage.type && <meta property="og:image:type" content={ogImage.type} />}
          {ogImage.width && <meta property="og:image:width" content={ogImage.width.toString()} />}
          {ogImage.height && <meta property="og:image:height" content={ogImage.height.toString()} />}
          {ogImage.alt && <meta property="og:image:alt" content={ogImage.alt} />}
        </>
      )}
      
      {/* Twitter */}
      <meta name="twitter:card" content={defaultTwitter.card} />
      {defaultTwitter.site && <meta name="twitter:site" content={defaultTwitter.site} />}
      {defaultTwitter.creator && <meta name="twitter:creator" content={defaultTwitter.creator} />}
      {defaultTwitter.title && <meta name="twitter:title" content={defaultTwitter.title} />}
      {defaultTwitter.description && <meta name="twitter:description" content={defaultTwitter.description} />}
      {defaultTwitter.image && <meta name="twitter:image" content={defaultTwitter.image} />}
      {defaultTwitter.image_alt && <meta name="twitter:image:alt" content={defaultTwitter.image_alt} />}
      
      {/* Structured Data (JSON-LD) */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
};

export default MetaTags;
