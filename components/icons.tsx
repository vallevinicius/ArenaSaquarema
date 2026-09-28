import type { SVGProps } from 'react';

function Icon({ d, ...props }: { d: string } & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" {...props}>
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export const IconBeer = (props: SVGProps<SVGSVGElement>) => <Icon d="M8 2h8l-1 7a3 3 0 01-6 0zM12 12v8M8 22h8" {...props} />;

export const IconSun = (props: SVGProps<SVGSVGElement>) => (
  <Icon
    d="M12 3v2M12 19v2M5 12H3M21 12h-2M6 6l1.5 1.5M16.5 16.5L18 18M6 18l1.5-1.5M16.5 7.5L18 6M12 8a4 4 0 100 8 4 4 0 000-8z"
    {...props}
  />
);

export const IconCheck = (props: SVGProps<SVGSVGElement>) => <Icon d="M5 13l4 4L19 7" {...props} />;

export const IconWarning = (props: SVGProps<SVGSVGElement>) => (
  <Icon d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" {...props} />
);

export const IconClose = (props: SVGProps<SVGSVGElement>) => <Icon d="M6 6l12 12M18 6L6 18" {...props} />;
