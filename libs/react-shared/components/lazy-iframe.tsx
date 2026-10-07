"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

interface LazyIframeLabels {
  waiting: string;
  loading: string;
  slow: string;
  help: string;
  retry: string;
  dismiss: string;
  open: string;
  noScript: string;
}

interface LazyIframeProps {
  src: string;
  title: string;
  labels: LazyIframeLabels;
  className: string;
  testId: string;
  /** A core workspace already in the first viewport can render before hydration. */
  loadImmediately?: boolean;
  children?: ReactNode;
  onLoad?: () => void;
}

/** Keep the footprint stable; only mount the remote document near the viewport. */
export function LazyIframe(props: LazyIframeProps) {
  // A source change starts a new lifecycle, including observer, timer, and retries.
  return <LazyIframeSession key={props.src} {...props} />;
}

function LazyIframeSession({ src, title, labels, className, testId, loadImmediately = false, children, onLoad }: LazyIframeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isNearViewport, setIsNearViewport] = useState(loadImmediately);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isSlow, setIsSlow] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [isHelpDismissed, setIsHelpDismissed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (loadImmediately) {
      setIsNearViewport(true);
      return;
    }
    const container = containerRef.current;
    if (!container) return;
    if (!("IntersectionObserver" in window)) {
      setIsNearViewport(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsNearViewport(true);
        observer.disconnect();
      }
    }, { rootMargin: "200px" });
    observer.observe(container);
    return () => observer.disconnect();
  }, [loadImmediately]);

  useEffect(() => {
    // An SSR frame may finish before hydration attaches onLoad. Only time a
    // client-observed retry for that path, rather than reporting a false delay.
    if (!isNearViewport || hasLoaded || (loadImmediately && attempt === 0)) return;
    const timer = window.setTimeout(() => setIsSlow(true), 30_000);
    return () => window.clearTimeout(timer);
  }, [isNearViewport, hasLoaded, attempt, loadImmediately]);

  const reload = () => {
    setHasLoaded(false);
    setIsSlow(false);
    setShowHelp(false);
    setIsHelpDismissed(false);
    setAttempt((value) => value + 1);
  };

  return (
    <div ref={containerRef} data-testid={`${testId}-container`} className={`relative ${className}`}>
      {isNearViewport ? (
        <iframe
          key={attempt}
          data-testid={testId}
          title={title}
          src={src}
          loading="lazy"
          className="h-full w-full border-0 bg-[#0b0f1a]"
          allow="clipboard-read; clipboard-write"
          sandbox="allow-downloads allow-forms allow-modals allow-popups allow-same-origin allow-scripts"
          referrerPolicy="no-referrer"
          onLoad={() => {
            // Browsers also emit load for error documents. This is not a health check.
            setHasLoaded(true);
            setIsSlow(false);
            setShowHelp(false);
            onLoad?.();
          }}
        />
      ) : null}
      {!loadImmediately && !hasLoaded && !isSlow ? (
        <div data-testid={`${testId}-placeholder`} className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#0b0f1a] px-6 text-center text-sm text-[#aeb6ca]" role="status">
          <span aria-hidden="true" className="h-8 w-8 animate-pulse rounded-full border-2 border-[#48bdff]/40 motion-reduce:animate-none" />
          <p>{isNearViewport ? labels.loading : labels.waiting}</p>
        </div>
      ) : null}
      {isNearViewport ? (
        <div className="absolute bottom-3 right-3 z-10 max-w-sm rounded-lg border border-[#25314f] bg-[#071431]/95 p-2 text-xs text-[#aeb6ca]">
          {(isSlow && !isHelpDismissed) || showHelp ? (
            <div data-testid={`${testId}-help`}>
              <p className="mb-2 leading-5" role="status">{labels.slow}</p>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={reload} className="rounded px-2 py-1 text-[#9bffe1] hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#48bdff]">{labels.retry}</button>
                <a href={src} target="_blank" rel="noreferrer noopener" className="rounded px-2 py-1 text-[#9bffe1] hover:bg-white/10">{labels.open}</a>
                <button type="button" onClick={() => { setShowHelp(false); setIsHelpDismissed(true); }} className="rounded px-2 py-1 hover:text-white">{labels.dismiss}</button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setShowHelp(true)} className="rounded px-2 py-1 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#48bdff]">{labels.help}</button>
          )}
        </div>
      ) : null}
      <noscript>
        <p className="absolute inset-x-0 top-1/2 px-6 text-center text-sm text-[#aeb6ca]">
          {labels.noScript} <a href={src} target="_blank" rel="noreferrer noopener" className="underline">{labels.open}</a>
        </p>
      </noscript>
      {children}
    </div>
  );
}
