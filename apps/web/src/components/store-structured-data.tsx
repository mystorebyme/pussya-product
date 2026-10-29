"use client";

import { useStoreSettings } from "@/components/store-settings-provider";
import { siteConfig } from "@/config/site";

/**
 * Organization JSON-LD jo **owner ki settings** (Google Sheet / admin) se banta
 * hai. Sheet me number/email badla to structured data bhi turant badal jaata hai
 * — pehle yahan hard-coded number tha, isliye Google par purana number reh jaata
 * tha jabki site par naya dikhta tha.
 */
export function StoreStructuredData() {
  const settings = useStoreSettings();
  const phone = settings.supportPhone.replace(/\D/g, "");
  /**
   * Sirf contact details — `@id` same hai, isliye Google ise static Organization
   * node ke saath merge kar leta hai (naam/url/logo wahan se aate hain).
   */
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteConfig.url}#org`,
    ...(phone ? { telephone: `+91${phone.slice(-10)}` } : {}),
    ...(phone
      ? {
          contactPoint: [
            {
              "@type": "ContactPoint",
              telephone: `+91${phone.slice(-10)}`,
              contactType: "customer support",
              areaServed: "IN",
              availableLanguage: ["en", "hi"],
            },
          ],
        }
      : {}),
    sameAs: [siteConfig.socials.instagram],
  };
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
