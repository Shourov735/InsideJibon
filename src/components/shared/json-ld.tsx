interface JsonLdProps {
  data: Record<string, unknown>;
}

/**
 * Server component that renders structured data (JSON-LD) for search engine crawlers.
 */
export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
