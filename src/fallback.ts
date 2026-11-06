/** Populate the visually-hidden semantic fallback from profile.ts (single content source). */

import type { Profile } from './data/profile';

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  return node;
}

function linkItem(label: string, href: string): HTMLLIElement {
  const li = el('li');
  const a = el('a', label);
  a.href = href;
  a.rel = 'noopener noreferrer';
  li.appendChild(a);
  return li;
}

export function renderFallback(root: HTMLElement, profile: Profile): void {
  const nodes: HTMLElement[] = [];
  nodes.push(el('h1', `${profile.name} (${profile.handle})`));
  nodes.push(el('p', `Pronouns: ${profile.pronouns}`));
  nodes.push(el('p', `${profile.headline} ${profile.currentWork}`));
  nodes.push(el('p', `Currently learning: ${profile.learning.join(', ')}.`));

  nodes.push(el('h2', 'Experience'));
  const exp = el('ul');
  for (const e of profile.experience) {
    exp.appendChild(el('li', `${e.role} at ${e.org} (${e.period}): ${e.summary}`));
  }
  nodes.push(exp);

  nodes.push(el('h2', 'Skills'));
  const skills = el('ul');
  for (const s of profile.skills) skills.appendChild(el('li', s));
  nodes.push(skills);

  nodes.push(el('h2', 'Projects'));
  const projects = el('ul');
  for (const p of profile.projects) projects.appendChild(linkItem(p.name, p.url));
  nodes.push(projects);

  nodes.push(el('h2', 'Contact'));
  const contact = el('ul');
  contact.appendChild(linkItem(profile.email, `mailto:${profile.email}`));
  contact.appendChild(linkItem('LinkedIn', profile.linkedin));
  contact.appendChild(linkItem('GitHub', profile.github));
  nodes.push(contact);

  root.replaceChildren(...nodes);
}
