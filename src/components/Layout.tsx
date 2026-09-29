import React from 'react';

export const Section = ({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <section className="mt-14">
    <div className="mb-5 flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b-2 border-ink pb-2">
      <h2 className="font-display text-3xl font-extrabold uppercase leading-none">
        {title}
      </h2>
      {aside && <div className="ml-auto text-sm text-ink-soft">{aside}</div>}
    </div>
    {children}
  </section>
);

/** A box-score strip: hairline-divided cells between two heavy rules. */
export const StatGrid = ({ children }: { children: React.ReactNode }) => (
  <dl className="grid grid-cols-2 gap-px border-y-2 border-ink bg-rule sm:grid-cols-3 lg:grid-cols-6">
    {children}
  </dl>
);

export const Stat = ({
  label,
  value,
  note,
}: {
  label: string;
  value: React.ReactNode;
  note?: React.ReactNode;
}) => (
  <div className="bg-paper px-3 pb-3 pt-3.5 sm:px-4">
    <dt className="label">{label}</dt>
    <dd
      className={`mt-2 whitespace-nowrap font-display font-extrabold leading-none ${
        // Long values like an all-time "164–160–7" record step down a size.
        String(value).length > 7 ? 'text-3xl' : 'text-4xl'
      }`}
    >
      {value}
    </dd>
    {note && <dd className="mt-1.5 text-[13px] text-ink-soft">{note}</dd>}
  </div>
);

export const Loading = ({ label }: { label: string }) => (
  <p className="mt-16 animate-pulse font-display text-2xl font-bold uppercase text-ink-faint motion-reduce:animate-none">
    {label}
  </p>
);

export const ErrorNote = ({
  title,
  message,
}: {
  title: string;
  message: string;
}) => (
  <div role="alert" className="mt-10 border-l-4 border-vermilion py-1 pl-4">
    <p className="font-display text-2xl font-bold uppercase">{title}</p>
    <p className="mt-1 text-ink-soft">{message}</p>
  </div>
);
