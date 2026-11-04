/**
 * Single content source for the terminal and the semantic fallback HTML.
 *
 * TODO(owner): CONTENT MUST BE CONFIRMED BY THE SITE OWNER.
 * LinkedIn cannot be scraped, so everything below is derived only from the
 * facts in README.md (Notivize, fastapi-filter, FastAPI/asyncio/SQLAlchemy,
 * contact links). No employers, titles or dates have been invented; the
 * experience, skills and headline text is deliberately generic. Replace or
 * extend with verified details before launch.
 */

export interface ExperienceEntry {
  readonly role: string;
  readonly org: string;
  /** Free-form period; left generic until the owner confirms real dates. */
  readonly period: string;
  readonly summary: string;
}

export interface Project {
  readonly name: string;
  readonly url: string;
  readonly description: string;
}

export interface Profile {
  readonly name: string;
  readonly handle: string;
  readonly pronouns: string;
  readonly headline: string;
  readonly currentWork: string;
  readonly learning: readonly string[];
  readonly email: string;
  readonly linkedin: string;
  readonly github: string;
  readonly skills: readonly string[];
  readonly experience: readonly ExperienceEntry[];
  readonly projects: readonly Project[];
}

export const profile: Profile = {
  name: 'Arthur Rio',
  handle: 'arthurio',
  pronouns: 'he/him/his',
  headline: 'Software engineer building notification infrastructure.',
  currentWork: 'Building the best notification as a service platform @Notivize.',
  learning: ['FastAPI', 'asyncio', 'SQLAlchemy'],
  email: 'arthur.rio44@gmail.com',
  linkedin: 'https://www.linkedin.com/in/arthurio/',
  github: 'https://github.com/arthurio',
  skills: ['Python', 'FastAPI', 'asyncio', 'SQLAlchemy', 'Notification systems', 'Open source'],
  experience: [
    {
      role: 'Engineer',
      org: 'Notivize',
      period: 'Present',
      summary: 'Building a notification as a service platform.',
    },
  ],
  projects: [
    {
      name: 'fastapi-filter',
      url: 'https://github.com/arthurio/fastapi-filter',
      description: 'Actively maintained open source filtering library for FastAPI.',
    },
  ],
};
