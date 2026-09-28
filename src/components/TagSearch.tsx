import React, { useState } from 'react';
import { normalizeTag } from '../lib/tags';

/** A '#'-prefixed tag field with an inline submit button. */
export const TagSearch = ({
  onSubmit,
  buttonLabel,
}: {
  onSubmit: (tag: string) => void;
  buttonLabel: string;
}) => {
  const [value, setValue] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const tag = normalizeTag(value);
    if (tag.length < 2) return;
    onSubmit(tag);
    setValue('');
  };

  return (
    <form
      onSubmit={submit}
      className="flex max-w-xl items-stretch border-b-2 border-ink transition-colors focus-within:border-cobalt"
    >
      <span
        aria-hidden
        className="select-none self-center pr-1 font-display text-4xl font-bold text-ink-faint"
      >
        #
      </span>
      <input
        aria-label="Player tag"
        className="min-w-0 flex-1 bg-transparent py-2 font-mono text-2xl uppercase outline-none placeholder:text-ink-faint/70"
        placeholder="2PP0VQ8"
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        value={value}
        onChange={(e) => setValue(e.target.value.replace(/^#/, ''))}
      />
      <button
        type="submit"
        className="my-1.5 bg-ink px-4 font-display text-xl font-bold uppercase text-paper transition-colors hover:bg-cobalt disabled:opacity-40"
        disabled={!value.trim()}
      >
        {buttonLabel}
      </button>
    </form>
  );
};
