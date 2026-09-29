import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Trophy } from 'lucide-react';
import { fetchPlayer } from '../lib/api';
import { formatNumber } from '../lib/format';
import { parseDefaultTags, tagToSlug } from '../lib/tags';
import { useAsync } from '../lib/useAsync';
import { Section, TagSearch } from '../components';

const LookupPage: React.FC = () => {
  const navigate = useNavigate();
  const myTags = parseDefaultTags();

  return (
    <>
      <section className="pt-14 sm:pt-24">
        <h1 className="font-display text-7xl font-black uppercase leading-[0.82] sm:text-9xl">
          Read the
          <br />
          battle log.
        </h1>
        <p className="mb-10 mt-5 max-w-md text-ink-soft">
          Enter a player tag to see their profile, recent form, the decks they
          play and the cards that keep beating them.
        </p>
        <TagSearch
          buttonLabel="Scout"
          onSubmit={(tag) => navigate(`/player/${tagToSlug(tag)}`)}
        />
      </section>

      {myTags.length > 0 && (
        <Section title="Your accounts">
          <ul>
            {myTags.map((tag) => (
              <AccountRow key={tag} tag={tag} />
            ))}
          </ul>
        </Section>
      )}
    </>
  );
};

const AccountRow = ({ tag }: { tag: string }) => {
  const player = useAsync(() => fetchPlayer(tag), tag);
  const p = player.status === 'done' ? player.data : null;

  return (
    <li className="border-b border-rule">
      <Link
        to={`/player/${tagToSlug(tag)}`}
        className="group flex items-center gap-4 py-3 hover:bg-sheet"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-2xl font-bold uppercase leading-tight">
            {p?.name ?? tag}
          </span>
          <span className="block truncate text-[13px] text-ink-soft">
            <span className="font-mono">{tag}</span>
            {p?.clan && ` · ${p.clan.name}`}
            {player.status === 'error' && ` · ${player.error}`}
          </span>
        </span>
        {p && (
          <span className="flex items-center gap-1.5 font-display text-2xl font-bold leading-none">
            <Trophy aria-label="Trophies" className="h-4 w-4 text-gold" />
            {formatNumber(p.trophies)}
          </span>
        )}
        <ArrowRight
          aria-hidden
          className="h-5 w-5 text-ink-faint transition-transform group-hover:translate-x-1 group-hover:text-ink"
        />
      </Link>
    </li>
  );
};

export { LookupPage };
