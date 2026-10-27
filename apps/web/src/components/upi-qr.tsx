"use client";

import { useEffect, useState } from "react";

/**
 * UPI QR — browser me hi banta hai (koi API nahi), isliye GitHub Pages par bhi chalta hai.
 * `qrcode` sirf tab load hota hai jab QR dikhna hota hai (bundle chhota rehta hai).
 */
export function UpiQr({
  uri,
  alt,
  className = "",
  size = 320,
}: {
  uri: string;
  alt: string;
  className?: string;
  size?: number;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setSrc(null);
    import("qrcode")
      .then((mod) =>
        (mod.default ?? mod).toDataURL(uri, {
          margin: 1,
          width: size,
          errorCorrectionLevel: "M",
          color: { dark: "#862222", light: "#ffffff" },
        }),
      )
      .then((url: string) => {
        if (active) setSrc(url);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [uri, size]);

  if (!src) {
    return (
      <div className={`flex items-center justify-center text-[10px] text-[#a49a90] ${className}`}>
        Loading QR…
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} />
  );
}
